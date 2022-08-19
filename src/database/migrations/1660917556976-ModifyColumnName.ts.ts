import {MigrationInterface, QueryRunner} from 'typeorm';

export class ModifyColumnName1660917556976 implements MigrationInterface {
    private tableName = 'sample_registration';
    private oldColumnName = 'submitter_donor_id';
    private newColumnName = 'submitter_participant_id';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.renameColumn(this.tableName, this.oldColumnName, this.newColumnName);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.renameColumn(this.tableName, this.newColumnName, this.oldColumnName);
    }
}
