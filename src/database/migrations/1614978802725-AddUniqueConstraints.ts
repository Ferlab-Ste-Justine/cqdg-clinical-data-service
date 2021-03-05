import { MigrationInterface, QueryRunner, TableUnique } from 'typeorm';

export class AddUniqueConstraints1614978802725 implements MigrationInterface {
    private sampleRegistrationUniqueConstraint1 = new TableUnique({
        name: 'un_submitter_sample_id',
        columnNames: ['submitter_sample_id', 'study_id'],
    });

    private studyUniqueConstraint = new TableUnique({
        name: 'un_code_per_user',
        columnNames: ['code', 'created_by'],
    });

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createUniqueConstraint('sample_registration', this.sampleRegistrationUniqueConstraint1);
        await queryRunner.createUniqueConstraint('study', this.studyUniqueConstraint);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropUniqueConstraint('sample_registration', this.sampleRegistrationUniqueConstraint1);
        await queryRunner.dropUniqueConstraint('study', this.studyUniqueConstraint);
    }
}
