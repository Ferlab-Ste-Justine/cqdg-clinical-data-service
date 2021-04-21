import { Service } from 'typedi';
import { Logger, LoggerInterface } from '../../decorators/Logger';
import { OrmRepository } from 'typeorm-typedi-extensions';
import { SampleRegistrationRepository } from '../repositories/SampleRegistrationRepository';
import { SampleRegistration } from '../models/SampleRegistration';
import { RecordValidationError } from '../controllers/responses/RecordValidationError';
import { SampleRegistrationFieldsEnum } from '../models/ReferentialData';
import { SchemaValidationErrorTypes } from '@overturebio-stack/lectern-client/lib/schema-entities';

@Service()
export class SampleRegistrationService {
    constructor(
        @OrmRepository() private sampleRegistrationRepository: SampleRegistrationRepository,
        @Logger(__filename) private log: LoggerInterface
    ) {}

    public findByDataSubmission(id: number): Promise<SampleRegistration[]> {
        this.log.debug('Find all sampleRegistrations for dataSubmission', id);
        return this.sampleRegistrationRepository.find({
            where: {
                dataSubmissionId: id,
            },
        });
    }

    public countByDataSubmission(id: number): Promise<number> {
        this.log.debug('Count sampleRegistrations for dataSubmission', id);
        return this.sampleRegistrationRepository.count({
            where: {
                dataSubmissionId: id,
            },
        });
    }

    public findOne(id: number): Promise<SampleRegistration | undefined> {
        return this.sampleRegistrationRepository.findOne({ id });
    }

    public async create(sampleRegistration: SampleRegistration): Promise<SampleRegistration> {
        return await this.sampleRegistrationRepository.save(sampleRegistration);
    }

    public async bulkCreate(sampleRegistrations: SampleRegistration[]): Promise<SampleRegistration[]> {
        return await this.sampleRegistrationRepository.save(sampleRegistrations, { chunk: 1000 });
    }

    public update(id: number, sampleRegistration: SampleRegistration): Promise<SampleRegistration> {
        sampleRegistration.id = id;
        return this.sampleRegistrationRepository.save(sampleRegistration);
    }

    public async delete(criteria: any): Promise<void> {
        await this.sampleRegistrationRepository.delete(criteria);
        return;
    }

    public async validateAgainstRegisteredSamples(
        entries: any[],
        dataSubmissionId: number
    ): Promise<RecordValidationError[]> {
        const errors: RecordValidationError[] = [];
        const entryKeys = entries ? Object.keys(entries[0]) : undefined;
        const sampleRegistrationKeys = Object.keys(SampleRegistrationFieldsEnum);

        if (!entryKeys) {
            return errors;
        }

        const intersection = sampleRegistrationKeys.filter((element) => entryKeys.includes(element));

        await Promise.all(
            entries.map(async (entry, i) => {
                const where = [];
                const andCondition: { [key: string]: any } = { dataSubmissionId };

                intersection.forEach((key) => {
                    andCondition[SampleRegistrationFieldsEnum[key]] = entries[i][key];
                });

                where.push(andCondition);

                const result = await this.sampleRegistrationRepository.find({
                    where,
                });

                if (!result || result.length === 0) {
                    const error: RecordValidationError = new RecordValidationError({});
                    error.errorType = SchemaValidationErrorTypes.INVALID_FIELD_VALUE_TYPE;
                    error.fieldName = `[${intersection.join(', ')}]`;
                    error.message = `No sample registered for : [${intersection
                        .map((key) => `${key}: ${entries[i][key]}`)
                        .join(', ')}]`;
                    error.index = i + 1;

                    errors.push(error);
                }

                return undefined;
            })
        );

        return errors;
    }
}
