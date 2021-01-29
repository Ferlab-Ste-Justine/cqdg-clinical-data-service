import { Field, ID, ObjectType } from 'type-graphql';
import { DataSubmission } from './DataSubmission';

@ObjectType({
    description: 'Sample registration object.',
})
export class SampleRegistration {
    @Field((type) => ID)
    public id: number;

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
    public dataSubmissionId: number;

    @Field((type) => DataSubmission, {
        nullable: true,
    })
    public dataSubmission: DataSubmission;

    constructor(json: any) {
        this.id = json.id || undefined;
        this.dataSubmissionId = json.dataSubmissionId || undefined;
        this.studyId = json.studyId || undefined;
        this.submitterBiospecimenId = json.submitterBiospecimenId || undefined;
        this.submitterSampleId = json.submitterSampleId || undefined;
        this.sampleType = json.sampleType || undefined;
        this.submitterDonorId = json.submitterDonorId || undefined;
    }
}
