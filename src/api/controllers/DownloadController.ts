import { Authorized, Body, CurrentUser, JsonController, Post, Req, Res } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';
import { BaseController } from './BaseController';
import { Logger, LoggerInterface } from '../../decorators/Logger';
import { User } from '../models/ReferentialData';
import Papa, { UnparseConfig } from 'papaparse';
import AdmZip from 'adm-zip';
import buildQuery from '@arranger/middleware/dist/buildQuery';
import { ElasticSearchService } from '../services/ElasticSearchService';

@Authorized()
@JsonController('/download')
@OpenAPI({})
export class DownloadController extends BaseController {
    constructor(private searchService: ElasticSearchService, @Logger(__filename) private log: LoggerInterface) {
        super();
    }

    @Post('/clinical')
    @OpenAPI({
        requestBody: {
            content: {
                'application/json': {
                    example: {
                        op: 'and',
                        content: [
                            {
                                content: {
                                    field: 'biospecimen.anatomic_location',
                                    value: ['C42.0: Blood'],
                                },
                                op: 'in',
                            },
                            {
                                content: {
                                    field: 'data_type',
                                    value: ['Aligned reads'],
                                },
                                op: 'in',
                            },
                            {
                                content: {
                                    field: 'diagnoses.treatments.treatment_type',
                                    value: ['Other pharmarcotherapy'],
                                },
                                op: 'in',
                            },
                        ],
                    },
                },
            },
        },
    })
    public async downloadClinicalData(
        @Body() filters: any,
        @Req() request: any,
        @Res() response: any,
        @CurrentUser() user: User
    ): Promise<any> {
        request.setTimeout(360000);
        response.connection.setTimeout(360000);

        const nestedFields = this.findNestedFields(filters);
        const sqon = {
            nestedFields,
            filters,
        };

        const boolQuery = buildQuery(sqon);
        const files = await this.searchService.search('files', boolQuery);

        // Sort json per entity type
        const accumulator: { [key: string]: any } = {};
        this.processObjectArray('files', files, accumulator);
        this.log.debug(JSON.stringify(accumulator, undefined, 2));

        // Convert each entity list into a TSV file
        // Then zip all TSV into a single archive.
        const archive: any = await this.generateTSVArchive(accumulator);

        response.setHeader('Content-Disposition', 'attachment; filename=clinical-data.zip');
        response.setHeader('Content-Type', 'application/octet-stream');

        return response.send(archive);
    }

    private findNestedFields(sqon: any): string[] {
        const nestedFields: string[] = [];

        // Take advantage of JSON.stringify to recursively deep search for keys named "field"
        JSON.stringify(sqon, (_, nestedObject) => {
            if (nestedObject && nestedObject.field && nestedObject.field.indexOf('.') > 0) {
                nestedFields.push(nestedObject.field.substring(0, nestedObject.field.lastIndexOf('.')));
            }
            return nestedObject;
        });

        return nestedFields;
    }

    private processObjectArray(name: string, objects: any[], accumulator: { [key: string]: any }): void {
        if (!accumulator[name]) {
            accumulator[name] = [];
        }

        accumulator[name].push(
            ...objects.map((obj) => {
                const clone = {};

                Object.keys(obj).forEach((key) => {
                    if (!Array.isArray(obj[key])) {
                        clone[key] = obj[key];
                    } else {
                        this.processObjectArray(key, obj[key], accumulator);
                    }
                });

                return clone;
            })
        );
    }

    private async generateTSVArchive(
        accumulator: { [key: string]: any },
        columns: string[] = undefined
    ): Promise<Buffer> {
        const zip = new AdmZip();
        const tsvConfig: UnparseConfig = {
            delimiter: '\t',
        };

        if (columns) {
            tsvConfig.columns = columns;
        }

        Object.keys(accumulator).forEach((key) => {
            const tsv = Papa.unparse(accumulator[key], tsvConfig);
            zip.addFile(`${key}.tsv`, Buffer.from(tsv, 'utf8'));
        });

        return zip.toBuffer();
    }
}
