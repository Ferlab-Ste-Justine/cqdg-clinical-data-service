import { validate } from 'class-validator';
import * as uuid from 'uuid';
import { DataSubmission } from '../../../src/api/models/DataSubmission';
import { Status } from '../../../src/api/models/ReferentialData';
import { SampleRegistration } from '../../../src/api/models/SampleRegistration';

describe('Validations', () => {
    test('Data submission validation should succeed with all required fields', async (done) => {
        const dataSubmission = new DataSubmission();
        dataSubmission.id = uuid.v1();
        dataSubmission.status = Status.IN_PROGRESS;
        dataSubmission.createdBy = uuid.v1();

        const errors = await validate(dataSubmission);
        expect(errors.length).toEqual(0);
        done();
    });

    test('Sample registration validation should succeed with all required fields', async (done) => {
        const sampleRegistration = new SampleRegistration();
        sampleRegistration.id = uuid.v1();
        sampleRegistration.studyId = 'ST0001';
        sampleRegistration.submitterDonorId = 'PT00001';
        sampleRegistration.submitterBiospecimenId = 'BS00001';
        sampleRegistration.submitterSampleId = 'SA00001';
        sampleRegistration.sampleType = 'Total DNA';

        const errors = await validate(sampleRegistration);
        expect(errors.length).toEqual(0);
        done();
    });
});
