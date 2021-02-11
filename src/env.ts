import * as dotenv from 'dotenv';
import * as path from 'path';

import * as pkg from '../package.json';
import { getOsEnv, getOsEnvOptional, getOsPath, getOsPaths, normalizePort, toBool, toNumber } from './lib/env';

/**
 * Load .env file or for tests the .env.test file.
 */
dotenv.config({ path: path.join(process.cwd(), `.env${process.env.NODE_ENV === 'test' ? '.test' : ''}`) });

const authEnabled = toBool(getOsEnvOptional('AUTH_ENABLED', 'true'));

/**
 * Environment variables
 */
export const env = {
    node: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isTest: process.env.NODE_ENV === 'test',
    isDevelopment: process.env.NODE_ENV === 'development',
    app: {
        name: getOsEnv('APP_NAME'),
        version: (pkg as any).version,
        description: (pkg as any).description,
        host: getOsEnv('APP_HOST'),
        schema: getOsEnv('APP_SCHEMA'),
        routePrefix: getOsEnv('APP_ROUTE_PREFIX'),
        port: normalizePort(process.env.PORT || getOsEnv('APP_PORT')),
        banner: toBool(getOsEnv('APP_BANNER')),
        cacheCertTTLInSeconds: toNumber(getOsEnvOptional('CACHE_CERT_TTL_IN_SECONDS', '300')),
        dirs: {
            migrations: getOsPaths('TYPEORM_MIGRATIONS'),
            migrationsDir: getOsPath('TYPEORM_MIGRATIONS_DIR'),
            entities: getOsPaths('TYPEORM_ENTITIES'),
            entitiesDir: getOsPath('TYPEORM_ENTITIES_DIR'),
            controllers: getOsPaths('CONTROLLERS'),
            middlewares: getOsPaths('MIDDLEWARES'),
            interceptors: getOsPaths('INTERCEPTORS'),
            subscribers: getOsPaths('SUBSCRIBERS'),
            resolvers: getOsPaths('RESOLVERS'),
        },
    },
    auth: {
        enabled: authEnabled,
        realm: authEnabled ? getOsEnv('AUTH_REALM') : getOsEnvOptional('AUTH_REALM'),
        serverUrl: authEnabled ? getOsEnv('AUTH_SERVER_URL') : getOsEnvOptional('AUTH_SERVER_URL'),
        clientId: authEnabled ? getOsEnv('AUTH_CLIENT_ID') : getOsEnvOptional('AUTH_CLIENT_ID'),
        testClientSecret: getOsEnvOptional('AUTH_TEST_CLIENT_SECRET'),
    },
    lectern: {
        serverUrl: getOsEnv('LECTERN_SERVER_URL'),
        username: getOsEnv('LECTERN_USERNAME'),
        password: getOsEnv('LECTERN_PASSWORD'),
        dictionaryName: getOsEnv('LECTERN_DICTIONARY_NAME'),
        dictionaryDefaultLanguage: getOsEnvOptional('LECTERN_DEFAULT_LANGUAGE', 'en').toUpperCase(),
    },
    fileUpload: {
        maxNumberOfFiles: toNumber(getOsEnvOptional('FILE_UPLOAD_MAX_NB_OF_FILES', '11')),
        maxSize: toNumber(getOsEnvOptional('FILE_UPLOAD_MAX_SIZE_MB', '50')),
        allowedMimeTypes: getOsEnvOptional('FILE_UPLOAD_ALLOWED_MIMETYPES', 'text/tab-separated-values,text/csv').split(
            ','
        ),
    },
    log: {
        level: getOsEnv('LOG_LEVEL'),
        json: toBool(getOsEnvOptional('LOG_JSON')),
        output: getOsEnv('LOG_OUTPUT'),
    },
    db: {
        type: getOsEnv('TYPEORM_CONNECTION'),
        host: getOsEnvOptional('TYPEORM_HOST'),
        port: toNumber(getOsEnvOptional('TYPEORM_PORT')),
        username: getOsEnvOptional('TYPEORM_USERNAME'),
        password: getOsEnvOptional('TYPEORM_PASSWORD'),
        database: getOsEnv('TYPEORM_DATABASE'),
        synchronize: toBool(getOsEnvOptional('TYPEORM_SYNCHRONIZE')),
        logging: toBool(getOsEnv('TYPEORM_LOGGING')),
    },
    graphql: {
        enabled: toBool(getOsEnv('GRAPHQL_ENABLED')),
        route: getOsEnv('GRAPHQL_ROUTE'),
        editor: toBool(getOsEnv('GRAPHQL_EDITOR')),
    },
    swagger: {
        enabled: toBool(getOsEnv('SWAGGER_ENABLED')),
        route: getOsEnv('SWAGGER_ROUTE'),
    },
    monitor: {
        enabled: toBool(getOsEnv('MONITOR_ENABLED')),
        route: getOsEnv('MONITOR_ROUTE'),
        username: getOsEnv('MONITOR_USERNAME'),
        password: getOsEnv('MONITOR_PASSWORD'),
    },
    s3: {
        signingRegion: getOsEnvOptional('S3_SIGNIN_REGION', 'chusj'),
        bucketName: getOsEnvOptional('S3_BUCKET_NAME', 'cqdg'),
        serviceEndpoint: getOsEnv('S3_SERVICE_ENDPOINT'),
        accessKey: getOsEnv('S3_ACCESS_KEY'),
        secretKey: getOsEnv('S3_SECRET_KEY'),
    },
    rules: {
        location: getOsEnvOptional('RULES_LOCATION', 'rules'),
    },
};
