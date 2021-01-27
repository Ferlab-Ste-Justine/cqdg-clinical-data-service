import {ConnectionOptions} from 'typeorm/connection/ConnectionOptions';
import {env} from '../env';
import {Connection, createConnection, getConnectionOptions} from 'typeorm';

/**
 * TypeORM
 * ------------------------------
 */
const getTypeORMOptions = async (): Promise<ConnectionOptions> => {
    const loadedConnectionOptions: ConnectionOptions = await getConnectionOptions();

    return Object.assign(loadedConnectionOptions, {
        type: env.db.type as any, // See createConnection options for valid types
        host: env.db.host,
        port: env.db.port,
        username: env.db.username,
        password: env.db.password,
        database: env.db.database,
        synchronize: env.db.synchronize,
        logging: env.db.logging,
        entities: env.app.dirs.entities,
        migrations: env.app.dirs.migrations,
    });
};

export const getDBConnection = async (): Promise<Connection> => {
    const typeORMConfig: ConnectionOptions = await getTypeORMOptions();
    return await createConnection(typeORMConfig);
};
