import 'reflect-metadata';
import * as express from 'express';
import { createExpressServer } from 'routing-controllers';

import { configureLogger } from './modules/logger';

import { env } from './env';
import { banner } from './lib/banner';
import { Logger } from './lib/logger';
import { configureSwagger } from './modules/swagger';
import { configureIOC } from './modules/ioc';
import { configureEventDispatcher } from './modules/dispatcher';
import { getDBConnection } from './modules/dbConnection';
import { configureMonitoring } from './modules/monitoring';
import { configureStaticResourcesHandler } from './modules/staticResources';
import { configureAPIVersion } from './modules/version';
import { configureGraphQL } from './modules/graphQL';
import { currentUserChecker } from './auth/currentUserChecker';
import { authorizationChecker } from './auth/authorizationChecker';

const log = new Logger(__filename);

configureLogger();
configureIOC();
configureEventDispatcher();

/**
 * Express App Server
 * ------------------------------
 */
getDBConnection()
    .then(async (connection) => {
        const app: express.Application = createExpressServer({
            cors: true,
            classTransformer: true,
            routePrefix: env.app.routePrefix,
            defaultErrorHandler: false,

            controllers: env.app.dirs.controllers,
            middlewares: env.app.dirs.middlewares,
            // interceptors: env.app.dirs.interceptors,

            authorizationChecker: authorizationChecker(connection),
            currentUserChecker: currentUserChecker(connection),
        });

        await configureSwagger(app);
        await configureMonitoring(app);
        await configureAPIVersion(app);
        await configureStaticResourcesHandler(app);
        await configureGraphQL(app);

        // Run application to listen on given port
        if (!env.isTest) {
            const server = app.listen(env.app.port);

            // Shutdown gracefully
            process.on('SIGTERM', () => {
                log.debug('SIGTERM signal received: shutting down Express server');
                server.close(() => {
                    connection.close();
                });
            });
        }
    })
    .then(() => banner(log))
    .catch((error) => console.log('\x1b[31m%s\x1b[0m', JSON.stringify(error, undefined, 2)));
