import { ExpressMiddlewareInterface, HttpError, Middleware } from 'routing-controllers';
import * as express from 'express';
import { env } from '../../env';
import { findIndex } from 'lodash';
import Keycloak from '../../auth/keycloak';
import { Logger } from '../../lib/logger';

// The following is required when using a local instance of KeyCloak which uses self-signed certificates
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

@Middleware({ type: 'before' })
export class AuthorizationMiddleware implements ExpressMiddlewareInterface {
    private log = new Logger(__filename);

    private keycloak = Keycloak(env.auth);
    private exclusions = [
        { methods: ['*'], path: env.swagger.route },
        { methods: ['*'], path: env.monitor.route },
        { methods: ['GET'], path: '/socket.io' },
        { methods: ['GET'], path: '/favicon.ico' },
        { methods: ['GET'], path: env.graphql.route },
        { methods: ['GET'], path: env.app.routePrefix, exact: true },
    ];

    public use(req: any, res: any, next: express.NextFunction): any {
        const accessToken: string = req.headers.authorization;

        const route = {
            method: req.method,
            path: req.originalUrl,
        };
        const excluded = this.isExcluded(route);

        if (env.auth.enabled && route && !excluded) {
            this.keycloak
                .verifyOffline(accessToken && accessToken.indexOf(' ') > -1 ? accessToken.split(' ')[1] : '')
                .then((user) => {
                    req.user = user;
                    return next();
                })
                .catch((err) => {
                    this.log.error(err);
                    this.log.error('Unauthorized [' + req.method + '] to: ' + req.url);
                    // Token expired or is invalid
                    res.status(403).send(new HttpError(403, 'Forbidden'));
                });
        } else {
            return next();
        }
    }

    private isExcluded(route: any): boolean {
        const excluded = findIndex(this.exclusions, (exclusion) => {
            if (route.path.indexOf(exclusion.path) > -1) {
                if (true === exclusion.exact) {
                    return (
                        route.path === exclusion.path &&
                        (exclusion.methods.includes(route.method) || exclusion.methods.includes('*'))
                    );
                }
                return exclusion.methods.includes(route.method) || exclusion.methods.includes('*');
            }
            return false;
        });

        return excluded > -1;
    }
}
