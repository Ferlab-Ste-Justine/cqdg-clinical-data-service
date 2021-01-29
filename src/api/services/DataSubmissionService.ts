import { Service } from 'typedi';
import { OrmRepository } from 'typeorm-typedi-extensions';

import { EventDispatcher, EventDispatcherInterface } from '../../decorators/EventDispatcher';
import { Logger, LoggerInterface } from '../../decorators/Logger';
import { events } from '../subscribers/events';
import { DataSubmissionRepository } from '../repositories/DataSubmissionRepository';
import { DataSubmission } from '../models/DataSubmission';
import { SampleRegistrationRepository } from '../repositories/SampleRegistrationRepository';

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

    public update(dataSubmission: DataSubmission): Promise<DataSubmission> {
        this.log.info('Update a data submission');
        return this.dataSubmissionRepository.save(dataSubmission);
    }

    public async delete(id: number): Promise<void> {
        this.log.info('Delete a data submission');
        await this.dataSubmissionRepository.delete(id);
        return;
    }
}
