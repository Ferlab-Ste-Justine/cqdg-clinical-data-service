import * as express from 'express';
import { env } from '../env';
import { getFromContainer, MetadataStorage } from 'class-validator';
import { validationMetadatasToSchemas } from 'class-validator-jsonschema';
import { defaultMetadataStorage as classTransformerMetadataStorage } from 'class-transformer/storage';
import { routingControllersToSpec } from 'routing-controllers-openapi';
import { getMetadataArgsStorage } from 'routing-controllers';
import * as swaggerUi from 'swagger-ui-express';

/**
 * Swagger
 * ------------------------------
 * Dynamic API Documentation
 */
export const configureSwagger = async (app: express.Application): Promise<void> => {
    if (env.swagger.enabled) {
        const { validationMetadatas } = getFromContainer(MetadataStorage) as any;

        const schemas = validationMetadatasToSchemas(validationMetadatas, {
            classTransformerMetadataStorage,
            refPointerPrefix: '#/components/schemas/',
        });

        const { serverUrl, realm } = env.auth;
        const tokenUrl = `${serverUrl}/realms/${realm}/protocol/openid-connect/token`;

        const swaggerFile = routingControllersToSpec(
            getMetadataArgsStorage(),
            {},
            {
                components: {
                    schemas,
                    securitySchemes: {
                        cqdgAuth: {
                            type: 'oauth2',
                            flows: {
                                clientCredentials: {
                                    tokenUrl,
                                    scopes: {},
                                },
                            },
                        },
                    },
                },
                security: [{ cqdgAuth: [] }],
            }
        );

        // Add npm infos to the swagger doc
        swaggerFile.info = {
            title: env.app.name,
            description: env.app.description,
            version: env.app.version,
        };

        swaggerFile.servers = [
            {
                url: env.isDevelopment
                    ? `${env.app.schema}://${env.app.host}:${env.app.port}${env.app.routePrefix}`
                    : `${env.app.schema}://${env.app.host}${env.app.routePrefix}`,
            },
        ];

        // We can validate config using : https://editor.swagger.io/
        // console.log(JSON.stringify(swaggerFile));

        app.use(env.swagger.route, swaggerUi.serve, swaggerUi.setup(swaggerFile));
    }
};
