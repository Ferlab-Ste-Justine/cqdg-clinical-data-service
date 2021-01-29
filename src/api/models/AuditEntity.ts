import { BeforeInsert, BeforeUpdate, Column } from 'typeorm';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional } from 'class-validator';

export class AuditEntity {
    @IsNotEmpty()
    @Column({
        name: 'created_by',
    })
    public createdBy: string;

    @IsOptional()
    @Column({
        name: 'last_updated_by',
        nullable: true,
    })
    public lastUpdatedBy: string;

    @IsNotEmpty()
    @Column({
        name: 'creation_date',
        type: 'bigint',
        nullable: false,
        readonly: true,
        default: () => '0',
        transformer: {
            to: (value?: Date) => (!value ? value : value.getTime()),
            from: (value?: number) => (!value ? value : new Date(value)),
        },
    })
    @Type(() => Date)
    public creationDate: Date;

    @IsOptional()
    @Column({
        name: 'last_update_date',
        type: 'bigint',
        nullable: true,
        transformer: {
            to: (value?: Date) => (!value ? value : value.getTime()),
            from: (value?: number) => (!value ? value : new Date(value)),
        },
    })
    @Type(() => Date)
    public lastUpdateDate?: Date;

    @BeforeInsert()
    public beforeCreate(): void {
        this.creationDate = new Date();
    }

    @BeforeUpdate()
    public beforeUpdate(): void {
        this.lastUpdateDate = new Date();
    }
}
