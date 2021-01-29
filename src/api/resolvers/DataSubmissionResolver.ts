import { Arg, FieldResolver, Query, Resolver, Root } from 'type-graphql';
import { Service } from 'typedi';
import { DataSubmission } from '../types/DataSubmission';
import { DataSubmission as DataSubmissionModel } from '../models/DataSubmission';
import { DataSubmissionService } from '../services/DataSubmissionService';
import { SampleRegistration } from '../types/SampleRegistration';

@Service()
@Resolver((of) => DataSubmission)
export class DataSubmissionResolver {
    // https://github.com/MichalLytek/type-graphql/blob/master/docs/resolvers.md

    constructor(private dataSubmissionService: DataSubmissionService) {}

    // query{
    //     dataSubmissions{
    //         id
    //         status
    //         registeredSamples{
    //             id
    //             studyId
    //             submitterDonorId
    //             submitterBiospecimenId
    //             submitterSampleId
    //             sampleType
    //             dataSubmissionId
    //         }
    //     }
    // }
    @Query((returns) => [DataSubmission])
    public async dataSubmissions(): Promise<DataSubmission[]> {
        return this.dataSubmissionService.find();
    }

    // QUERY:
    // query findDataSubmissionById($dataSubmissionId:Float!)
    //     dataSubmission(dataSubmissionId:$dataSubmissionId){
    //         id
    //         status
    //         registeredSamples{
    //             id
    //             studyId
    //             submitterDonorId
    //             submitterBiospecimenId
    //             submitterSampleId
    //             sampleType
    //             dataSubmissionId
    //         }
    //     }
    // }
    //
    // VARIABLES:
    // {
    //     "dataSubmissionId": 1
    // }
    @Query((returns) => DataSubmission)
    public async dataSubmission(@Arg('dataSubmissionId') dataSubmissionId: number): Promise<DataSubmission> {
        return this.dataSubmissionService.findOne(dataSubmissionId);
    }

    @FieldResolver()
    public async registeredSamples(@Root() dataSubmission: DataSubmissionModel): Promise<any> {
        return dataSubmission?.registeredSamples.map((sample) => new SampleRegistration(sample));
    }
}
