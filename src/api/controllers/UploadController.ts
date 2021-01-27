import {Authorized, JsonController, Post, Req, Res, UploadedFiles, UploadOptions} from 'routing-controllers';
import {OpenAPI, ResponseSchema} from 'routing-controllers-openapi';
import {FileFilterCallback, memoryStorage} from 'multer';
import {StringStream} from 'scramjet';
import {LecternService} from '../services/LecternService';
import {Logger, LoggerInterface} from '../../decorators/Logger';
import {UploadReport} from './responses/UploadReport';
import {SingleFileUploadStatus} from './responses/SingleFileUploadStatus';
import {env} from '../../env';
import {BatchProcessingResult} from '@overturebio-stack/lectern-client/lib/schema-entities';
import {RecordValidationError} from './responses/RecordValidationError';

@Authorized()
@JsonController('/upload')
@OpenAPI({ security: [{ cqdgAuth: [] }] })
export class UploadController {

    private static uploadOptions: UploadOptions = {
        required: true,
        options : {
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

    constructor(
        private lecternService: LecternService,
        @Logger(__filename) private log: LoggerInterface
    ) { }

    @Post()
    @ResponseSchema(UploadReport)
    public async upload(@UploadedFiles('files', UploadController.uploadOptions) files: Express.Multer.File[],
                        @Req() request: any,
                        @Res() response: any): Promise<UploadReport> {

        const report = new UploadReport();
        report.files = [];
        let currentFileSchema;

        let lang = request.acceptsLanguages('fr', 'en').toUpperCase();
        lang = (env.lectern.dictionaryDefaultLanguage === lang) ? '' : lang;

        const name = `${env.lectern.dictionaryName} ${lang}`.trim();
        const schemas = await this.lecternService.fetchLatestDictionary(name);

        let hasErrors = false;

        for (const f of files) {
            this.log.debug(`Validating ${f.originalname}`);

            const singleFileUploadStatus: SingleFileUploadStatus = new SingleFileUploadStatus();
            singleFileUploadStatus.filename = f.originalname;
            singleFileUploadStatus.validationErrors = [];

            currentFileSchema = await this.selectSchema(f.originalname);

            await StringStream.from(f.buffer.toString('utf-8'), {maxParallel: 2})
                .CSVParse({
                    delimiter: '\t',
                    header: true,
                    skipEmptyLines: true,
                    worker: true,
                    /*step: function(results) {
                        console.log('Row:', results.data);
                    }*/
                })
                .batch(25)
                .each(async (results: any[]) => {
                    const batch: BatchProcessingResult = await this.lecternService.validateRecords(currentFileSchema, results, schemas);

                    if (batch.validationErrors && batch.validationErrors.length > 0) {
                        hasErrors = true;

                        singleFileUploadStatus.validationErrors.push(
                            batch.validationErrors.map(err => new RecordValidationError(err))
                        );
                    }
                })
                .run();

            report.files.push(singleFileUploadStatus);
        }

        this.log.debug(JSON.stringify(report));

        if (hasErrors) {
            response.status(400);
        }
        return report;
    }

    private async selectSchema(filename: string): Promise<string> {
        // TODO: Determine what is the logic to select the proper schema for the file that is uploaded.
        // Filename = schema name?
        // Column matching algorithm?
        return filename.substring(0, filename.indexOf('.'));
    }
}
