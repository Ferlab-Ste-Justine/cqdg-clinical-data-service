import * as express from 'express';
import {env} from '../env';
import basicAuth from 'express-basic-auth';
import monitor from 'express-status-monitor';

/**
 * Application monitoring
 * ------------------------------
 */
export const configureMonitoring = async (app: express.Application): Promise<void> => {
    if (env.monitor.enabled) {
        app.use(monitor());
        app.get(
            env.monitor.route,
            env.monitor.username ? basicAuth({
                users: {
                    [`${env.monitor.username}`]: env.monitor.password,
                },
                challenge: true,
            }) : (req, res, next) => next(), monitor().pageRoute);
    }
};
