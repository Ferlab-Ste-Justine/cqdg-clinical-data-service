import * as express from 'express';
import {Application} from 'express';
import * as http from 'http';
import {Connection} from 'typeorm/connection/Connection';
import {createDatabaseConnection} from '../../utils/database';
import {createExpressServer} from "routing-controllers";
import {env} from "../../../src/env";
import {authorizationChecker} from "../../../src/auth/authorizationChecker";
import {currentUserChecker} from "../../../src/auth/currentUserChecker";
import {configureIOC} from "../../../src/modules/ioc";
import {configureLogger} from "../../../src/modules/logger";
import {configureEventDispatcher} from "../../../src/modules/dispatcher";

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

    expressApp.get(
        env.app.routePrefix,
        (req: express.Request, res: express.Response) => {
            return res.json({
                name: env.app.name,
                version: env.app.version,
                description: env.app.description,
            });
        }
    );

    const expressServer: http.Server = http.createServer(expressApp);

    return {
        app: expressApp,
        server: expressServer,
        connection: connection,
    } as BootstrapSettings;
};
