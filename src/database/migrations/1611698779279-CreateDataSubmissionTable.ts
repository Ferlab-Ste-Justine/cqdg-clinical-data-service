import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateDataSubmissionTable1611698779279 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = new Table({
            name: 'data_submission',
            columns: [
                {
                    name: 'id',
                    type: 'integer',
                    isGenerated: true,
                    generationStrategy: 'increment',
                    isPrimary: true,
                    isNullable: false,
                },
                {
                    name: 'status',
                    type: 'varchar',
                    length: '255',
                    isPrimary: false,
                    isNullable: false,
                },
                {
                    name: 'status_report',
                    type: 'json',
                    isPrimary: false,
                    isNullable: true,
                },
                {
                    name: 'creation_date',
                    type: 'bigint',
                    isPrimary: false,
                    isNullable: false,
                },
                {
                    name: 'last_update_date',
                    type: 'bigint',
                    isPrimary: false,
                    isNullable: true,
                },
                {
                    name: 'created_by',
                    type: 'varchar',
                    length: '255',
                    isPrimary: false,
                    isNullable: false,
                },
                {
                    name: 'last_updated_by',
                    type: 'varchar',
                    length: '255',
                    isPrimary: false,
                    isNullable: true,
                },
            ],
        });
        await queryRunner.createTable(table);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('data_submission');
    }
}
