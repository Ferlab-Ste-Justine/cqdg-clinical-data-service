import { env } from '../../../src/env';
import axios from 'axios';
import Keycloak from '../../../src/auth/keycloak';

describe('Keycloak', () => {
    test.skip('Validate user creation from token', async (done) => {
        const { serverUrl, realm } = env.auth;
        const tokenUrl = `${serverUrl}/auth/realms/${realm}/protocol/openid-connect/token`;

        const params = new URLSearchParams();

        params.append('grant_type', 'client_credentials');
        params.append('client_id', env.auth.clientId);
        params.append('client_secret', env.auth.testClientSecret);

        const response = await axios.post(tokenUrl, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });

        expect(response.data.access_token).not.toBeUndefined();

        const keycloak = Keycloak(env.auth);
        const user = await keycloak.verifyOffline(response.data.access_token);

        expect(user).not.toBeUndefined();
        expect(user.id).not.toBeUndefined();

        done();
    });
});
