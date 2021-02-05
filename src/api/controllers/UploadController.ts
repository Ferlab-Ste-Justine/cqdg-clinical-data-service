import {
    Authorized,
    CurrentUser,
    Delete,
    HttpError,
    JsonController,
    NotFoundError,
    Param,
    Post,
    Req,
    Res,
    UnauthorizedError,
    UploadedFile,
    UploadedFiles,
    UploadOptions,
} from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';
import { FileFilterCallback, memoryStorage } from 'multer';
import { Logger, LoggerInterface } from '../../decorators/Logger';
import { ValidationReport } from './responses/ValidationReport';
import { SingleFileValidationStatus } from './responses/SingleFileValidationStatus';
import { env } from '../../env';
import { DataSubmission } from '../models/DataSubmission';
import { Status, User } from '../models/ReferentialData';
import { DataSubmissionService } from '../services/DataSubmissionService';
import { SampleRegistrationService } from '../services/SampleRegistrationService';
import { StorageService } from '../services/StorageService';
import { SystemError } from '../errors/SystemError';
import { SampleRegistration } from '../models/SampleRegistration';
import { entities as dictionaryEntities } from '@overturebio-stack/lectern-client';
import { LecternService } from '../services/LecternService';

@Authorized()
@JsonController('/submission')
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

    /**
     * Step 1 - Create a submission to initiate the process
     *
     * @param code
     * @param user
     */
    @Post('/:code')
    public async create(@Param('code') code: string, @CurrentUser() user: User): Promise<number> {
        const dataSubmission: DataSubmission = new DataSubmission();
        dataSubmission.code = code;
        dataSubmission.status = Status.INITIATED;
        dataSubmission.createdBy = user.id;

        const savedDataSubmission: DataSubmission = await this.dataSubmissionService.create(dataSubmission);
        return savedDataSubmission.id;
    }

    @Delete('/:dataSubmissionId')
    public async delete(@Param('dataSubmissionId') dataSubmissionId: number, @CurrentUser() user: User): Promise<void> {
        if (!(await this.isAllowed(user, dataSubmissionId))) {
            throw new UnauthorizedError(`User ${user.id} not allowed to delete submission ${dataSubmissionId}`);
        }

        try {
            await this.dataSubmissionService.delete(dataSubmissionId);
            try {
                await this.storageService.deleteDirectory(`clinical-data/${user.id}.tmp/${dataSubmissionId}`);
            } catch (err1) {
                // No files found - ignore.
            }
            try {
                await this.storageService.deleteDirectory(`clinical-data/${user.id}/${dataSubmissionId}`);
            } catch (err2) {
                // No files found - ignore.
            }
        } catch (err3) {
            throw new NotFoundError(`No submission with id ${dataSubmissionId}.`);
        }
    }

    /**
     * Step 2 - Register samples or update previously registered samples
     *
     * @param code
     * @param user
     */
    @Post('/:dataSubmissionId/samples')
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
        @CurrentUser() user: User,
        @Param('dataSubmissionId') dataSubmissionId: number
    ): Promise<ValidationReport> {
        if (!(await this.isAllowed(user, dataSubmissionId))) {
            throw new UnauthorizedError(`User ${user.id} not allowed to modify submission ${dataSubmissionId}`);
        }

        const report = new ValidationReport();
        report.files = [];

        const schemas = await this.getSchemas(request);
        const singleFileValidationStatus: SingleFileValidationStatus = await this.dataSubmissionService.validateFile(
            file,
            schemas,
            undefined
        );
        report.files.push(singleFileValidationStatus);

        this.log.debug(JSON.stringify(report));

        if (singleFileValidationStatus?.validationErrors?.length > 0) {
            response.status(400);
        } else {
            const dataSubmission: DataSubmission = new DataSubmission();
            dataSubmission.id = dataSubmissionId;
            dataSubmission.lastUpdatedBy = user.id;
            dataSubmission.registeredSamples = singleFileValidationStatus.processedRecords?.map(
                (row) => new SampleRegistration(row)
            );

            const savedDataSubmission: DataSubmission = await this.dataSubmissionService.update(dataSubmission);

            const errors: SystemError[] = await this.storageService.store(
                `clinical-data/${user.id}.tmp/${savedDataSubmission.id}/${file.originalname}`,
                file.buffer
            );

            if (errors?.length > 0) {
                response.status(500);
            }

            report.dataSubmissionId = dataSubmission.id;
            report.errors = errors;
        }

        return report;
    }

    /**
     * Step 3 - Submit clinical data
     *
     * @param code
     * @param user
     */
    @Post('/:dataSubmissionId/clinical-data')
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
        if (!(await this.isAllowed(user, dataSubmissionId))) {
            throw new UnauthorizedError(`User ${user.id} not allowed to modify submission ${dataSubmissionId}`);
        }

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

            const singleFileValidationStatus: SingleFileValidationStatus = await this.dataSubmissionService.validateFile(
                f,
                schemas,
                dataSubmissionId
            );

            // FOR TESTING PURPOSES
            // singleFileValidationStatus.validationErrors = [];

            report.files.push(singleFileValidationStatus);

            hasErrors = hasErrors || singleFileValidationStatus.validationErrors.length > 0;

            if (singleFileValidationStatus.validationErrors.length === 0) {
                // N.B.: There will always be a dataSubmissionId here; thus, it will always update, not create.
                this.storageService
                    .store(`clinical-data/${user.id}.tmp/${dataSubmissionId}/${f.originalname}`, f.buffer)
                    .then((errors) => {
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

    /**
     * Step 4 - Cross validate the data
     */
    @Post('/:dataSubmissionId/clinical-data/validate')
    public async applyValidationRules(
        @Param('dataSubmissionId') dataSubmissionId: number,
        @CurrentUser() user: User
    ): Promise<ValidationReport> {
        const report = new ValidationReport();

        return report;
    }

    private async getSchemas(request: any): Promise<dictionaryEntities.SchemasDictionary> {
        let lang = request.acceptsLanguages('fr', 'en').toUpperCase();
        lang = env.lectern.dictionaryDefaultLanguage === lang ? '' : lang;

        const name = `${env.lectern.dictionaryName} ${lang}`.trim();
        const schemas = await this.lecternService.fetchLatestDictionary(name);

        return schemas;
    }

    private async isAllowed(user: User, dataSubmissionId: number): Promise<boolean> {
        const dataSubmission: DataSubmission = await this.dataSubmissionService.findOne(dataSubmissionId);

        if (!dataSubmission) {
            throw new NotFoundError(`Data submission with id ${dataSubmissionId} does not exist.`);
        }

        // SUGGESTION:
        // Call Keycloak to retrieve user roles and organization of dataSubmission.createdBy user and compare the
        // roles & organization of the current user with the ones of the user who initially created the submission

        return user.id === dataSubmission.createdBy;
    }
}
