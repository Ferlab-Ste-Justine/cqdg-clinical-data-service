import { env } from '../../../src/env';
import Keycloak from '../../../src/auth/keycloak';
import { getAuthToken } from '../../utils/helpers';

describe('Keycloak', () => {
    test.skip('Validate user creation from token', async (done) => {
        const authToken: string = await getAuthToken();
        expect(authToken).not.toBeUndefined();

        const keycloak = Keycloak(env.auth);
        const user = await keycloak.verifyOffline(authToken);

        expect(user).not.toBeUndefined();
        expect(user.id).not.toBeUndefined();

        done();
    });
});
