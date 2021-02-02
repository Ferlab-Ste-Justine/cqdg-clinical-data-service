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
import { ValidationReport } from './responses/ValidationReport';
import { SingleFileValidationStatus } from './responses/SingleFileValidationStatus';
import { env } from '../../env';
import { BatchProcessingResult } from '@overturebio-stack/lectern-client/lib/schema-entities';
import { RecordValidationError } from './responses/RecordValidationError';
import { entities as dictionaryEntities } from '@overturebio-stack/lectern-client';
import { DataSubmission } from '../models/DataSubmission';
import { User } from '../models/ReferentialData';
import { DataSubmissionService } from '../services/DataSubmissionService';
import { SampleRegistrationService } from '../services/SampleRegistrationService';
import latinize from 'latinize';
import { StorageService } from '../services/StorageService';
import { SystemError } from '../errors/SystemError';

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
    @ResponseSchema(ValidationReport)
    public async registerSamples(
        @UploadedFile('file', UploadController.uploadOptions) file: Express.Multer.File,
        @Req() request: any,
        @Res() response: any,
        @CurrentUser() user: User
    ): Promise<ValidationReport> {
        return await this.updateRegisteredSamples(file, request, response, user, NaN);
    }

    @Post('/samples/:dataSubmissionId')
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
    @ResponseSchema(ValidationReport)
    public async updateRegisteredSamples(
        @UploadedFile('file', UploadController.uploadOptions) file: Express.Multer.File,
        @Req() request: any,
        @Res() response: any,
        @CurrentUser() user: User,
        @Param('dataSubmissionId') dataSubmissionId: number
    ): Promise<ValidationReport> {
        this.log.debug(`Validating ${file.originalname}`);

        const report = new ValidationReport();
        report.files = [];

        const schemas = await this.getSchemas(request);

        const singleFileValidationStatus: SingleFileValidationStatus = await this.validateFile(file, schemas);
        report.files.push(singleFileValidationStatus);

        this.log.debug(JSON.stringify(report));

        if (singleFileValidationStatus?.validationErrors?.length > 0) {
            response.status(400);
        } else {
            const dataSubmission: DataSubmission = await this.dataSubmissionService.createOrUpdate(
                dataSubmissionId,
                singleFileValidationStatus.processedRecords,
                user
            );

            const errors: SystemError[] = await this.saveFile(
                `clinical-data/${user.id}.tmp/${dataSubmission.id}/${singleFileValidationStatus.schemaName}.tsv`,
                file
            );

            report.dataSubmissionId = dataSubmission.id;
            report.errors = errors;
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
    @ResponseSchema(ValidationReport)
    public async uploadClinicalData(
        @Param('dataSubmissionId') dataSubmissionId: number,
        @UploadedFiles('files', UploadController.uploadOptions) files: Express.Multer.File[],
        @Req() request: any,
        @Res() response: any,
        @CurrentUser() user?: User
    ): Promise<ValidationReport> {
        const report = new ValidationReport();
        const schemas = await this.getSchemas(request);
        const dataSubmissionCount: number = await this.sampleRegistrationService.countByDataSubmission(
            dataSubmissionId
        );

        if (!dataSubmissionCount || dataSubmissionCount === 0) {
            throw new HttpError(400, `No samples are registered for data submission id ${dataSubmissionId}`);
        }

        let hasErrors = false;

        report.files = [];
        report.errors = [];

        for (const f of files) {
            this.log.debug(`Validating ${f.originalname}`);
            const singleFileValidationStatus: SingleFileValidationStatus = await this.validateFile(f, schemas);

            // FOR TESTING PURPOSES
            // singleFileValidationStatus.validationErrors = [];

            report.files.push(singleFileValidationStatus);

            hasErrors = hasErrors || singleFileValidationStatus.validationErrors.length > 0;

            if (singleFileValidationStatus.validationErrors.length === 0) {
                // N.B.: There will always be a dataSubmissionId here; thus, it will always update, not create.
                this.saveFile(
                    `clinical-data/${user.id}.tmp/${dataSubmissionId}/${singleFileValidationStatus.schemaName}.tsv`,
                    f
                ).then((errors) => {
                    if (errors && errors.length > 0) {
                        report.errors.push(...errors);
                    }
                });
            }
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
    ): Promise<SingleFileValidationStatus> {
        const singleFileValidationStatus: SingleFileValidationStatus = new SingleFileValidationStatus();
        singleFileValidationStatus.filename = file.originalname;
        singleFileValidationStatus.validationErrors = [];

        const schemaForCurrentFile = await this.selectSchema(file.originalname);
        singleFileValidationStatus.schemaName = schemaForCurrentFile;

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

                singleFileValidationStatus.processedRecords = batch.processedRecords;

                if (batch.validationErrors && batch.validationErrors.length > 0) {
                    singleFileValidationStatus.validationErrors.push(
                        batch.validationErrors.map((err) => new RecordValidationError(err))
                    );
                }
            })
            .run();

        return singleFileValidationStatus;
    }

    private async saveFile(filename: string, file: Express.Multer.File): Promise<SystemError[]> {
        let errors: SystemError[];

        try {
            // Saved in s3 to eventually be processed by ETL
            await this.storageService.store(filename, file.buffer);
        } catch (error) {
            errors = Object.keys(error).map(
                (key) =>
                    new SystemError(
                        error[key].Code,
                        `Error: ${error[key].name}, Bucket: ${error[key].BucketName}, File: ${filename}`,
                        error[key]
                    )
            );
        }

        return errors;
    }

    private async selectSchema(filename: string): Promise<string> {
        const filenameWithoutExtension = filename.substring(0, filename.indexOf('.'));
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
