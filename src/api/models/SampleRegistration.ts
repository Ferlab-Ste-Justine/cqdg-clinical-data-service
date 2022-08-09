import { IsNotEmpty, IsNumber } from 'class-validator';
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { DataSubmission } from './DataSubmission';

@Entity({
    name: 'sample_registration',
})
export class SampleRegistration {
    @IsNumber()
    @PrimaryGeneratedColumn('increment')
    public id: number;

    @Column({
        name: 'data_submission_id',
        nullable: true,
    })
    public dataSubmissionId: number;

    @ManyToOne((type) => DataSubmission, (dataSubmission) => dataSubmission.registeredSamples, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'data_submission_id' })
    public dataSubmission: DataSubmission;

    @IsNotEmpty()
    @Column({
        name: 'study_id',
        nullable: false,
    })
    public studyId: string;

    @IsNotEmpty()
    @Column({
        name: 'submitter_participant_id',
        nullable: false,
    })
    public submitterParticipantId: string;

    @IsNotEmpty()
    @Column({
        name: 'submitter_biospecimen_id',
        nullable: false,
    })
    public submitterBiospecimenId: string;

    @IsNotEmpty()
    @Column({
        name: 'submitter_sample_id',
        nullable: false,
    })
    public submitterSampleId: string;

    @IsNotEmpty()
    @Column({
        name: 'sample_type',
        nullable: false,
    })
    public sampleType: string;

    constructor(json: any = {}) {
        this.id = json.id || undefined;
        this.studyId = json.study_id || undefined;
        this.submitterParticipantId = json.submitter_participant_id || undefined;
        this.submitterBiospecimenId = json.submitter_biospecimen_id || undefined;
        this.submitterSampleId = json.submitter_sample_id || undefined;
        this.sampleType = json.sample_type || undefined;
    }
}
