import {ExpressMiddlewareInterface, Middleware} from 'routing-controllers';
import * as express from 'express';
import helmet from 'helmet';

@Middleware({ type: 'before' })
export class SecurityMiddleware implements ExpressMiddlewareInterface {

    public use(req: express.Request, res: express.Response, next: express.NextFunction): any {
        return helmet({
            contentSecurityPolicy: false,
            hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
            },
        })(req, res, next);
    }

}
