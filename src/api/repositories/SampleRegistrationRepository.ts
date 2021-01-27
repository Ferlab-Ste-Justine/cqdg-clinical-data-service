import {EntityRepository, InsertResult, ObjectLiteral, Repository} from 'typeorm';

import {SampleRegistration} from '../models/SampleRegistration';

@EntityRepository(SampleRegistration)
export class SampleRegistrationRepository extends Repository<SampleRegistration> {

    public findByDataSubmissionIds(ids: string[]): Promise<SampleRegistration[]> {
        return this.createQueryBuilder()
            .select()
            .where(`sampleRegistration.data_submission_id IN (${ids.map(id => `'${id}'`).join(', ')})`)
            .getMany();
    }

    public async saveAll(sampleRegistrations: SampleRegistration[]): Promise<ObjectLiteral[]> {
        const result: InsertResult = await this.createQueryBuilder()
            .insert()
            .into(SampleRegistration)
            .values(sampleRegistrations)
            .execute();

        return result.identifiers;
    }

}
