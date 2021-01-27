import {Entity, PrimaryGeneratedColumn, Column, OneToMany} from 'typeorm';
import {Status} from './ReferentialData';
import {IsNotEmpty, IsString, ValidateNested} from 'class-validator';
import {AuditEntity} from './AuditEntity';
import {SampleRegistration} from './SampleRegistration';
import {UploadReport} from '../controllers/responses/UploadReport';
import {DbAwareColumn} from '../../decorators/DBAwareColumn';
import {Type} from 'class-transformer';

@Entity({
    name: 'data_submission',
})
export class DataSubmission extends AuditEntity {
    @IsString()
    @PrimaryGeneratedColumn('uuid')
    public id: string;

    @IsNotEmpty()
    @Column({
        type: 'varchar',
    })
    public status: Status;

    @ValidateNested({ each: true })
    @Type(() => UploadReport)
    @DbAwareColumn({
        name: 'status_report',
        type: 'json',
        nullable: true,
    })
    public statusReport: UploadReport;

    @OneToMany(type => SampleRegistration, sampleRegistration => sampleRegistration.dataSubmission)
    public registeredSamples: SampleRegistration[];
}
