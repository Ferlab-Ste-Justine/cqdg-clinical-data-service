import { Service } from 'typedi';
import { Logger, LoggerInterface } from '../../decorators/Logger';
import { StorageService } from './StorageService';
import * as dataForge from 'data-forge';
import { DataFrame } from 'data-forge';
import { entities as dictionaryEntities } from '@overturebio-stack/lectern-client';
import { selectSchema } from '../utils';
import { loadBiospecimens, loadDiagnoses, loadDonors, loadStudies } from '../dataframeUtils';
import { CQDGDictionaryEntities } from '../models/ReferentialData';
import { Engine, EngineResult } from 'json-rules-engine';
import { customOperators } from '../ruleEngineCustomOperators';
import { Cache, CacheContainer } from 'node-ts-cache';
import { MemoryStorage } from 'node-ts-cache-storage-memory';
import { env } from '../../env';

const rulesCache = new CacheContainer(new MemoryStorage());

@Service()
export class RulesService {
    constructor(private storageService: StorageService, @Logger(__filename) private log: LoggerInterface) {}

    public async fireAllRules(
        rulesVersion: string,
        userId: string,
        dataSubmissionId: number,
        schemas: dictionaryEntities.SchemasDictionary
    ): Promise<void> {
        this.log.debug('RulesService.fireAllRules');

        const rules = await this.fetchRules(schemas.version);
        if (!rules || rules.length === 0) {
            // No rules, nothing to validate.
            return;
        }

        const engine: Engine = new Engine();

        // Load rules fetched from S3
        rules.forEach((rule) => engine.addRule(rule));

        Object.keys(customOperators).forEach((key) => {
            engine.addOperator(key, customOperators[key]);
        });

        const dataframes: { [key: string]: DataFrame<number, any> } = await this.loadDataFrames(
            userId,
            dataSubmissionId,
            schemas
        );

        if (!this.validateAllDataSubmitted(dataframes)) {
            throw new Error('Cannot proceed to validation.  Missing data.');
        }

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

        for (const study of studies) {
            const facts = {
                study,
            };

            const result: EngineResult = await engine.run(facts);
            this.log.info(`Rules validation errors : ${JSON.stringify(result.failureResults, undefined, 2)}`);
        }
    }

    private async loadDataFrames(
        userId: string,
        dataSubmissionId: number,
        schemas: dictionaryEntities.SchemasDictionary
    ): Promise<{ [key: string]: DataFrame<number, any> }> {
        const dataframes: { [key: string]: DataFrame<number, any> } = {};
        const files: string[] = await this.storageService.listFiles(`clinical-data/${userId}.tmp/${dataSubmissionId}`);

        for (const file of files) {
            try {
                const filename = file.indexOf('/') > 0 ? file.substring(file.lastIndexOf('/') + 1, file.length) : file;
                const schemaName: string = await selectSchema(filename, schemas);
                const content = await this.storageService.readAsString(file);
                const df = dataForge.fromCSV(content);

                dataframes[schemaName.toLowerCase()] = df;
            } catch (err) {
                this.log.error(`Failed to load file ${file}.\n\r${err}`);
            }
        }

        return dataframes;
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
}
