import {Container} from 'typedi';
import {Connection} from 'typeorm';
import {closeDatabase, createDatabaseConnection, migrateDatabase} from '../utils/database';
import {configureLogger} from '../../src/modules/logger';
import {DataSubmission} from '../../src/api/models/DataSubmission';
import {DataSubmissionService} from '../../src/api/services/DataSubmissionService';
import {Status} from '../../src/api/models/ReferentialData';
import * as uuid from 'uuid';
import {UploadReport} from '../../src/api/controllers/responses/UploadReport';
import {SingleFileUploadStatus} from '../../src/api/controllers/responses/SingleFileUploadStatus';
import {RecordValidationError} from '../../src/api/controllers/responses/RecordValidationError';

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
    const getUploadReport = (): UploadReport => {
        const uploadReport: UploadReport = new UploadReport();
        uploadReport.files = [];

        const reportFile1: SingleFileUploadStatus = new SingleFileUploadStatus();
        reportFile1.filename = 'donors.tsv';
        reportFile1.validationErrors = [];

        const reportFile2: SingleFileUploadStatus = new SingleFileUploadStatus();
        reportFile2.filename = 'biospecimen.tsv';
        reportFile2.validationErrors = [];

        const biospecimenValidationError: RecordValidationError = new RecordValidationError({
            errorType: 'INVALID_BY_REGEX',
            fieldName: 'biospecimen_anatomic_location',
            message: 'The value is not a permissible for this field, it must meet the regular expression: \'^[C][0-9]{2}(.[0-9]{1})?$\'. Examples: C50.1,C18',
            info: {
                'regex': '^[C][0-9]{2}(.[0-9]{1})?$',
                'examples': 'C50.1,C18',
            },
        });

        const donorValidationError: RecordValidationError = new RecordValidationError({
            errorType: 'INVALID_BY_REGEX',
            fieldName: 'submitter_donor_id',
            message: 'The value is not a permissible for this field, it must meet the regular expression: \'^[C][0-9]{2}(.[0-9]{1})?$\'. Examples: C50.1,C18',
            info: {
                'regex': '^[C][0-9]{2}(.[0-9]{1})?$',
                'examples': 'C50.1,C18',
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

        expect(resultCreate.status).toBe(Status.IN_PROGRESS);
        expect(resultCreate.id).not.toBeUndefined();
        expect(resultCreate.creationDate).not.toBeUndefined();

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const testDate = new Date(resultCreate.creationDate.getTime());
        testDate.setHours(0, 0, 0, 0);

        expect(testDate.getTime()).toBe(today.getTime());

        const resultFind = await service.findOne(resultCreate.id);

        console.log(JSON.stringify(resultFind));

        if (resultFind) {
            expect(resultFind.id).not.toBeUndefined();
            expect(resultFind.status).toBe(Status.IN_PROGRESS);
            expect(resultFind.statusReport).not.toBeUndefined();
        } else {
            fail(`Could not find data submission with id ${resultCreate.id}`);
        }
        done();
    });

});
