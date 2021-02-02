import * as express from 'express';
import { Application } from 'express';
import * as http from 'http';
import { Connection } from 'typeorm/connection/Connection';
import { createDatabaseConnection } from '../../utils/database';
import { createExpressServer } from 'routing-controllers';
import { env } from '../../../src/env';
import { authorizationChecker } from '../../../src/auth/authorizationChecker';
import { currentUserChecker } from '../../../src/auth/currentUserChecker';
import { configureIOC } from '../../../src/modules/ioc';
import { configureLogger } from '../../../src/modules/logger';
import { configureEventDispatcher } from '../../../src/modules/dispatcher';
import { spawn } from 'child_process';
import cwd from 'cwd';
import axios from 'axios';
import { sleep } from '@overturebio-stack/lectern-client/lib/utils';

export interface BootstrapSettings {
    app: Application;
    server: http.Server;
    connection: Connection;
}

export const bootstrapApp = async (): Promise<BootstrapSettings> => {
    const connection = await createDatabaseConnection();

    configureLogger();
    configureIOC();
    configureEventDispatcher();

    const expressApp: Application = createExpressServer({
        cors: true,
        classTransformer: true,
        routePrefix: env.app.routePrefix,
        defaultErrorHandler: false,
        controllers: env.app.dirs.controllers,
        middlewares: env.app.dirs.middlewares,
        interceptors: env.app.dirs.interceptors,
        authorizationChecker: authorizationChecker(connection),
        currentUserChecker: currentUserChecker(connection),
    });

    expressApp.get(env.app.routePrefix, (req: express.Request, res: express.Response) => {
        return res.json({
            name: env.app.name,
            version: env.app.version,
            description: env.app.description,
        });
    });

    const expressServer: http.Server = http.createServer(expressApp);

    return {
        app: expressApp,
        server: expressServer,
        connection: connection,
    } as BootstrapSettings;
};

export const startMinio = async (): Promise<void> => {
    process.stdout.write('Starting Minio\r\n');

    const command = 'sh ./test/startMinio.sh';
    const args = [];
    const options = {
        shell: true,
        cwd: cwd(),
    };

    spawn(command, args, options);
    await minioReady();

    process.stdout.write('Minio is ready\r\n');
};

export const stopMinio = () => {
    process.stdout.write('Stopping Minio\r\n');

    const command = 'sh ./test/stopMinio.sh';
    const args = [];
    const options = {
        shell: true,
        cwd: cwd(),
    };

    spawn(command, args, options);
};

export const minioReady = async (): Promise<void> => {
    let isReady = false;

    // No need for timeout as the Jest already has a timeout (see package-scripts.js)
    while (!isReady) {
        await sleep(1000);
        process.stdout.write('Waiting for Minio to be ready.\r\n');
        axios
            .get(`${env.s3.serviceEndpoint}/minio/health/live`)
            .then((res) => {
                isReady = true;
            })
            .catch((err) => {
                // not ready yet
            });
    }
};
