import { DataSubmissionService } from '../../../src/api/services/DataSubmissionService';
import { events } from '../../../src/api/subscribers/events';
import { EventDispatcherMock } from '../lib/EventDispatcherMock';
import { LogMock } from '../lib/LogMock';
import { RepositoryMock } from '../lib/RepositoryMock';
import { DataSubmission } from '../../../src/api/models/DataSubmission';
import * as uuid from 'uuid';

describe('DataSubmissionService', () => {
    const log = new LogMock();
    const sampleRegistrationService = {} as any;
    const storageService = {} as any;
    const dataSubmissionRepository = new RepositoryMock();
    const studyRepository = new RepositoryMock();
    const eventDispatcher = new EventDispatcherMock();
    const dataSubmission = new DataSubmission();

    test('Find should return a list of data submissions', async (done) => {
        dataSubmission.dictionaryVersion = '5.12';
        dataSubmission.createdBy = uuid.v1();
        dataSubmission.creationDate = new Date();
        dataSubmissionRepository.list = [dataSubmission];
        const dataSubmissionService = new DataSubmissionService(
            sampleRegistrationService,
            storageService,
            dataSubmissionRepository as any,
            studyRepository as any,
            eventDispatcher as any,
            log
        );

        const list = await dataSubmissionService.find();
        expect(list[0].dictionaryVersion).toBe('5.12');
        done();
    });

    test('Create should dispatch subscribers', async (done) => {
        dataSubmission.dictionaryVersion = '5.12';
        dataSubmission.createdBy = uuid.v1();
        dataSubmission.creationDate = new Date();
        dataSubmissionRepository.list = [dataSubmission];
        const dataSubmissionService = new DataSubmissionService(
            sampleRegistrationService,
            storageService,
            dataSubmissionRepository as any,
            studyRepository as any,
            eventDispatcher as any,
            log
        );
        const newDataSubmission = await dataSubmissionService.create(dataSubmission);
        expect(eventDispatcher.dispatchMock).toBeCalledWith([events.dataSubmission.created, newDataSubmission]);
        done();
    });
});
