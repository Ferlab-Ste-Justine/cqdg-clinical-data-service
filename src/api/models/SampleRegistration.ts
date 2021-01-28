import { IsNotEmpty } from 'class-validator';
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { DataSubmission } from './DataSubmission';

@Entity({
    name: 'sample_registration',
})
export class SampleRegistration {
    @PrimaryGeneratedColumn('uuid')
    public id: string;

    @Column({
        name: 'data_submission_id',
        nullable: true,
    })
    public dataSubmissionId: string;

    @ManyToOne((type) => DataSubmission, (dataSubmission) => dataSubmission.registeredSamples)
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
        name: 'submitter_donor_id',
        nullable: false,
    })
    public submitterDonorId: string;

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
}
