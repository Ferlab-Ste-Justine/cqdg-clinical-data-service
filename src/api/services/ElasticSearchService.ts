import { Service } from 'typedi';
import { Logger, LoggerInterface } from '../../decorators/Logger';
import { Client } from '@elastic/elasticsearch';
import { env } from '../../env';

@Service()
export class ElasticSearchService {
    private client: Client;

    constructor(@Logger(__filename) private log: LoggerInterface) {
        this.client = new Client({
            nodes: env.es.hosts,
        });
    }

    public async search(index: string, query: any): Promise<any[]> {
        const results = [];

        this.log.debug(`Searching index ${index} with query: \n${JSON.stringify(query, undefined, 2)}`);

        const scrollSearch = this.client.helpers.scrollSearch({
            index,
            body: {
                query,
            },
        });

        for await (const result of scrollSearch) {
            results.push(...result.documents);
        }

        return results;
    }
}
