import { EntityRepository, Repository } from 'typeorm';
import { Study } from '../models/Study';

@EntityRepository(Study)
export class StudyRepository extends Repository<Study> {}
