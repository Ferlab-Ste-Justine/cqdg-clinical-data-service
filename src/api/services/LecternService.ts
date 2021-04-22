import {
    entities as dictionaryEntities,
    parallel,
} from '@overturebio-stack/lectern-client';
import { Service } from 'typedi';
import { Logger, LoggerInterface } from '../../decorators/Logger';
import axios, { AxiosResponse } from 'axios';
import { env } from '../../env';
import { Cache, CacheContainer } from 'node-ts-cache';
import { MemoryStorage } from 'node-ts-cache-storage-memory';
import { BatchProcessingResult, SchemaProcessingResult } from '@overturebio-stack/lectern-client/lib/schema-entities';

const dictionaryCache = new CacheContainer(new MemoryStorage());

@Service()
export class LecternService {
    constructor(@Logger(__filename) private log: LoggerInterface) {}

    // Do not cache the return from this method
    public async fetchLatestDictionary(language: string): Promise<dictionaryEntities.SchemasDictionary> {
        const name = `${env.lectern.dictionaryName} ${language}`.trim();
        const token: string = this.getLecternAuthToken();

        const versions: AxiosResponse = await axios.get(`${env.lectern.serverUrl}/dictionaries`, {
            headers: {
                Authorization: `Basic ${token}`,
            },
        });

        let latestVersion;

        if (versions && versions.data) {
            try {
                latestVersion = versions.data
                    .filter((d) => name === d.name)
                    .sort((a, b) => {
                        const versionA = parseFloat(a.version);
                        const versionB = parseFloat(b.version);

                        if (versionA < versionB) {
                            return 1;
                        }
                        if (versionA > versionB) {
                            return -1;
                        }
                        return 0;
                    })[0].version;
            } catch (err) {
                throw Error(
                    `No schemas available at ${env.lectern.serverUrl}/dictionaries for dictionary named ${name}`
                );
            }
        } else {
            throw Error(`No schemas available at ${env.lectern.serverUrl}/dictionaries`);
        }

        return this.fetchDictionary(name, latestVersion);
    }

    @Cache(dictionaryCache, { isCachedForever: true })
    public async fetchDictionary(name: string, version: string): Promise<dictionaryEntities.SchemasDictionary> {
        const token: string = this.getLecternAuthToken();
        const url = `${env.lectern.serverUrl}/dictionaries?version=${version}&name=${name}`;

        const dict = await axios.get(url, {
            headers: {
                Authorization: `Basic ${token}`,
            },
        });

        return dict.data[0];
    }

    public async validateRecords(
        schemaName: string,
        records: ReadonlyArray<dictionaryEntities.DataRecord>,
        schemasDictionary?: dictionaryEntities.SchemasDictionary,
        indexOffset: number = 0
    ): Promise<dictionaryEntities.BatchProcessingResult> {
        if (!schemasDictionary) {
            throw new Error('No schemas provided.');
        }

        try {
            const batchProcessingResult: BatchProcessingResult = {
                validationErrors: [],
                processedRecords: [],
            };

            await Promise.all(
                records.map(async (record, index) => {

                    // rowIds => +2 because index starts at 0 and there is the header row
                    const rowIdx = index + indexOffset + 2;

                    const schemaProcessingResult: SchemaProcessingResult = await parallel.processRecord(
                        schemasDictionary,
                        schemaName,
                        record,
                        rowIdx
                    );
                    if (schemaProcessingResult.validationErrors) {
                        batchProcessingResult.validationErrors.push(...schemaProcessingResult.validationErrors);
                    }
                    if (schemaProcessingResult.processedRecord) {
                        batchProcessingResult.processedRecords.push(schemaProcessingResult.processedRecord);
                    }

                    return undefined;
                })
            );

            return batchProcessingResult;
        } catch (err) {
            this.log.error(err);
            throw err;
        }
    }

    private getLecternAuthToken(): string {
        const token = Buffer.from(`${env.lectern.username}:${env.lectern.password}`, 'utf8').toString('base64');
        return token;
    }
}
