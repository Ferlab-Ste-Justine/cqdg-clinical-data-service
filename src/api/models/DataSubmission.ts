import {Entity, PrimaryGeneratedColumn, Column, OneToMany} from 'typeorm';
import {Status} from './ReferentialData';
import {IsNotEmpty} from 'class-validator';
import {AuditEntity} from './AuditEntity';
import {SampleRegistration} from './SampleRegistration';

@Entity({
    name: 'data_submission',
})
export class DataSubmission extends AuditEntity {
    @PrimaryGeneratedColumn('uuid')
    public id: string;

    @IsNotEmpty()
    @Column({
        type: 'varchar',
    })
    public status: Status;

    @OneToMany(type => SampleRegistration, sampleRegistration => sampleRegistration.dataSubmission)
    public registeredSamples: SampleRegistration[];
}
