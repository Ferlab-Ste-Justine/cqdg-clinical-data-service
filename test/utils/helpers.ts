import { env } from '../../src/env';
import axios from 'axios';

export async function getAuthToken(): Promise<string> {
    const { serverUrl, realm } = env.auth;
    const tokenUrl = `${serverUrl}/auth/realms/${realm}/protocol/openid-connect/token`;

    const params = new URLSearchParams();

    params.append('grant_type', 'client_credentials');
    params.append('client_id', env.auth.clientId);
    params.append('client_secret', env.auth.clientSecret);

    try {
        const response = await axios.post(tokenUrl, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });

        return response.data.access_token;
    } catch (err) {
        return undefined;
    }
}
