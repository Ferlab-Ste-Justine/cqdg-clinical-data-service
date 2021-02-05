import { DataSubmissionService } from '../../../src/api/services/DataSubmissionService';
import { events } from '../../../src/api/subscribers/events';
import { EventDispatcherMock } from '../lib/EventDispatcherMock';
import { LogMock } from '../lib/LogMock';
import { RepositoryMock } from '../lib/RepositoryMock';
import { DataSubmission } from '../../../src/api/models/DataSubmission';
import * as uuid from 'uuid';
import { Status } from '../../../src/api/models/ReferentialData';

describe('DataSubmissionService', () => {
    const log = new LogMock();
    const lecternService = {} as any;
    const sampleRegistrationService = {} as any;
    const dataSubmissionRepo = new RepositoryMock();
    const ed = new EventDispatcherMock();
    const dataSubmission = new DataSubmission();

    test('Find should return a list of data submissions', async (done) => {
        dataSubmission.status = Status.INITIATED;
        dataSubmission.createdBy = uuid.v1();
        dataSubmission.creationDate = new Date();
        dataSubmissionRepo.list = [dataSubmission];
        const dataSubmissionService = new DataSubmissionService(
            lecternService,
            sampleRegistrationService,
            dataSubmissionRepo as any,
            ed as any,
            log
        );
        const list = await dataSubmissionService.find();
        expect(list[0].status).toBe(Status.INITIATED);
        done();
    });

    test('Create should dispatch subscribers', async (done) => {
        dataSubmission.status = Status.INITIATED;
        dataSubmission.createdBy = uuid.v1();
        dataSubmission.creationDate = new Date();
        dataSubmissionRepo.list = [dataSubmission];
        const dataSubmissionService = new DataSubmissionService(
            lecternService,
            sampleRegistrationService,
            dataSubmissionRepo as any,
            ed as any,
            log
        );
        const newDataSubmission = await dataSubmissionService.create(dataSubmission);
        expect(ed.dispatchMock).toBeCalledWith([events.dataSubmission.created, newDataSubmission]);
        done();
    });

    test('Select proper schema based on file name', async (done) => {
        const dataSubmissionService = new DataSubmissionService(
            lecternService,
            sampleRegistrationService,
            dataSubmissionRepo as any,
            ed as any,
            log
        );
        expect(await dataSubmissionService['selectSchema']('sample_registration.csv')).toEqual('sample_registration');

        // test for accents
        expect(await dataSubmissionService['selectSchema']('SámPlÉ_RegíSTration.csv')).toEqual('sample_registration');

        // allow to send multiple files for a same entity
        expect(await dataSubmissionService['selectSchema']('sample_registration_1.csv')).toEqual('sample_registration');
        expect(await dataSubmissionService['selectSchema']('sample_registration2.csv')).toEqual('sample_registration');
        expect(await dataSubmissionService['selectSchema']('sample_registration.2.csv')).toEqual('sample_registration');

        // test having version in the filename
        expect(await dataSubmissionService['selectSchema']('sample_registration_5.11.tsv')).toEqual(
            'sample_registration'
        );
        expect(await dataSubmissionService['selectSchema']('sample_registration_1_5.11.tsv')).toEqual(
            'sample_registration'
        );

        done();
    });
});
