import { Service } from 'typedi';
import { StorageService } from './StorageService';
import { Logger, LoggerInterface } from '../../decorators/Logger';
import * as dataForge from 'data-forge';
import { DataFrame } from 'data-forge';
import { RulesService } from './RulesService';
import { entities as dictionaryEntities } from '@overturebio-stack/lectern-client';
import { Cache, CacheContainer } from 'node-ts-cache';
import { env } from '../../env';
import { MemoryStorage } from 'node-ts-cache-storage-memory';
import { CQDGDictionaryEntities } from '../models/ReferentialData';
import { selectSchema } from '../utils';
import { loadBiospecimens, loadDiagnoses, loadDonors, loadStudies } from '../dataframeUtils';
import { ValidationReport } from '../controllers/responses/ValidationReport';
import { RecordValidationError } from '../controllers/responses/RecordValidationError';
import {
    BatchProcessingResult,
    SchemaValidationErrorTypes,
} from '@overturebio-stack/lectern-client/lib/schema-entities';
import { SingleFileValidationStatus } from '../controllers/responses/SingleFileValidationStatus';
import { parse } from 'papaparse';
import { SampleRegistrationService } from './SampleRegistrationService';
import { LecternService } from './LecternService';
import { StudyService } from './StudyService';
import { DataSubmission } from '../models/DataSubmission';
import { Study } from '../models/Study';

const rulesCache = new CacheContainer(new MemoryStorage());

@Service()
export class ValidationService {
    constructor(
        private storageService: StorageService,
        private studyService: StudyService,
        private rulesService: RulesService,
        private sampleRegistrationService: SampleRegistrationService,
        private lecternService: LecternService,
        @Logger(__filename) private log: LoggerInterface
    ) {}

