import { Readable } from 'stream';
import { Service } from 'typedi';
import { Logger, LoggerInterface } from '../../decorators/Logger';
import { S3StorageRepository } from '../repositories/S3StorageRepository';
import { SystemError } from '../errors/SystemError';

@Service()
export class StorageService {
    constructor(private storage: S3StorageRepository, @Logger(__filename) private log: LoggerInterface) {}

    public async store(filename: string, file: Buffer | Readable): Promise<SystemError[]> {
        let errors: SystemError[];

        try {
            // Saved in s3 to eventually be processed by ETL
            await this.storage.store(filename, file);
        } catch (error) {
            errors = Object.keys(error).map(
                (key) =>
                    new SystemError(
                        error[key].Code,
                        `Error: ${error[key].name}, Bucket: ${error[key].BucketName}, File: ${filename}`,
                        error[key]
                    )
            );
        }

        return errors;
    }

    public async moveDirectory(from: string, to: string): Promise<void> {
        this.log.debug(`Moving ${from} to ${to}`);

        const filesToMove: string[] = await this.listFiles(from);
        if (filesToMove && filesToMove.length > 0) {
            for (const f of filesToMove) {
                this.log.debug(
                    `moving ${f} to ${
                        (to.endsWith('/') ? to.substring(0, to.length - 1) : to) +
                        f.substring(f.lastIndexOf('/'), f.length)
                    }`
                );

                await this.storage.moveFile(
                    f,
                    (to.endsWith('/') ? to.substring(0, to.length - 1) : to) + f.substring(f.lastIndexOf('/'), f.length)
                );
            }
            await this.storage.deleteDirectory(from);
        }
    }

    public async deleteDirectory(directoryPath: string): Promise<void> {
        this.log.debug(`Deleting directory ${directoryPath}`);
        return await this.storage.deleteDirectory(directoryPath);
    }

    public async listFiles(directoryPath: string): Promise<string[]> {
        this.log.debug(`Listing files in ${directoryPath}`);
        return await this.storage.listFiles(directoryPath);
    }

    public async read(filepath: string): Promise<any> {
        this.log.debug(`Retrieving ${filepath}`);
        return await this.storage.read(filepath);
    }

    public async readAsString(filepath: string, enc: BufferEncoding = 'utf-8'): Promise<string> {
        const chunks = [];
        const stream = await this.read(filepath);
        if (stream instanceof Readable) {
            return new Promise((resolve, reject) => {
                stream.on('data', (chunk) => chunks.push(chunk));
                stream.on('error', reject);
                stream.on('end', () => resolve(Buffer.concat(chunks).toString(enc)));
            });
        } else if (stream instanceof Buffer) {
            return stream.toString('utf-8');
        } else {
            throw new Error('Unknown object stream type');
        }
    }
}
