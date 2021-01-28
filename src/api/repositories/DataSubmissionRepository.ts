import { EntityRepository, Repository } from 'typeorm';

import { DataSubmission } from '../models/DataSubmission';

@EntityRepository(DataSubmission)
export class DataSubmissionRepository extends Repository<DataSubmission> {}
