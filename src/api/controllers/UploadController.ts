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
import { User } from '../models/ReferentialData';
import { DataSubmissionService } from '../services/DataSubmissionService';
import { SampleRegistrationService } from '../services/SampleRegistrationService';
import { StorageService } from '../services/StorageService';
import { SystemError } from '../errors/SystemError';
import { SampleRegistration } from '../models/SampleRegistration';
import { LecternService } from '../services/LecternService';
import { ValidationService } from '../services/ValidationService';
import { StudyService } from '../services/StudyService';
import { BaseController } from './BaseController';
import { Study } from '../models/Study';

@Authorized()
@JsonController('/submission')
@OpenAPI({})
// @OpenAPI({ security: [{ cqdgAuth: [] }] })
export class UploadController extends BaseController {
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
        private studyService: StudyService,
        private lecternService: LecternService,
        private dataSubmissionService: DataSubmissionService,
        private sampleRegistrationService: SampleRegistrationService,
        private storageService: StorageService,
        private validationService: ValidationService,
        @Logger(__filename) private log: LoggerInterface
    ) {
        super();
    }

    @Delete('/:dataSubmissionId')
    public async delete(
        @Param('dataSubmissionId') dataSubmissionId: number,
        @CurrentUser() user: User
    ): Promise<number> {
        if (!(await this.isAllowed(user, dataSubmissionId))) {
            throw new UnauthorizedError(`User ${user.id} not allowed to delete submission ${dataSubmissionId}`);
        }

        try {
            await this.dataSubmissionService.delete(dataSubmissionId);
        } catch (err3) {
            throw new NotFoundError(`No submission with id ${dataSubmissionId}.`);
        }

        return dataSubmissionId;
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
        const dataSubmission: DataSubmission = await this.dataSubmissionService.findOne(dataSubmissionId);

        if (!(await this.isAllowed(user, dataSubmission))) {
            throw new UnauthorizedError(`User ${user.id} not allowed to modify submission ${dataSubmissionId}`);
        }

        const report = new ValidationReport();
        report.files = [];

        const schemas = await this.fetchDictionary(request, this.lecternService, dataSubmission.dictionaryVersion);

        const singleFileValidationStatus: SingleFileValidationStatus = await this.validationService.validateFile(
            file,
            schemas,
            undefined
        );
        report.files.push(singleFileValidationStatus);

        this.log.debug(JSON.stringify(report));

        if (
            singleFileValidationStatus &&
            singleFileValidationStatus.validationErrors &&
            singleFileValidationStatus.validationErrors.length > 0
        ) {
            response.status(400);
        } else {
            dataSubmission.lastUpdatedBy = user.id;
            dataSubmission.registeredSamples = singleFileValidationStatus.processedRecords
                ? singleFileValidationStatus.processedRecords.map((row) => new SampleRegistration(row))
                : undefined;

            const updatedDataSubmission: DataSubmission = await this.dataSubmissionService.update(dataSubmission);
            const study: Study = await this.studyService.findOne(updatedDataSubmission.studyId);

            const errors: SystemError[] = await this.storageService.store(
                `clinical-data/${study.createdBy}/${study.id}-${study.code}/${updatedDataSubmission.id}/${file.originalname}`,
                file.buffer
            );

            if (errors && errors.length > 0) {
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
        const dataSubmission: DataSubmission = await this.dataSubmissionService.findOne(dataSubmissionId);

        if (!(await this.isAllowed(user, dataSubmission))) {
            throw new UnauthorizedError(`User ${user.id} not allowed to modify submission ${dataSubmissionId}`);
        }

        const report = new ValidationReport();

        const schemas = await this.fetchDictionary(request, this.lecternService, dataSubmission.dictionaryVersion);
        const dataSubmissionCount: number = await this.sampleRegistrationService.countByDataSubmission(
            dataSubmissionId
        );

        if (!dataSubmissionCount || dataSubmissionCount === 0) {
            throw new HttpError(400, `No samples are registered for data submission id ${dataSubmissionId}`);
        }

        const study: Study = await this.studyService.findOne(dataSubmission.studyId);
        let hasErrors = false;

        report.files = [];
        report.errors = [];

        for (const f of files) {
            this.log.debug(`Validating ${f.originalname}`);
            const singleFileValidationStatus: SingleFileValidationStatus = await this.validationService.validateFile(
                f,
                schemas,
                dataSubmissionId
            );

            report.files.push(singleFileValidationStatus);

            hasErrors = hasErrors || singleFileValidationStatus.validationErrors.length > 0;

            if (singleFileValidationStatus.validationErrors.length === 0) {
                // N.B.: There will always be a dataSubmissionId here; thus, it will always update, not create.
                this.storageService
                    .store(
                        `clinical-data/${study.createdBy}/${study.id}-${study.code}/${dataSubmissionId}/${f.originalname}`,
                        f.buffer
                    )
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
    public async crossValidateAllData(
        @Param('dataSubmissionId') dataSubmissionId: number,
        @CurrentUser() user: User,
        @Req() request: any,
        @Res() response: any
    ): Promise<ValidationReport> {
        const dataSubmission: DataSubmission = await this.dataSubmissionService.findOne(dataSubmissionId);

        if (!(await this.isAllowed(user, dataSubmission))) {
            throw new UnauthorizedError(`User ${user.id} not allowed to modify submission ${dataSubmissionId}`);
        }

        const schemas = await this.fetchDictionary(request, this.lecternService, dataSubmission.dictionaryVersion);

        const validationReport = await this.validationService.validateAll(dataSubmission, schemas);

        let hasError = false;
        if (validationReport && validationReport.files) {
            validationReport.files.forEach((file) => {
                if (file.validationErrors && file.validationErrors.length > 0) {
                    hasError = true;
                }
            });
        }

        if (hasError || validationReport.globalValidationErrors.length > 0 || validationReport.errors.length > 0) {
            response.status(400);
        }

        return validationReport;
    }

    /**
     * Step 5 - Sign-off : this step will trigger the ETL and data will be indexed.
     */
    @Post('/:dataSubmissionId/clinical-data/complete')
    public async signOff(
        @Param('dataSubmissionId') dataSubmissionId: number,
        @CurrentUser() user: User,
        @Req() request: any,
        @Res() response: any
    ): Promise<boolean> {
        const dataSubmission: DataSubmission = await this.dataSubmissionService.findOne(dataSubmissionId);

        if (!(await this.isAllowed(user, dataSubmission))) {
            throw new UnauthorizedError(`User ${user.id} not allowed to modify submission ${dataSubmissionId}`);
        }

        // Must be an array for Spark to understand.
        const metadata = [
            {
                studyVersionDate: this.formatDate(dataSubmission.creationDate),
                studyVersionAuthor: dataSubmission.createdBy,
                dictionaryVersion: dataSubmission.dictionaryVersion,
            },
        ];

        // The addition of the study_version_metadata.json is what is going to trigger the ETL to process the keys that siblings to this file
        await this.storageService.store(
            `clinical-data/${dataSubmission.study.createdBy}/${dataSubmission.study.id}-${dataSubmission.study.code}/${dataSubmissionId}/study_version_metadata.json`,
            Buffer.from(JSON.stringify(metadata, undefined, 2), 'utf-8')
        );

        return true;
    }

    private async isAllowed(user: User, dataSubmission: number | DataSubmission): Promise<boolean> {
        if (!(dataSubmission instanceof DataSubmission)) {
            dataSubmission = await this.dataSubmissionService.findOne(dataSubmission);
        }
        return user.id === dataSubmission.createdBy;
    }

    private formatDate(date: Date): string {
        let month = '' + (date.getMonth() + 1);
        let day = '' + date.getDate();
        const year = date.getFullYear();

        if (month.length < 2) {
            month = '0' + month;
        }
        if (day.length < 2) {
            day = '0' + day;
        }

        return [year, month, day].join('-');
    }
}
