import { Service } from 'typedi';
import { OrmRepository } from 'typeorm-typedi-extensions';

import { EventDispatcher, EventDispatcherInterface } from '../../decorators/EventDispatcher';
import { Logger, LoggerInterface } from '../../decorators/Logger';
import { DataSubmissionRepository } from '../repositories/DataSubmissionRepository';
import { DataSubmission } from '../models/DataSubmission';
import { SampleRegistrationRepository } from '../repositories/SampleRegistrationRepository';
import { SampleRegistration } from '../models/SampleRegistration';
import { TypedDataRecord } from '@overturebio-stack/lectern-client/lib/schema-entities';
import { Status, User } from '../models/ReferentialData';
import { events } from '../subscribers/events';

@Service()
export class DataSubmissionService {
    constructor(
        @OrmRepository() private dataSubmissionRepository: DataSubmissionRepository,
        @OrmRepository() private sampleRegistrationRepository: SampleRegistrationRepository,
        @EventDispatcher() private eventDispatcher: EventDispatcherInterface,
        @Logger(__filename) private log: LoggerInterface
    ) {}

    public find(): Promise<DataSubmission[]> {
        return this.dataSubmissionRepository.find({
            relations: ['registeredSamples'],
            loadEagerRelations: false,
        });
    }

    public findOne(id: number): Promise<DataSubmission | undefined> {
        return this.dataSubmissionRepository.findOne(
            { id },
            {
                relations: ['registeredSamples'],
            }
        );
    }

    public async create(dataSubmission: DataSubmission): Promise<DataSubmission> {
        const newDataSubmission = await this.dataSubmissionRepository.save(dataSubmission);

        if (dataSubmission.registeredSamples?.length > 0) {
            await this.sampleRegistrationRepository.saveAll(
                dataSubmission.registeredSamples.map((sample) => {
                    sample.dataSubmissionId = newDataSubmission.id;
                    return sample;
                })
            );
        }

        this.eventDispatcher.dispatch(events.dataSubmission.created, newDataSubmission);
        return newDataSubmission;
    }

    public async update(dataSubmission: DataSubmission): Promise<DataSubmission> {
        this.log.debug('Updating a data submission');

        // Delete all registered samples and recreate.
        await this.sampleRegistrationRepository.delete({
            dataSubmissionId: dataSubmission.id,
        });

        if (dataSubmission.registeredSamples?.length > 0) {
            await this.sampleRegistrationRepository.saveAll(
                dataSubmission.registeredSamples.map((sample) => {
                    sample.id = undefined;
                    sample.dataSubmissionId = dataSubmission.id;
                    return sample;
                })
            );
        }

        return this.dataSubmissionRepository.save(dataSubmission);
    }

    public async createOrUpdate(
        dataSubmissionId: number = NaN,
        validatedRecords: TypedDataRecord[],
        user: User
    ): Promise<DataSubmission> {
        let dataSubmission: DataSubmission;

        const registeredSamples: SampleRegistration[] = validatedRecords.map((row) => new SampleRegistration(row));

        if (!dataSubmissionId || isNaN(dataSubmissionId)) {
            dataSubmission = new DataSubmission();
            dataSubmission.status = Status.IN_PROGRESS;

            dataSubmission.createdBy = user.id;
            dataSubmission.registeredSamples = registeredSamples;
            try {
                dataSubmission = await this.create(dataSubmission);
            } catch (err) {
                return new Promise(undefined);
            }
        } else {
            dataSubmission = await this.findOne(dataSubmissionId);
            if (!dataSubmission) {
                throw new Error(`Data submission with ${dataSubmissionId} does not exist.`);
            }
            dataSubmission.lastUpdatedBy = user.id;
            dataSubmission.registeredSamples = registeredSamples;
            dataSubmission = await this.update(dataSubmission);
        }

        return dataSubmission;
    }

    public async delete(id: number): Promise<void> {
        this.log.info('Delete a data submission');
        await this.dataSubmissionRepository.delete(id);
        return;
    }
}
