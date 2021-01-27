import {Field, ID, ObjectType} from 'type-graphql';
import {DataSubmission} from './DataSubmission';

@ObjectType({
    description: 'Sample registration object.',
})
export class SampleRegistration {

    @Field(type => ID)
    public id: string;

    @Field({
        description: 'Unique identifier for the Study.',
    })
    public studyId: string;

    @Field({
        description: 'Unique identifier of the donor, assigned by the data provider.',
    })
    public submitterDonorId: string;

    @Field({
        description: 'Unique identifier of the biospecimen, assigned by the data provider.',
    })
    public submitterBiospecimenId: string;

    @Field({
        description: 'Unique identifier of the molecular sample, assigned by the data provider',
    })
    public submitterSampleId: string;

    @Field({
        description: 'Type of molecular sample used for analysis testing',
    })
    public sampleType: string;

    @Field({
        description: 'Unique identifier of the data submission process.',
    })
    public dataSubmissionId: string;

    @Field(type => DataSubmission, {
        nullable: true,
    })
    public dataSubmission: DataSubmission;

}
