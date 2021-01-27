import {Container} from 'typedi';
import {Connection} from 'typeorm';
import {closeDatabase, createDatabaseConnection, migrateDatabase} from '../utils/database';
import {configureLogger} from '../../src/modules/logger';
import {DataSubmission} from '../../src/api/models/DataSubmission';
import {DataSubmissionService} from '../../src/api/services/DataSubmissionService';
import {Status} from '../../src/api/models/ReferentialData';
import * as uuid from 'uuid';

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
    // Test cases
    // -------------------------------------------------------------------------

    test('should create a new data submission in the database', async (done) => {
        const dataSubmission = new DataSubmission();
        dataSubmission.status = Status.IN_PROGRESS;
        dataSubmission.createdBy = uuid.v1();

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
        if (resultFind) {
            expect(resultFind.id).not.toBeUndefined();
            expect(resultFind.status).toBe(Status.IN_PROGRESS);
        } else {
            fail(`Could not find data submission with id ${resultCreate.id}`);
        }
        done();
    });

});
