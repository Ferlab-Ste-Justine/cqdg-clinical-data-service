import * as express from 'express';
import {env} from '../env';

/**
 * API Version
 * ------------------------------
 */
export const configureAPIVersion = async (app: express.Application): Promise<void> => {
    app.get(
        env.app.routePrefix,
        (req: express.Request, res: express.Response) => {
            return res.json({
                name: env.app.name,
                version: env.app.version,
                description: env.app.description,
            });
        }
    );
};