    public async validateAll(
        dataSubmission: DataSubmission,
        schemas: dictionaryEntities.SchemasDictionary
    ): Promise<ValidationReport> {
        const report = new ValidationReport();
        report.globalValidationErrors = [];
        report.files = [];
        report.errors = [];

        const study: Study = await this.studyService.findOne(dataSubmission.studyId);

        // Launch custom rules validation
        const rules = await this.fetchRules(schemas.version);

        const dataframes: { [key: string]: DataFrame<number, any> } = {};

        const files: string[] = await this.storageService.listFiles(
            `clinical-data/${study.createdBy}/${study.id}-${study.code}/${dataSubmission.id}`
        );

        // Re-run all Lectern validations
        // And while we are loop on the files, load them into dataframes for further validations.
        for (const file of files) {
            try {
                const filename = file.indexOf('/') > 0 ? file.substring(file.lastIndexOf('/') + 1, file.length) : file;
                const schemaName: string = await selectSchema(filename, schemas);
                const content = await this.storageService.readAsString(file);

                const entries: any[] = parse(content, {
                    delimiter: '\t',
                    header: true,
                    skipEmptyLines: true,
                }).data;

                const singleFileValidationStatus: SingleFileValidationStatus = await this.validateFileEntries(
                    dataSubmission.id,
                    schemaName,
                    filename,
                    entries,
                    schemas
                );

                report.files.push(singleFileValidationStatus);

                // Load files into dataframes for rules testing + orphan validations.
                const df = dataForge.fromCSV(content);
                dataframes[schemaName.toLowerCase()] = df;
            } catch (err) {
                this.log.error(`Failed to load file ${file}.\n\r${err}`);
            }
        }

        if (!this.validateAllDataSubmitted(dataframes)) {
            throw new Error('Cannot proceed to validation.  Missing data.');
        }

        report.globalValidationErrors.push(
            ...(await this.findOrphans(
                dataframes[CQDGDictionaryEntities.DIAGNOSIS],
                dataframes[CQDGDictionaryEntities.TREATMENT],
                'submitter_diagnosis_id',
                CQDGDictionaryEntities.TREATMENT
            ))
        );
        report.globalValidationErrors.push(
            ...(await this.findOrphans(
                dataframes[CQDGDictionaryEntities.DIAGNOSIS],
                dataframes[CQDGDictionaryEntities.FOLLOW_UP],
                'submitter_diagnosis_id',
                CQDGDictionaryEntities.FOLLOW_UP
            ))
        );
        report.globalValidationErrors.push(
            ...(await this.findOrphans(
                dataframes[CQDGDictionaryEntities.DONOR],
                dataframes[CQDGDictionaryEntities.BIOSPECIMEN],
                'submitter_donor_id',
                CQDGDictionaryEntities.BIOSPECIMEN
            ))
        );
        report.globalValidationErrors.push(
            ...(await this.findOrphans(
                dataframes[CQDGDictionaryEntities.DONOR],
                dataframes[CQDGDictionaryEntities.DIAGNOSIS],
                'submitter_donor_id',
                CQDGDictionaryEntities.DIAGNOSIS
            ))
        );
        report.globalValidationErrors.push(
            ...(await this.findOrphans(
                dataframes[CQDGDictionaryEntities.DONOR],
                dataframes[CQDGDictionaryEntities.FAMILY_RELATIONSHIP],
                'submitter_family_id',
                CQDGDictionaryEntities.FAMILY_RELATIONSHIP
            ))
        );
        report.globalValidationErrors.push(
            ...(await this.findOrphans(
                dataframes[CQDGDictionaryEntities.DONOR],
                dataframes[CQDGDictionaryEntities.FAMILY_HISTORY],
                'submitter_donor_id',
                CQDGDictionaryEntities.FAMILY_HISTORY
            ))
        );
        report.globalValidationErrors.push(
            ...(await this.findOrphans(
                dataframes[CQDGDictionaryEntities.DONOR],
                dataframes[CQDGDictionaryEntities.EXPOSURE],
                'submitter_donor_id',
                CQDGDictionaryEntities.EXPOSURE
            ))
        );

        if (rules) {
            const biospecimenWithDeps = loadBiospecimens(
                dataframes[CQDGDictionaryEntities.BIOSPECIMEN],
                dataframes[CQDGDictionaryEntities.SAMPLE_REGISTRATION]
            );
            const diagnosesWithDeps = loadDiagnoses(
                dataframes[CQDGDictionaryEntities.DIAGNOSIS],
                dataframes[CQDGDictionaryEntities.TREATMENT],
                dataframes[CQDGDictionaryEntities.FOLLOW_UP]
            );
            const donorsWithDeps = loadDonors(
                dataframes[CQDGDictionaryEntities.DONOR],
                biospecimenWithDeps,
                dataframes[CQDGDictionaryEntities.FAMILY_RELATIONSHIP],
                dataframes[CQDGDictionaryEntities.FAMILY_HISTORY],
                dataframes[CQDGDictionaryEntities.EXPOSURE],
                diagnosesWithDeps
            );

            const studies = loadStudies(dataframes[CQDGDictionaryEntities.STUDY], donorsWithDeps).toArray();
            const facts = [];

            for (const st of studies) {
                facts.push({
                    st,
                });
            }

            report.globalValidationErrors.push(...(await this.rulesService.fireAllRules(rules, facts)));
        }

        return report;
    }

    public async validateFile(
        file: Express.Multer.File,
        schemas: dictionaryEntities.SchemasDictionary,
        dataSubmissionId: number,
        errorTreshold: number
    ): Promise<SingleFileValidationStatus> {
        const schemaForCurrentFile = await selectSchema(file.originalname, schemas);

        const entries: any[] = parse(file.buffer.toString('utf-8'), {
            delimiter: '\t',
            header: true,
            skipEmptyLines: true,
        }).data;

        const chunkSize = 10;
        const chunks: any[] = entries.reduce((acc, e, i) => (i % chunkSize ? acc[acc.length - 1].push(e) : acc.push([e]), acc), []);
        const results: SingleFileValidationStatus[] = [];

        let nbOfErrors = 0;
        let indexOffset = 0;

        for (const chunk of chunks) {
            if (nbOfErrors < errorTreshold) {
                const chunkValidationStatus: SingleFileValidationStatus = await this.validateFileEntries(
                    dataSubmissionId,
                    schemaForCurrentFile,
                    file.originalname,
                    chunk,
                    schemas,
                    indexOffset
                );

                results.push(chunkValidationStatus);

                indexOffset += chunk.length;
                nbOfErrors += (chunkValidationStatus.validationErrors || []).length;
            }
        }

        const accumulator = new SingleFileValidationStatus();
        accumulator.processedRecords = [];
        accumulator.validationErrors = [];

        const reducer = (acc: SingleFileValidationStatus, item: SingleFileValidationStatus) => {
            acc.validationErrors.push(...item.validationErrors);
            acc.processedRecords.push(...item.processedRecords);
            acc.filename = item.filename;
            acc.schemaName = item.schemaName;
            return acc;
        };

        return results.reduce(reducer, accumulator);
    }

