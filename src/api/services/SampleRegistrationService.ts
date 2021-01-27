import {Service} from 'typedi';
import {Logger, LoggerInterface} from '../../decorators/Logger';
import {OrmRepository} from 'typeorm-typedi-extensions';
import {SampleRegistrationRepository} from '../repositories/SampleRegistrationRepository';
import {SampleRegistration} from '../models/SampleRegistration';
import {DataSubmission} from '../models/DataSubmission';

@Service()
export class SampleRegistrationService {
    constructor(
        @OrmRepository() private sampleRegistrationRepository: SampleRegistrationRepository,
        @Logger(__filename) private log: LoggerInterface
    ) { }

    public findByDataSubmission(dataSubmission: DataSubmission): Promise<SampleRegistration[]> {
        this.log.info('Find all sampleRegistrations for dataSubmission', dataSubmission.id);
        return this.sampleRegistrationRepository.find({
            where: {
                dataSubmissionId: dataSubmission.id,
            },
        });
    }

    public findOne(id: string): Promise<SampleRegistration | undefined> {
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

    public update(id: string, sampleRegistration: SampleRegistration): Promise<SampleRegistration> {
        sampleRegistration.id = id;
        return this.sampleRegistrationRepository.save(sampleRegistration);
    }

    public async delete(id: string): Promise<void> {
        await this.sampleRegistrationRepository.delete(id);
        return;
    }
}
