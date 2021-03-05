import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { IsNotEmpty, IsNumber, ValidateNested } from 'class-validator';
import { AuditEntity } from './AuditEntity';
import { SampleRegistration } from './SampleRegistration';
import { ValidationReport } from '../controllers/responses/ValidationReport';
import { DbAwareColumn } from '../../decorators/DBAwareColumn';
import { Type } from 'class-transformer';
import { Study } from './Study';

@Entity({
    name: 'data_submission',
})
export class DataSubmission extends AuditEntity {
    @IsNumber()
    @PrimaryGeneratedColumn('increment')
    public id: number;

    @Column({
        name: 'study_id',
        nullable: true,
    })
    public studyId: number;

    @ManyToOne((type) => Study, (study) => study.dataSubmissions, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'study_id' })
    public study: Study;

    @IsNotEmpty()
    @Column({
        type: 'varchar',
        name: 'dictionary_version',
    })
    public dictionaryVersion: string;

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
