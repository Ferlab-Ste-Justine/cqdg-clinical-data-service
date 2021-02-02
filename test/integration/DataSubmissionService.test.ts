import { Container } from 'typedi';
import { Connection } from 'typeorm';
import { closeDatabase, createDatabaseConnection, migrateDatabase } from '../utils/database';
import { configureLogger } from '../../src/modules/logger';
import { DataSubmission } from '../../src/api/models/DataSubmission';
import { DataSubmissionService } from '../../src/api/services/DataSubmissionService';
import { Status } from '../../src/api/models/ReferentialData';
import * as uuid from 'uuid';
import { ValidationReport } from '../../src/api/controllers/responses/ValidationReport';
import { SingleFileValidationStatus } from '../../src/api/controllers/responses/SingleFileValidationStatus';
import { RecordValidationError } from '../../src/api/controllers/responses/RecordValidationError';
import { SampleRegistration } from '../../src/api/models/SampleRegistration';

describe('DataSubmissionService', () => {
    // -------------------------------------------------------------------------
    // Setup up
    // -------------------------------------------------------------------------

    let connection: Connection;
    beforeAll(async () => {
        configureLogger();
        connection = await createDatabaseConnection();
    });
    beforeEach(() => migrateDatabase(connection));

    // -------------------------------------------------------------------------
    // Tear down
    // -------------------------------------------------------------------------

    afterAll(() => closeDatabase(connection));

    // -------------------------------------------------------------------------
    // Utility methods
    // -------------------------------------------------------------------------
    const getUploadReport = (): ValidationReport => {
        const uploadReport: ValidationReport = new ValidationReport();
        uploadReport.files = [];

        const reportFile1: SingleFileValidationStatus = new SingleFileValidationStatus();
        reportFile1.filename = 'donors.tsv';
        reportFile1.validationErrors = [];

        const reportFile2: SingleFileValidationStatus = new SingleFileValidationStatus();
        reportFile2.filename = 'biospecimen.tsv';
        reportFile2.validationErrors = [];

        const biospecimenValidationError: RecordValidationError = new RecordValidationError({
            errorType: 'INVALID_BY_REGEX',
            fieldName: 'biospecimen_anatomic_location',
            message:
                "The value is not a permissible for this field, it must meet the regular expression: '^[C][0-9]{2}(.[0-9]{1})?$'. Examples: C50.1,C18",
            info: {
                regex: '^[C][0-9]{2}(.[0-9]{1})?$',
                examples: 'C50.1,C18',
            },
        });

        const donorValidationError: RecordValidationError = new RecordValidationError({
            errorType: 'INVALID_BY_REGEX',
            fieldName: 'submitter_donor_id',
            message:
                "The value is not a permissible for this field, it must meet the regular expression: '^[C][0-9]{2}(.[0-9]{1})?$'. Examples: C50.1,C18",
            info: {
                regex: '^[C][0-9]{2}(.[0-9]{1})?$',
                examples: 'C50.1,C18',
            },
        });

        reportFile1.validationErrors.push(biospecimenValidationError);
        reportFile2.validationErrors.push(donorValidationError);

        uploadReport.files.push(reportFile1);
        uploadReport.files.push(reportFile2);

        return uploadReport;
    };

    // -------------------------------------------------------------------------
    // Test cases
    // -------------------------------------------------------------------------

    test('should create a new data submission in the database', async (done) => {
        const dataSubmission = new DataSubmission();
        dataSubmission.status = Status.IN_PROGRESS;
        dataSubmission.createdBy = uuid.v1();
        dataSubmission.statusReport = getUploadReport();

        const service = Container.get<DataSubmissionService>(DataSubmissionService);
        const resultCreate = await service.create(dataSubmission);

        console.log(JSON.stringify(resultCreate, undefined, 2));

        expect(resultCreate.status).toBe(Status.IN_PROGRESS);
        expect(resultCreate.id).not.toBeUndefined();
        expect(resultCreate.creationDate).not.toBeUndefined();

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const testDate = new Date(resultCreate.creationDate.getTime());
        testDate.setHours(0, 0, 0, 0);

        expect(testDate.getTime()).toBe(today.getTime());

        const resultFind = await service.findOne(resultCreate.id);

        if (resultFind) {
            expect(resultFind.id).not.toBeUndefined();
            expect(resultFind.status).toBe(Status.IN_PROGRESS);
            expect(resultFind.statusReport).not.toBeUndefined();
        } else {
            fail(`Could not find data submission with id ${resultCreate.id}`);
        }
        done();
    });

    test('should create a new data submission with samples in the database', async (done) => {
        const dataSubmission = new DataSubmission();
        dataSubmission.status = Status.IN_PROGRESS;
        dataSubmission.createdBy = uuid.v1();
        dataSubmission.registeredSamples = [];

        const sample1: SampleRegistration = new SampleRegistration({
            study_id: 'ST0001',
            submitter_donor_id: 'PT0001',
            submitter_biospecimen_id: 'BS0001',
            submitter_sample_id: 'SM0001',
            sample_type: 'Total DNA',
        });

        const sample2: SampleRegistration = new SampleRegistration({
            study_id: 'ST0001',
            submitter_donor_id: 'PT0001',
            submitter_biospecimen_id: 'BS0002',
            submitter_sample_id: 'SM0002',
            sample_type: 'Total DNA',
        });

        dataSubmission.registeredSamples.push(sample1, sample2);

        const service = Container.get<DataSubmissionService>(DataSubmissionService);
        const resultCreate = await service.create(dataSubmission);

        expect(resultCreate.id).not.toBeUndefined();
        expect(resultCreate.registeredSamples).toHaveLength(2);

        const resultFind = await service.findOne(resultCreate.id);

        if (resultFind) {
            // console.log(JSON.stringify(resultFind, undefined, 2));
            expect(resultFind.id).not.toBeUndefined();
            expect(resultFind.registeredSamples).toHaveLength(2);
        } else {
            fail(`Could not find data submission with id ${resultCreate.id}`);
        }
        done();
    });
});
