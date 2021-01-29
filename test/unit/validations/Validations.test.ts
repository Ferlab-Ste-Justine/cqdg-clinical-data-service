import { validate } from 'class-validator';
import * as uuid from 'uuid';
import { DataSubmission } from '../../../src/api/models/DataSubmission';
import { Status } from '../../../src/api/models/ReferentialData';
import { SampleRegistration } from '../../../src/api/models/SampleRegistration';

describe('Validations', () => {
    test('Data submission validation should succeed with all required fields', async (done) => {
        const dataSubmission = new DataSubmission();
        dataSubmission.id = 1;
        dataSubmission.status = Status.IN_PROGRESS;
        dataSubmission.createdBy = uuid.v1();
        dataSubmission.creationDate = new Date();

        const errors = await validate(dataSubmission);
        if (errors?.length > 0) {
            console.log(JSON.stringify(errors, null, 2));
        }

        expect(errors.length).toEqual(0);
        done();
    });

    test('Sample registration validation should succeed with all required fields', async (done) => {
        const sampleRegistration = new SampleRegistration();
        sampleRegistration.id = 1;
        sampleRegistration.studyId = 'ST0001';
        sampleRegistration.submitterDonorId = 'PT00001';
        sampleRegistration.submitterBiospecimenId = 'BS00001';
        sampleRegistration.submitterSampleId = 'SA00001';
        sampleRegistration.sampleType = 'Total DNA';

        const errors = await validate(sampleRegistration);
        if (errors?.length > 0) {
            console.log(JSON.stringify(errors, null, 2));
        }

        expect(errors.length).toEqual(0);
        done();
    });
});
