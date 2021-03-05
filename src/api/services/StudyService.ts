import { Service } from 'typedi';
import { OrmRepository } from 'typeorm-typedi-extensions';

import { EventDispatcher, EventDispatcherInterface } from '../../decorators/EventDispatcher';
import { Logger, LoggerInterface } from '../../decorators/Logger';
import { StudyRepository } from '../repositories/StudyRepository';
import { Study } from '../models/Study';
import { events } from '../subscribers/events';
import { DataSubmissionService } from './DataSubmissionService';
import { FindConditions } from 'typeorm/find-options/FindConditions';
import { StorageService } from './StorageService';

@Service()
export class StudyService {
    constructor(
        private dataSubmissionService: DataSubmissionService,
        private storageService: StorageService,
        @OrmRepository() private studyRepository: StudyRepository,
        @EventDispatcher() private eventDispatcher: EventDispatcherInterface,
        @Logger(__filename) private log: LoggerInterface
    ) {}

    public findOne(id: number): Promise<Study | undefined> {
        return this.studyRepository.findOne(
            { id },
            {
                relations: ['dataSubmissions'],
            }
        );
    }

    public findBy(criteria: FindConditions<Study>, includeRelations: boolean = true): Promise<Study[] | undefined> {
        return this.studyRepository.find({
            where: criteria,
            relations: includeRelations ? ['dataSubmissions'] : [],
        });
    }

    public async create(study: Study): Promise<Study> {
        const newStudy = await this.studyRepository.save(study);

        if (study.dataSubmissions) {
            newStudy.dataSubmissions = await this.dataSubmissionService.bulkCreate(
                study.dataSubmissions.map((dataSubmission) => {
                    dataSubmission.studyId = newStudy.id;
                    return dataSubmission;
                })
            );
        }

        this.eventDispatcher.dispatch(events.study.created, newStudy);
        return newStudy;
    }

    public async delete(id: number): Promise<void> {
        this.log.info('Delete a study');

        const study: Study = await this.studyRepository.findOne(id);
        if (study) {
            await this.studyRepository.delete(id);

            try {
                await this.storageService.deleteDirectory(`clinical-data/${study.createdBy}/${study.id}-${study.code}`);
            } catch (err1) {
                // No files found - ignore.
            }
            try {
                await this.storageService.deleteDirectory(`clinical-data/${study.createdBy}/${study.id}-${study.code}`);
            } catch (err2) {
                // No files found - ignore.
            }
        }
    }
}
