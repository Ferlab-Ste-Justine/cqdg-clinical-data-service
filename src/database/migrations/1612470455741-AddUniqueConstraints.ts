import { MigrationInterface, QueryRunner } from 'typeorm';
import { TableUnique } from 'typeorm/index';

export class AddUniqueConstraints1612470455741 implements MigrationInterface {
    private sampleRegistrationUniqueConstraint1 = new TableUnique({
        name: 'un_submitter_sample_id',
        columnNames: ['submitter_sample_id', 'study_id'],
    });

    private dataSubmissionUniqueConstraint = new TableUnique({
        name: 'un_code_per_user',
        columnNames: ['code', 'created_by'],
    });

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createUniqueConstraint('sample_registration', this.sampleRegistrationUniqueConstraint1);
        await queryRunner.createUniqueConstraint('data_submission', this.dataSubmissionUniqueConstraint);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropUniqueConstraint('sample_registration', this.sampleRegistrationUniqueConstraint1);
        await queryRunner.dropUniqueConstraint('data_submission', this.dataSubmissionUniqueConstraint);
    }
}
