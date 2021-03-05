import { AuditEntity } from './AuditEntity';
import { IsNotEmpty, IsNumber } from 'class-validator';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { DataSubmission } from './DataSubmission';

@Entity({
    name: 'study',
})
export class Study extends AuditEntity {
    @IsNumber()
    @PrimaryGeneratedColumn('increment')
    public id: number;

    @IsNotEmpty()
    @Column({
        type: 'varchar',
    })
    public code: string;

    @OneToMany((type) => DataSubmission, (dataSubmission) => dataSubmission.study)
    public dataSubmissions: DataSubmission[];
}
