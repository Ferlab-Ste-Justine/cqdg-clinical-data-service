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
        const newSampleRegistration = await this.sampleRegistrationRepository.save(sampleRegistration);
        return newSampleRegistration;
    }

    public async bulkCreate(sampleRegistrations: SampleRegistration[]): Promise<any> {
        const ids = await this.sampleRegistrationRepository.saveAll(sampleRegistrations);
        return ids;
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

        // Search entries for values corresponding to the columns the SampleRegistration
        for (const key of Object.keys(SampleRegistrationFieldsEnum)) {
            // Retrieve the list of values that are not in the lookup table.
            const result = await this.sampleRegistrationRepository.lookup(
                dataSubmissionId,
                key,
                entries.map((entry) => entry[key]).filter((val) => val !== undefined)
            );

            if (result) {
                const error: RecordValidationError = new RecordValidationError({});
                error.errorType = SchemaValidationErrorTypes.INVALID_FIELD_VALUE_TYPE;
                error.fieldName = key;
                error.message = `The following ${key} : (${result.map(
                    (entry) => entry[key]
                )}) are not part of the registered samples for this submission`;

                errors.push(error);
            }
        }

        return errors;
    }
}
