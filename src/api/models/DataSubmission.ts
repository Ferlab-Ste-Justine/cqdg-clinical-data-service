import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Status } from './ReferentialData';
import { IsNotEmpty, IsNumber, ValidateNested } from 'class-validator';
import { AuditEntity } from './AuditEntity';
import { SampleRegistration } from './SampleRegistration';
import { ValidationReport } from '../controllers/responses/ValidationReport';
import { DbAwareColumn } from '../../decorators/DBAwareColumn';
import { Type } from 'class-transformer';

@Entity({
    name: 'data_submission',
})
export class DataSubmission extends AuditEntity {
    @IsNumber()
    @PrimaryGeneratedColumn('increment')
    public id: number;

    @IsNotEmpty()
    @Column({
        type: 'varchar',
    })
    public code: string;

    @IsNotEmpty()
    @Column({
        type: 'varchar',
        name: 'dictionary_version',
    })
    public dictionaryVersion: string;

    @IsNotEmpty()
    @Column({
        type: 'varchar',
    })
    public status: Status;

    @ValidateNested({ each: true })
    @Type(() => ValidationReport)
    @DbAwareColumn({
        name: 'status_report',
        type: 'json',
        nullable: true,
    })
    public statusReport: ValidationReport;

    @OneToMany((type) => SampleRegistration, (sampleRegistration) => sampleRegistration.dataSubmission)
    public registeredSamples: SampleRegistration[];
}