    public async validateFileEntries(
        dataSubmissionId: number,
        schemaForCurrentFile: string,
        filename: string,
        entries: any[],
        schemas: dictionaryEntities.SchemasDictionary,
        indexOffset: number = 0
    ): Promise<SingleFileValidationStatus> {
        const singleFileValidationStatus: SingleFileValidationStatus = new SingleFileValidationStatus();
        singleFileValidationStatus.filename = filename;
        singleFileValidationStatus.validationErrors = [];
        singleFileValidationStatus.schemaName = schemaForCurrentFile;

        const lecternValidation: Promise<BatchProcessingResult> = this.lecternService.validateRecords(
            schemaForCurrentFile,
            entries,
            schemas,
            indexOffset
        );
        let unregisteredDataValidation: Promise<RecordValidationError[]> = Promise.resolve([]);

        if (dataSubmissionId) {
            unregisteredDataValidation = this.sampleRegistrationService.validateAgainstRegisteredSamples(
                entries,
                dataSubmissionId,
                indexOffset
            );
        }

        const [unregisteredDataValidationResult, lecternValidationResult] = await Promise.all([
            unregisteredDataValidation,
            lecternValidation,
        ]);

        // Sample registration lookup results
        if (unregisteredDataValidationResult) {
            singleFileValidationStatus.validationErrors.push(...unregisteredDataValidationResult);
        }

        // Lectern validation results
        singleFileValidationStatus.processedRecords =
            (lecternValidationResult && lecternValidationResult.processedRecords) || [];

        if (
            lecternValidationResult &&
            lecternValidationResult.validationErrors &&
            lecternValidationResult.validationErrors.length > 0
        ) {
            singleFileValidationStatus.validationErrors.push(
                ...lecternValidationResult.validationErrors.map((err) => new RecordValidationError(err))
            );
        }

        return singleFileValidationStatus;
    }

    public async findOrphans(
        parent: DataFrame,
        children: DataFrame,
        joinKey: string,
        entityType: CQDGDictionaryEntities
    ): Promise<RecordValidationError[]> {
        this.log.info('Return a list of orphan children');
        const validationErrors: RecordValidationError[] = [];

        if (!parent || !children) {
            return validationErrors;
        }

        const orphans = parent
            .joinOuterRight(
                children,
                (left) => left[joinKey],
                (right) => right[joinKey],
                (left, right) => {
                    return left ? {} : right;
                }
            )
            .where((column) => {
                return Object.keys(column).length > 0;
            })
            .toArray();

        if (orphans) {
            orphans.forEach((orphan) => {
                const error = new RecordValidationError({});
                error.fieldName = joinKey;
                error.errorType = SchemaValidationErrorTypes.INVALID_FIELD_VALUE_TYPE;
                error.message = `Orphan record of type ${entityType} was found.`;
                error.info = orphan;

                validationErrors.push(error);
            });
        }

        return validationErrors;
    }

    @Cache(rulesCache, { isCachedForever: true })
    private async fetchRules(dictionaryVersion: string): Promise<any[]> {
        const rules = [];
        const files: string[] = await this.storageService.listFiles(`${env.rules.location}/${dictionaryVersion}`);

        for (const file of files) {
            try {
                const contentStr = await this.storageService.readAsString(file);
                if (contentStr) {
                    const contentObj = JSON.parse(contentStr);
                    if (contentObj instanceof Array) {
                        contentObj.forEach((rule) => rules.push(rule));
                    } else {
                        rules.push(contentObj);
                    }
                }
            } catch (err) {
                this.log.error(`Failed to load rule file ${file}.\n\r${err}`);
            }
        }

        return rules;
    }

    private validateAllDataSubmitted(dataframes: { [key: string]: DataFrame<number, any> }): boolean {
        const includesAll = (arr, target) => target.every((v) => arr.includes(v));
        const keys = Object.keys(dataframes) || [];

        return (
            includesAll(keys, [
                CQDGDictionaryEntities.STUDY,
                CQDGDictionaryEntities.DONOR,
                CQDGDictionaryEntities.BIOSPECIMEN,
            ]) &&
            (keys.includes(CQDGDictionaryEntities.PHENOTYPE) || keys.includes(CQDGDictionaryEntities.DIAGNOSIS))
        );
    }
}
