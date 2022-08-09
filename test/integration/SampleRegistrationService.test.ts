import { Container } from 'typedi';
import { Connection } from 'typeorm';
import { closeDatabase, createDatabaseConnection, migrateDatabase } from '../utils/database';
import { configureLogger } from '../../src/modules/logger';
import { DataSubmission } from '../../src/api/models/DataSubmission';
import { DataSubmissionService } from '../../src/api/services/DataSubmissionService';
import * as uuid from 'uuid';
import { SampleRegistration } from '../../src/api/models/SampleRegistration';
import { SampleRegistrationService } from '../../src/api/services/SampleRegistrationService';
import { Study } from '../../src/api/models/Study';
import { StudyService } from '../../src/api/services/StudyService';

describe('SampleRegistrationService', () => {
    // -------------------------------------------------------------------------
    // Setup up
    // -------------------------------------------------------------------------
    const createdBy: string = uuid.v1();
    let connection: Connection;

    beforeAll(async () => {
        configureLogger();
        connection = await createDatabaseConnection();
    });
    beforeEach(() => migrateDatabase(connection));

    const createStudy = async (): Promise<Study> => {
        const service = Container.get<StudyService>(StudyService);
        const st: Study = new Study();
        st.code = uuid.v1();
        st.createdBy = createdBy;

        return await service.create(st);
    };

    // -------------------------------------------------------------------------
    // Tear down
    // -------------------------------------------------------------------------

    afterAll(() => closeDatabase(connection));

    // -------------------------------------------------------------------------
    // Test cases
    // -------------------------------------------------------------------------

    test('should create a new sample registration in the database', async (done) => {
        const dataSubmissionService = Container.get<DataSubmissionService>(DataSubmissionService);
        const sampleRegistrationService = Container.get<SampleRegistrationService>(SampleRegistrationService);

        const study = await createStudy();
        const dataSubmission = new DataSubmission();
        dataSubmission.dictionaryVersion = '5.12';
        dataSubmission.createdBy = uuid.v1();
        dataSubmission.studyId = study.id;
        dataSubmission.study = study;

        const dataSubmissionResultCreate = await dataSubmissionService.create(dataSubmission);

        expect(dataSubmissionResultCreate.id).not.toBeUndefined();

        const sampleRegistration = new SampleRegistration();
        sampleRegistration.dataSubmissionId = dataSubmissionResultCreate.id;
        sampleRegistration.studyId = 'ST0001';
        sampleRegistration.submitterParticipantId = 'PT00001';
        sampleRegistration.submitterBiospecimenId = 'BS00001';
        sampleRegistration.submitterSampleId = 'SA00001';
        sampleRegistration.sampleType = 'Total DNA';

        const sampleRegistrationResultCreate = await sampleRegistrationService.create(sampleRegistration);

        expect(sampleRegistrationResultCreate.id).not.toBeUndefined();

        const dataSubmissionWithRelations = await dataSubmissionService.findOne(dataSubmissionResultCreate.id);

        expect(dataSubmissionWithRelations.id).not.toBeUndefined();
        expect(dataSubmissionWithRelations.registeredSamples).toHaveLength(1);

        done();
    });
});
