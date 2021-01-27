import {MigrationInterface, QueryRunner, TableForeignKey} from 'typeorm';

export class AddDataSubmissionRelationToSampleRegistration1611699026679 implements MigrationInterface {

    private tableForeignKey = new TableForeignKey({
        name: 'fk_data_submission_sample_registration',
        columnNames: ['data_submission_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'data_submission',
        onDelete: 'CASCADE',
    });

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createForeignKey('sample_registration', this.tableForeignKey);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropForeignKey('sample_registration', this.tableForeignKey);
    }

}
