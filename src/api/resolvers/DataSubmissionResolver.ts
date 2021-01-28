import { FieldResolver, Query, Resolver, Root } from 'type-graphql';
import { Service } from 'typedi';
import { DataSubmission as DataSubmissionModel } from '../models/DataSubmission';
import { DataSubmission } from '../types/DataSubmission';
import { SampleRegistrationService } from '../services/SampleRegistrationService';
import { DataSubmissionService } from '../services/DataSubmissionService';

@Service()
@Resolver((of) => DataSubmission)
export class DataSubmissionResolver {
    constructor(
        private dataSubmissionService: DataSubmissionService,
        private sampleRegistrationService: SampleRegistrationService
    ) {}

    @Query((returns) => [DataSubmission])
    public dataSubmissions(): Promise<any> {
        return this.dataSubmissionService.find();
    }

    @FieldResolver()
    public async registeredSamples(@Root() dataSubmission: DataSubmissionModel): Promise<any> {
        return this.sampleRegistrationService.findByDataSubmission(dataSubmission);
    }
}
