import { Service } from 'typedi';
import { Logger, LoggerInterface } from '../../decorators/Logger';
import { OrmRepository } from 'typeorm-typedi-extensions';
import { SampleRegistrationRepository } from '../repositories/SampleRegistrationRepository';
import { SampleRegistration } from '../models/SampleRegistration';

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

    public async delete(id: number): Promise<void> {
        await this.sampleRegistrationRepository.delete(id);
        return;
    }
}
