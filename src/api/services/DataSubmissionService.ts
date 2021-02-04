import { Service } from 'typedi';
import { OrmRepository } from 'typeorm-typedi-extensions';

import { EventDispatcher, EventDispatcherInterface } from '../../decorators/EventDispatcher';
import { Logger, LoggerInterface } from '../../decorators/Logger';
import { DataSubmissionRepository } from '../repositories/DataSubmissionRepository';
import { DataSubmission } from '../models/DataSubmission';
import { SampleRegistrationRepository } from '../repositories/SampleRegistrationRepository';
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

        const initialDataSubmission: DataSubmission = await this.findOne(dataSubmission.id);
        if (!initialDataSubmission) {
            throw new Error(`Data submission with ${dataSubmission.id} does not exist.`);
        }

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

    public async delete(id: number): Promise<void> {
        this.log.info('Delete a data submission');

        // Clean up all registered samples
        await this.sampleRegistrationRepository.delete({
            dataSubmissionId: id,
        });

        await this.dataSubmissionRepository.delete(id);
        return;
    }
}
