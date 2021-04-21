import {MigrationInterface, QueryRunner, TableUnique} from 'typeorm';

export class ModifyUniqueConstraint1618532527252 implements MigrationInterface {
    private sampleRegistrationUniqueConstraintOld = new TableUnique({
        name: 'un_submitter_sample_id',
        columnNames: ['submitter_sample_id', 'study_id'],
    });

    private sampleRegistrationUniqueConstraintNew = new TableUnique({
        name: 'un_submitter_sample_id',
        columnNames: ['submitter_sample_id', 'study_id', 'data_submission_id'],
    });

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropUniqueConstraint('sample_registration', this.sampleRegistrationUniqueConstraintOld);
        await queryRunner.createUniqueConstraint('sample_registration', this.sampleRegistrationUniqueConstraintNew);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropUniqueConstraint('sample_registration', this.sampleRegistrationUniqueConstraintNew);
    }

}
