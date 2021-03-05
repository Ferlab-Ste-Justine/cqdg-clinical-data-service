import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';

export class AddStudyAndDataSubmissionFK1614979276045 implements MigrationInterface {
    private dataSubmissionForeignKey = new TableForeignKey({
        name: 'fk_data_submission_sample_registration',
        columnNames: ['data_submission_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'data_submission',
        onDelete: 'CASCADE',
    });

    private studyForeignKey = new TableForeignKey({
        name: 'fk_study_data_submission',
        columnNames: ['study_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'study',
        onDelete: 'CASCADE',
    });

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createForeignKey('sample_registration', this.dataSubmissionForeignKey);
        await queryRunner.createForeignKey('data_submission', this.studyForeignKey);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropForeignKey('sample_registration', this.dataSubmissionForeignKey);
        await queryRunner.dropForeignKey('data_submission', this.dataSubmissionForeignKey);
    }
}
