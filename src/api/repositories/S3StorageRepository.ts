import { Readable } from 'stream';
import { Service } from 'typedi';
import { Logger, LoggerInterface } from '../../decorators/Logger';
import { env } from '../../env';
import * as AWS from 'aws-sdk';
import { AWSError } from 'aws-sdk';

@Service()
export class S3StorageRepository {
    private readonly s3: AWS.S3;

    constructor(@Logger(__filename) private log: LoggerInterface) {
        this.s3 = new AWS.S3({
            region: env.s3.signingRegion,
            endpoint: env.s3.serviceEndpoint,
            s3ForcePathStyle: true,
            accessKeyId: env.s3.accessKey,
            secretAccessKey: env.s3.secretKey,
            signatureVersion: 'v4',
        });
    }

    public async moveFile(from: string, to: string): Promise<void> {
        const request = {
            Bucket: env.s3.bucketName,
            CopySource: `${env.s3.bucketName}/${from}`,
            Key: to,
        };

        const result = await this.s3.copyObject(request).promise();
        if (result?.$response?.error) {
            throw new Error(`Failed to move ${from} to ${to}.\n\r ${this.parseAWSError(result.$response.error)}`);
        }

        return Promise.resolve(undefined);
    }

    public async deleteDirectory(directoryPath: string): Promise<void> {
        const files: string[] = await this.listFiles(directoryPath);

        const request = {
            Bucket: env.s3.bucketName,
            Delete: {
                Objects: files.map((f) => {
                    return {
                        Key: f,
                    };
                }),
                Quiet: false,
            },
        };

        const result = await this.s3.deleteObjects(request).promise();
        if (result.Errors) {
            throw new Error(
                `Failed to delete directory ${directoryPath}\n\r${JSON.stringify(result.Errors, undefined, 2)}`
            );
        }

        return Promise.resolve(undefined);
    }

    public async listFiles(directoryPath: string): Promise<string[]> {
        const request = {
            Bucket: env.s3.bucketName,
            Prefix: `${directoryPath}/`,
            ContinuationToken: undefined,
        };

        const files: string[] = [];

        try {
            let result;
            do {
                result = await this.s3.listObjectsV2(request).promise();
                if (result?.$response?.error) {
                    throw new Error(
                        `Failed to list files in ${directoryPath}\n\r${this.parseAWSError(result?.$response?.error)}`
                    );
                }
                if (result && result.Contents) {
                    files.push(...result.Contents.map((o) => o.Key));
                }
                request.ContinuationToken = result.NextContinuationToken;
            } while (result.IsTruncated);
        } catch (err) {
            // no files found
            // perhaps the prefix does not exist in the bucket?
            this.log.debug(`No files found in ${env.s3.bucketName}/${directoryPath}`);
        }

        return files;
    }

    public async read(filename: string): Promise<any> {
        const request = {
            Bucket: env.s3.bucketName,
            Key: filename,
        };

        const result = await this.s3.getObject(request).promise();

        if (result?.$response?.error) {
            throw new Error(`Failed to retrieve file ${filename}\n\r${this.parseAWSError(result.$response.error)}`);
        }

        return result.Body;
    }

    public async store(filename: string, file: Buffer | Readable): Promise<void> {
        const bucketParams = { Bucket: env.s3.bucketName };

        try {
            const data = await this.s3.createBucket(bucketParams).promise();
            this.log.info('Success. Bucket created.', data);
        } catch (err) {
            this.log.debug(`Bucket ${env.s3.bucketName} probably already exists.`, err);
        }

        const request = {
            Bucket: env.s3.bucketName,
            Key: filename,
            Body: file,
            Expires: new Date(),
            CacheControl: 'no-cache',
        };

        const result = await this.s3.putObject(request).promise();
        if (result?.$response?.error) {
            throw new Error(
                `Failed to upload data to ${env.s3.bucketName}/${filename}\n\r${this.parseAWSError(
                    result.$response.error
                )}`
            );
        }
        this.log.debug(`Successfully uploaded data to ${env.s3.bucketName}/${filename}`, result);

        return Promise.resolve(undefined);
    }

    private parseAWSError(err: AWSError): string {
        return `Error code: ${err.code}\n\rStatus code: ${err.statusCode}\n\rError message: ${err.message}\n\rStacktrace: \n\r${err.stack}`;
    }
}
