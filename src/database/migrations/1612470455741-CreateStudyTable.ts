import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateStudyTable1614978426869 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = new Table({
            name: 'study',
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
                    name: 'code',
                    type: 'varchar',
                    length: '255',
                    isPrimary: false,
                    isNullable: false,
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
        await queryRunner.dropTable('study');
    }
}
