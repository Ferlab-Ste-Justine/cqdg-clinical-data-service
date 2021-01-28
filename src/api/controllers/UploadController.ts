import { Authorized, JsonController, Post, Req, Res, UploadedFiles, UploadOptions } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';
import { FileFilterCallback, memoryStorage } from 'multer';
import { StringStream } from 'scramjet';
import { LecternService } from '../services/LecternService';
import { Logger, LoggerInterface } from '../../decorators/Logger';
import { UploadReport } from './responses/UploadReport';
import { SingleFileUploadStatus } from './responses/SingleFileUploadStatus';
import { env } from '../../env';
import { BatchProcessingResult } from '@overturebio-stack/lectern-client/lib/schema-entities';
import { RecordValidationError } from './responses/RecordValidationError';
import { entities as dictionaryEntities } from '@overturebio-stack/lectern-client';

@Authorized()
@JsonController('/upload')
@OpenAPI({})
// @OpenAPI({ security: [{ cqdgAuth: [] }] })
export class UploadController {
    private static uploadOptions: UploadOptions = {
        required: true,
        options: {
            storage: memoryStorage(),
            fileFilter: (req: Request, file: Express.Multer.File, acceptFile: FileFilterCallback) => {
                acceptFile(undefined, env.fileUpload.allowedMimeTypes.includes(file.mimetype));
            },
            limits: {
                fileSize: 1024 * 1024 * env.fileUpload.maxSize, // 50MB max file size
                files: env.fileUpload.maxNumberOfFiles, // max of eleven files at a time (1 sample registration + 11 clinical data)
            },
        },
    };

    constructor(private lecternService: LecternService, @Logger(__filename) private log: LoggerInterface) {}

    @Post()
    @OpenAPI({
        consumes: 'multipart/form-data',
        requestBody: {
            description: 'A single file or a list of files respecting the dictionary model for the clinical data.',
            content: {
                'multipart/form-data': {
                    schema: {
                        type: 'object',
                        properties: {
                            files: {
                                type: 'array',
                                items: {
                                    type: 'string',
                                    format: 'binary',
                                },
                            },
                        },
                    },
                },
            },
            required: true,
        },
    })
    @ResponseSchema(UploadReport)
    public async upload(
        @UploadedFiles('files', UploadController.uploadOptions) files: Express.Multer.File[],
        @Req() request: any,
        @Res() response: any
    ): Promise<UploadReport> {
        const report = new UploadReport();
        report.files = [];

        let lang = request.acceptsLanguages('fr', 'en').toUpperCase();
        lang = env.lectern.dictionaryDefaultLanguage === lang ? '' : lang;

        const name = `${env.lectern.dictionaryName} ${lang}`.trim();
        const schemas = await this.lecternService.fetchLatestDictionary(name);

        let hasErrors = false;

        for (const f of files) {
            this.log.debug(`Validating ${f.originalname}`);
            const singleFileUploadStatus: SingleFileUploadStatus = await this.validateFile(f, schemas);

            // TODO: if file is sample registration and has no errors, load in DB for lookup validation +
            // upload file to S3 bucket.

            hasErrors =
                singleFileUploadStatus &&
                singleFileUploadStatus.validationErrors &&
                singleFileUploadStatus.validationErrors.length > 0;

            report.files.push(singleFileUploadStatus);
        }

        this.log.debug(JSON.stringify(report));

        if (hasErrors) {
            response.status(400);
        }
        return report;
    }

    private async validateFile(
        file: Express.Multer.File,
        schemas: dictionaryEntities.SchemasDictionary
    ): Promise<SingleFileUploadStatus> {
        const singleFileUploadStatus: SingleFileUploadStatus = new SingleFileUploadStatus();
        singleFileUploadStatus.filename = file.originalname;
        singleFileUploadStatus.validationErrors = [];

        const schemaForCurrentFile = await this.selectSchema(file.originalname);

        await StringStream.from(file.buffer.toString('utf-8'), { maxParallel: 2 })
            .CSVParse({
                delimiter: '\t',
                header: true,
                skipEmptyLines: true,
                worker: true,
                /*step: function(results) {
                    console.log('Row:', results.data);
                }*/
            })
            .batch(500)
            .each(async (results: any[]) => {
                const batch: BatchProcessingResult = await this.lecternService.validateRecords(
                    schemaForCurrentFile,
                    results,
                    schemas
                );

                if (batch.validationErrors && batch.validationErrors.length > 0) {
                    singleFileUploadStatus.validationErrors.push(
                        batch.validationErrors.map((err) => new RecordValidationError(err))
                    );
                }
            })
            .run();

        return singleFileUploadStatus;
    }

    // TODO: Get list of available schemas and compare with file names
    // TODO: filename : for comparison, remove extension, special char, toLowerCase, and compare with schemas
    private async selectSchema(filename: string): Promise<string> {
        // TODO: Determine what is the logic to select the proper schema for the file that is uploaded.
        // Filename = schema name?
        // Column matching algorithm?

        // TODO: Handle the version in the filename
        return filename.substring(0, filename.indexOf('.'));
    }
}
