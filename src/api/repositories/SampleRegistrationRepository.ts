import { EntityRepository, InsertResult, ObjectLiteral, Repository } from 'typeorm';

import { SampleRegistration } from '../models/SampleRegistration';
import { getManager } from 'typeorm/index';
import { EntityManager } from 'typeorm/entity-manager/EntityManager';

@EntityRepository(SampleRegistration)
export class SampleRegistrationRepository extends Repository<SampleRegistration> {
    public findByDataSubmissionIds(ids: string[]): Promise<SampleRegistration[]> {
        return this.createQueryBuilder()
            .select()
            .where(`sampleRegistration.data_submission_id IN (${ids.map((id) => `'${id}'`).join(', ')})`)
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

    public async lookup(dataSubmissionId: number, field: string, values: string[]): Promise<any> {
        if (!values || values.length <= 0) {
            return undefined;
        }

        const entityManager: EntityManager = getManager();
        const queryValues = { dataSubmissionId };
        values.forEach((val, idx) => {
            queryValues[`var${idx}`] = val;
        });

        // NB: We do the following to prevent SQL Injection.  The "field" comes from an Enum thus it is safe.
        const [query, parameters] = await entityManager.connection.driver.escapeQueryWithParameters(
            `WITH inputs(${field}) AS (SELECT * FROM (VALUES ${Object.keys(queryValues)
                .filter((x) => 'dataSubmissionId' !== x)
                .map((v) => `(:${v})`)
                .join(',')}) AS x)
                SELECT t.${field} FROM inputs AS t ` +
                `LEFT JOIN sample_registration sr on sr.${field} = t.${field} AND sr.data_submission_id = :dataSubmissionId ` +
                `WHERE sr.${field} is null;`,
            queryValues,
            {}
        );

        return await entityManager.query(query, parameters);
    }
}
