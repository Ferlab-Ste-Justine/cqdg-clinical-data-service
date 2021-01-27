import { Action } from 'routing-controllers';
import { Connection } from 'typeorm';
import { Logger } from '../lib/logger';
import {env} from '../env';

export function authorizationChecker(connection: Connection): (action: Action, roles: string[]) => Promise<boolean> | boolean {
    const log = new Logger(__filename);

    return async (action: Action, roles: string[]): Promise<boolean> => {
        if ( !env.auth.enabled ) {
            return true;
        }

        log.debug('[' + action.request.method + '] ' + action.request.url + ' requires roles: ' + (roles && roles.length > 0 ? roles : 'none'));
        log.debug(JSON.stringify(action.request.user, undefined, 4));

        if (action.request.user &&
            (!roles || !roles.length || roles.find(role => action.request.user.realmAccess.roles.indexOf(role) !== -1))) {
            log.debug(JSON.stringify(action.request.user, undefined, 4));
            return true;
        }

        return false;
    };
}
