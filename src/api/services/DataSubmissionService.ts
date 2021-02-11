import { Service } from 'typedi';
import { OrmRepository } from 'typeorm-typedi-extensions';

import { EventDispatcher, EventDispatcherInterface } from '../../decorators/EventDispatcher';
import { Logger, LoggerInterface } from '../../decorators/Logger';
import { DataSubmissionRepository } from '../repositories/DataSubmissionRepository';
import { DataSubmission } from '../models/DataSubmission';
import { events } from '../subscribers/events';
import { entities as dictionaryEntities } from '@overturebio-stack/lectern-client';
import { SingleFileValidationStatus } from '../controllers/responses/SingleFileValidationStatus';
import { BatchProcessingResult } from '@overturebio-stack/lectern-client/lib/schema-entities';
import { RecordValidationError } from '../controllers/responses/RecordValidationError';
import { LecternService } from './LecternService';
import { SampleRegistrationService } from './SampleRegistrationService';
import { parse } from 'papaparse';
import { selectSchema } from '../utils';

@Service()
export class DataSubmissionService {
    constructor(
        private lecternService: LecternService,
        private sampleRegistrationService: SampleRegistrationService,
        @OrmRepository() private dataSubmissionRepository: DataSubmissionRepository,
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
            await this.sampleRegistrationService.bulkCreate(
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
        await this.sampleRegistrationService.delete({
            dataSubmissionId: dataSubmission.id,
        });

        if (dataSubmission.registeredSamples?.length > 0) {
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

        // Clean up all registered samples
        await this.sampleRegistrationService.delete({
            dataSubmissionId: id,
        });

        await this.dataSubmissionRepository.delete(id);
        return;
    }

    public async validateFile(
        file: Express.Multer.File,
        schemas: dictionaryEntities.SchemasDictionary,
        dataSubmissionId: number
    ): Promise<SingleFileValidationStatus> {
        const singleFileValidationStatus: SingleFileValidationStatus = new SingleFileValidationStatus();
        singleFileValidationStatus.filename = file.originalname;
        singleFileValidationStatus.validationErrors = [];

        const schemaForCurrentFile = await selectSchema(file.originalname, schemas);
        singleFileValidationStatus.schemaName = schemaForCurrentFile;

        const entries: any[] = parse(file.buffer.toString('utf-8'), {
            delimiter: '\t',
            header: true,
            skipEmptyLines: true,
        }).data;

        const lecternValidation: Promise<BatchProcessingResult> = this.lecternService.validateRecords(
            schemaForCurrentFile,
            entries,
            schemas
        );
        let unregisteredDataValidation: Promise<RecordValidationError[]> = Promise.resolve([]);

        if (dataSubmissionId) {
            unregisteredDataValidation = this.sampleRegistrationService.validateAgainstRegisteredSamples(
                entries,
                dataSubmissionId
            );
        }

        await Promise.all([unregisteredDataValidation, lecternValidation]).then((values) => {
            // Sample registration lookup results
            if (values[0]) {
                singleFileValidationStatus.validationErrors.push(...values[0]);
            }

            // Lectern validation results
            singleFileValidationStatus.processedRecords = values[1]?.processedRecords || [];

            if (values[1]?.validationErrors?.length > 0) {
                singleFileValidationStatus.validationErrors.push(
                    values[1].validationErrors.map((err) => new RecordValidationError(err))
                );
            }
        });

        return singleFileValidationStatus;
    }
}
