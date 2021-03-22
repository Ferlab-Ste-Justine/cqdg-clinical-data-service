import { Service } from 'typedi';
import { OrmRepository } from 'typeorm-typedi-extensions';

import { EventDispatcher, EventDispatcherInterface } from '../../decorators/EventDispatcher';
import { Logger, LoggerInterface } from '../../decorators/Logger';
import { DataSubmissionRepository } from '../repositories/DataSubmissionRepository';
import { DataSubmission } from '../models/DataSubmission';
import { events } from '../subscribers/events';
import { SampleRegistrationService } from './SampleRegistrationService';
import { StudyRepository } from '../repositories/StudyRepository';
import { Study } from '../models/Study';
import { StorageService } from './StorageService';

@Service()
export class DataSubmissionService {
    constructor(
        private sampleRegistrationService: SampleRegistrationService,
        private storageService: StorageService,
        @OrmRepository() private dataSubmissionRepository: DataSubmissionRepository,
        @OrmRepository() private studyRepository: StudyRepository,
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
                relations: ['registeredSamples', 'study'],
            }
        );
    }

    public async create(dataSubmission: DataSubmission): Promise<DataSubmission> {
        const newDataSubmission = await this.dataSubmissionRepository.save(dataSubmission);

        if (dataSubmission.registeredSamples) {
            newDataSubmission.registeredSamples = await this.sampleRegistrationService.bulkCreate(
                dataSubmission.registeredSamples.map((sample) => {
                    sample.dataSubmissionId = newDataSubmission.id;
                    return sample;
                })
            );
        }

        this.eventDispatcher.dispatch(events.dataSubmission.created, newDataSubmission);
        return newDataSubmission;
    }

    public async bulkCreate(dataSubmissions: DataSubmission[]): Promise<DataSubmission[]> {
        const savedDataSubmissions: DataSubmission[] = [];

        if (dataSubmissions) {
            for (const dataSubmission of dataSubmissions) {
                savedDataSubmissions.push(await this.create(dataSubmission));
            }
        }
        return savedDataSubmissions;
    }

    public async update(dataSubmission: DataSubmission): Promise<DataSubmission> {
        this.log.debug('Updating a data submission');

        const initialDataSubmission: DataSubmission = await this.findOne(dataSubmission.id);
        if (!initialDataSubmission) {
            throw new Error(`Data submission with ${dataSubmission.id} does not exist.`);
        }

        // Delete all registered samples and recreate.
        await this.sampleRegistrationService.delete({
            dataSubmissionId: dataSubmission.id,
        });

        if (dataSubmission.registeredSamples) {
            await this.sampleRegistrationService.bulkCreate(
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

        const dataSubmission: DataSubmission = await this.dataSubmissionRepository.findOne(id);
        if (dataSubmission) {
            const study: Study = await this.studyRepository.findOne(dataSubmission.studyId);

            await this.dataSubmissionRepository.delete(id);

            try {
                await this.storageService.deleteDirectory(
                    `clinical-data/${study.createdBy}/${study.id}-${study.code}/${dataSubmission.id}`
                );
            } catch (err) {
                // No files found - ignore.
            }
        }

        return;
    }
}
