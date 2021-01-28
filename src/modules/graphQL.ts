import * as express from 'express';
import { env } from '../env';
import { buildSchema } from 'type-graphql';
import Container from 'typedi';
import path from 'path';
import { getErrorCode, getErrorMessage, handlingErrors } from '../lib/graphql';
import { graphqlHTTP } from 'express-graphql';

/**
 * GraphQL API
 * ------------------------------
 */
export const configureGraphQL = async (app: express.Application): Promise<void> => {
    if (env.graphql.enabled) {
        const schema = await buildSchema({
            resolvers: env.app.dirs.resolvers,
            container: Container,
            // automatically create `schema.gql` file with schema definition in current folder
            emitSchemaFile: path.resolve(__dirname, '../api', 'schema.gql'),
        });

        handlingErrors(schema);

        // Add graphql layer to the express app
        app.use(env.graphql.route, (request: express.Request, response: express.Response) => {
            // Build GraphQLContext
            const requestId = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER); // uuid-like
            const container = Container.of(requestId); // get scoped container
            const context = { requestId, container, request, response }; // create our context
            container.set('context', context); // place context or other data in container

            // Http headers can be passed to API using the Request Headers tab
            // Headers format: { "Authorization": "Bearer eyJhb..." }
            // N.B.: Double quotes.

            // Setup GraphQL Server
            graphqlHTTP({
                schema,
                context,
                graphiql: env.graphql.editor
                    ? {
                          headerEditorEnabled: true,
                      }
                    : false,
                customFormatErrorFn: (error) => ({
                    code: getErrorCode(error.message),
                    message: getErrorMessage(error.message),
                    path: error.path,
                }),
            })(request, response);
        });
    }
};
