import { DataSubmissionService } from '../../../src/api/services/DataSubmissionService';
import { events } from '../../../src/api/subscribers/events';
import { EventDispatcherMock } from '../lib/EventDispatcherMock';
import { LogMock } from '../lib/LogMock';
import { RepositoryMock } from '../lib/RepositoryMock';
import { DataSubmission } from '../../../src/api/models/DataSubmission';
import * as uuid from 'uuid';
import { Status } from '../../../src/api/models/ReferentialData';

describe('UserService', () => {
    test('Find should return a list of users', async (done) => {
        const log = new LogMock();
        const repo = new RepositoryMock();
        const ed = new EventDispatcherMock();
        const dataSubmission = new DataSubmission();
        dataSubmission.id = uuid.v1();
        dataSubmission.status = Status.IN_PROGRESS;
        dataSubmission.createdBy = uuid.v1();
        repo.list = [dataSubmission];
        const dataSubmissionService = new DataSubmissionService(repo as any, ed as any, log);
        const list = await dataSubmissionService.find();
        expect(list[0].status).toBe(Status.IN_PROGRESS);
        done();
    });

    test('Create should dispatch subscribers', async (done) => {
        const log = new LogMock();
        const repo = new RepositoryMock();
        const ed = new EventDispatcherMock();
        const dataSubmission = new DataSubmission();
        dataSubmission.id = uuid.v1();
        dataSubmission.status = Status.IN_PROGRESS;
        dataSubmission.createdBy = uuid.v1();
        repo.list = [dataSubmission];
        const dataSubmissionService = new DataSubmissionService(repo as any, ed as any, log);
        const newDataSubmission = await dataSubmissionService.create(dataSubmission);
        expect(ed.dispatchMock).toBeCalledWith([events.dataSubmission.created, newDataSubmission]);
        done();
    });
});
