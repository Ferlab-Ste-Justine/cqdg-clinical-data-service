import { DataSubmissionService } from '../../../src/api/services/DataSubmissionService';
import { events } from '../../../src/api/subscribers/events';
import { EventDispatcherMock } from '../lib/EventDispatcherMock';
import { LogMock } from '../lib/LogMock';
import { RepositoryMock } from '../lib/RepositoryMock';
import { DataSubmission } from '../../../src/api/models/DataSubmission';
import * as uuid from 'uuid';
import { Status } from '../../../src/api/models/ReferentialData';
import { UploadController } from '../../../src/api/controllers/UploadController';

describe('DataSubmissionService', () => {
    test('Find should return a list of data submissions', async (done) => {
        const log = new LogMock();
        const dataSubmissionRepo = new RepositoryMock();
        const sampleRegistrationRepo = new RepositoryMock();
        const ed = new EventDispatcherMock();
        const dataSubmission = new DataSubmission();
        dataSubmission.status = Status.IN_PROGRESS;
        dataSubmission.createdBy = uuid.v1();
        dataSubmission.creationDate = new Date();
        dataSubmissionRepo.list = [dataSubmission];
        const dataSubmissionService = new DataSubmissionService(
            dataSubmissionRepo as any,
            sampleRegistrationRepo as any,
            ed as any,
            log
        );
        const list = await dataSubmissionService.find();
        expect(list[0].status).toBe(Status.IN_PROGRESS);
        done();
    });

    test('Create should dispatch subscribers', async (done) => {
        const log = new LogMock();
        const dataSubmissionRepo = new RepositoryMock();
        const sampleRegistrationRepo = new RepositoryMock();
        const ed = new EventDispatcherMock();
        const dataSubmission = new DataSubmission();
        dataSubmission.status = Status.IN_PROGRESS;
        dataSubmission.createdBy = uuid.v1();
        dataSubmission.creationDate = new Date();
        dataSubmissionRepo.list = [dataSubmission];
        const dataSubmissionService = new DataSubmissionService(
            dataSubmissionRepo as any,
            sampleRegistrationRepo as any,
            ed as any,
            log
        );
        const newDataSubmission = await dataSubmissionService.create(dataSubmission);
        expect(ed.dispatchMock).toBeCalledWith([events.dataSubmission.created, newDataSubmission]);
        done();
    });

    test('Select proper schema based on file name', async (done) => {
        const uploadController = new UploadController({} as any, {} as any, {} as any, {} as any, {} as any);
        expect(await uploadController['selectSchema']('sample_registration.csv')).toEqual('sample_registration');

        // test for accents
        expect(await uploadController['selectSchema']('SámPlÉ_RegíSTration.csv')).toEqual('sample_registration');

        // allow to send multiple files for a same entity
        expect(await uploadController['selectSchema']('sample_registration_1.csv')).toEqual('sample_registration');
        expect(await uploadController['selectSchema']('sample_registration2.csv')).toEqual('sample_registration');
        expect(await uploadController['selectSchema']('sample_registration.2.csv')).toEqual('sample_registration');

        // test having version in the filename
        expect(await uploadController['selectSchema']('sample_registration_5.11.tsv')).toEqual('sample_registration');
        expect(await uploadController['selectSchema']('sample_registration_1_5.11.tsv')).toEqual('sample_registration');

        done();
    });
});
