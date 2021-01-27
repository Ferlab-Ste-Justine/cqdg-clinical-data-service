import { Action } from 'routing-controllers';
import { Connection } from 'typeorm';
import {User} from '../api/models/ReferentialData';

// Used by @CurrentUser annotation to inject user like :
//      public find(@CurrentUser() user?: User): Promise<Pet[]>
export function currentUserChecker(connection: Connection): (action: Action) => Promise<User | undefined> {
    return async (action: Action): Promise<User | undefined> => {
        // User is set on request in the AuthorizationMiddleware
        return action.request.user;
    };
}
