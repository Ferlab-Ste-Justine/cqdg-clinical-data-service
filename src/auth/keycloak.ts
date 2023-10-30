import axios from 'axios';
import { path, find, compose, flip, curryN } from 'ramda';
import jwt from 'jsonwebtoken';
import jwkToPem from 'jwk-to-pem';
import { CacheContainer } from 'node-ts-cache';
import { MemoryStorage } from 'node-ts-cache-storage-memory';
import { env } from '../env';
import { Logger } from '../lib/logger';
import { User, KeycloakUser } from '../api/models/ReferentialData';

const log = new Logger(__filename);
const cacheTTL = env.app.cacheCertTTLInSeconds;
const certificatesCache = new CacheContainer(new MemoryStorage());

const makeUser = (json: KeycloakUser) => new User(json);

const verify = curryN(2)(jwt.verify);

const isTheRightKid = (kid) => (publicKey) => publicKey.kid === kid;

const findPublicKeyFromKid = (publicKey) => (kid) => find(isTheRightKid(kid))(publicKey);

const getKid = path(['header', 'kid']);

const decode = compose(curryN(2), flip)(jwt.decode);

const getUserFromPublicKey = (token) => compose(makeUser, verify(token));

const getUserFromJWK = (token) => (jwk) =>
    compose(
        getUserFromPublicKey(token),
        jwkToPem,
        findPublicKeyFromKid(jwk),
        getKid,
        decode({ complete: true })
    )(token);

const fetchPublicKeys = async ({ realm, serverUrl, useCache = true }) => {
    const url = `${serverUrl}/realms/${realm}/protocol/openid-connect/certs`;
    const key = url;

    if (useCache) {
        const cert = await certificatesCache.getItem(key);

        return cert
            ? cert
            : axios
                  .get(url)
                  .then(path(['data', 'keys']))
                  .then(async (publicKey) => {
                      await certificatesCache.setItem(key, publicKey, { ttl: cacheTTL });
                      return publicKey;
                  });
    }
    return axios.get(url).then(path(['data', 'keys']));
};

const verifyOffline = (config) => async (accessToken, options = {}) => {
    const { publicKey } = config;

    if (!accessToken) {
        log.error('No access token.');
    }

    return publicKey
        ? getUserFromPublicKey(accessToken)(publicKey)
        : fetchPublicKeys({ ...config, ...options }).then(getUserFromJWK(accessToken));
};

const Keycloak = (config) => ({
    verifyOffline: verifyOffline(config),
});

export default Keycloak;
