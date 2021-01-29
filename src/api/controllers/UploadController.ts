import {
    Authorized,
    CurrentUser,
    HttpError,
    JsonController,
    Param,
    Post,
    Req,
    Res,
    UploadedFile,
    UploadedFiles,
    UploadOptions,
} from 'routing-controllers';
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
import { DataSubmission } from '../models/DataSubmission';
import { Status, User } from '../models/ReferentialData';
import { SampleRegistration } from '../models/SampleRegistration';
import { DataSubmissionService } from '../services/DataSubmissionService';
import { SampleRegistrationService } from '../services/SampleRegistrationService';
import latinize from 'latinize';
import { StorageService } from '../services/StorageService';

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

    constructor(
        private lecternService: LecternService,
        private dataSubmissionService: DataSubmissionService,
        private sampleRegistrationService: SampleRegistrationService,
        private storageService: StorageService,
        @Logger(__filename) private log: LoggerInterface
    ) {}

    @Post('/samples')
    @OpenAPI({
        consumes: 'multipart/form-data',
        requestBody: {
            description: 'Validates and registers the samples.',
            content: {
                'multipart/form-data': {
                    schema: {
                        type: 'object',
                        properties: {
                            file: {
                                type: 'string',
                                format: 'binary',
                            },
                        },
                    },
                },
            },
            required: true,
        },
    })
    @ResponseSchema(UploadReport)
    public async registerSamples(
        @UploadedFile('file', UploadController.uploadOptions) file: Express.Multer.File,
        @Req() request: any,
        @Res() response: any,
        @CurrentUser() user?: User
    ): Promise<UploadReport> {
        this.log.debug(`Validating ${file.originalname}`);

        const report = new UploadReport();
        report.files = [];

        const schemas = await this.getSchemas(request);

        const singleFileUploadStatus: SingleFileUploadStatus = await this.validateFile(file, schemas);
        report.files.push(singleFileUploadStatus);

        this.log.debug(JSON.stringify(report));

        if (singleFileUploadStatus?.validationErrors?.length > 0) {
            response.status(400);
        } else {
            const dataSubmission: DataSubmission = new DataSubmission();
            dataSubmission.status = Status.IN_PROGRESS;
            dataSubmission.registeredSamples = singleFileUploadStatus.processedRecords.map(
                (row) => new SampleRegistration(row)
            );

            if (user) {
                dataSubmission.createdBy = user.id;
            }

            const savedDataSubmission: DataSubmission = await this.dataSubmissionService.create(dataSubmission);
            report.dataSubmissionId = savedDataSubmission.id;

            console.log(file.buffer.length);
            await this.storageService.store(`/cqdg/clinical-data/${savedDataSubmission.id}`, file.buffer);
        }

        return report;
    }

    @Post('/clinical-data/:dataSubmissionId')
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
    public async uploadClinicalData(
        @Param('dataSubmissionId') dataSubmissionId: number,
        @UploadedFiles('files', UploadController.uploadOptions) files: Express.Multer.File[],
        @Req() request: any,
        @Res() response: any
    ): Promise<UploadReport> {
        const report = new UploadReport();
        const schemas = await this.getSchemas(request);
        const dataSubmissionCount: number = await this.sampleRegistrationService.countByDataSubmission(
            dataSubmissionId
        );

        if (!dataSubmissionCount || dataSubmissionCount === 0) {
            throw new HttpError(400, `No samples are registered for data submission id ${dataSubmissionId}`);
        }

        let hasErrors = false;

        report.files = [];

        for (const f of files) {
            this.log.debug(`Validating ${f.originalname}`);
            const singleFileUploadStatus: SingleFileUploadStatus = await this.validateFile(f, schemas);
            report.files.push(singleFileUploadStatus);

            hasErrors = hasErrors || singleFileUploadStatus?.validationErrors?.length > 0;
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

                singleFileUploadStatus.processedRecords = batch.processedRecords;

                if (batch.validationErrors && batch.validationErrors.length > 0) {
                    singleFileUploadStatus.validationErrors.push(
                        batch.validationErrors.map((err) => new RecordValidationError(err))
                    );
                }
            })
            .run();

        return singleFileUploadStatus;
    }

    private async selectSchema(filename: string): Promise<string> {
        const filenameWithoutExtension = filename.substring(0, filename.lastIndexOf('.'));
        const latinizedFilename = latinize(filenameWithoutExtension);

        let noSpecialChars = latinizedFilename.replace(/[^a-zA-Z_]/g, '');

        while (noSpecialChars.endsWith('_')) {
            noSpecialChars = noSpecialChars.substring(0, noSpecialChars.length - 1);
        }

        return noSpecialChars.toLowerCase().trim();
    }

    private async getSchemas(request: any): Promise<dictionaryEntities.SchemasDictionary> {
        let lang = request.acceptsLanguages('fr', 'en').toUpperCase();
        lang = env.lectern.dictionaryDefaultLanguage === lang ? '' : lang;

        const name = `${env.lectern.dictionaryName} ${lang}`.trim();
        const schemas = await this.lecternService.fetchLatestDictionary(name);

        return schemas;
    }
}
