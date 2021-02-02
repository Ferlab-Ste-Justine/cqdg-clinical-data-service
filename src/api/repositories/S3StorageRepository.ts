import { Readable } from 'stream';
import { Service } from 'typedi';
import { CreateBucketCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Logger, LoggerInterface } from '../../decorators/Logger';
import { Credentials } from '@aws-sdk/types';
import { Provider } from '@aws-sdk/types/types/util';
import { env } from '../../env';

@Service()
export class S3StorageRepository {
    private readonly credentialsProvider: Provider<Credentials>;
    private readonly s3: S3Client;

    constructor(@Logger(__filename) private log: LoggerInterface) {
        this.credentialsProvider = async (): Promise<Credentials> => {
            return {
                accessKeyId: env.s3.accessKey,
                secretAccessKey: env.s3.secretKey,
                sessionToken: undefined,
                expiration: undefined,
            };
        };

        this.s3 = new S3Client({
            signingRegion: env.s3.signingRegion,
            credentialDefaultProvider: (input: any): Provider<Credentials> => this.credentialsProvider,
            endpoint: env.s3.serviceEndpoint,
        });
    }

    public async deleteDirectory(directoryPath: string): Promise<void> {
        throw new Error('Not implemented.');
        return Promise.resolve(undefined);
    }

    public async deleteFile(filepath: string): Promise<void> {
        throw new Error('Not implemented.');
        return Promise.resolve(undefined);
    }

    public async listFiles(directoryPath: string): Promise<string[]> {
        throw new Error('Not implemented.');
        return Promise.resolve([]);
    }

    public async read(filepath: string): Promise<Readable | Buffer> {
        throw new Error('Not implemented.');
        return Promise.resolve(undefined);
    }

    public async store(filename: string, file: Buffer | Readable): Promise<void> {
        const bucketParams = { Bucket: env.s3.bucketName };

        try {
            const data = await this.s3.send(new CreateBucketCommand(bucketParams));
            this.log.info('Success. Bucket created.', data);
        } catch (err) {
            if ('BucketAlreadyOwnedByYou' !== err.name) {
                this.log.error(`Could not create bucket ${env.s3.bucketName}.`, err);
                throw err;
            }
        }

        const objectParams = {
            Bucket: env.s3.bucketName,
            Key: filename,
            Body: file,
            Expires: new Date(),
            CacheControl: 'no-cache',
        };

        try {
            const results = await this.s3.send(new PutObjectCommand(objectParams));
            this.log.debug('Successfully uploaded data to ' + env.s3.bucketName + '/' + filename, results);
        } catch (err) {
            this.log.error(`Failed to save ${filename}`, err);
            throw err;
        }

        return Promise.resolve(undefined);
    }
}
