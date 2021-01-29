import { Readable } from 'stream';
import { Service } from 'typedi';
import { Logger, LoggerInterface } from '../../decorators/Logger';
import { S3StorageRepository } from '../repositories/S3StorageRepository';

@Service()
export class StorageService {
    constructor(private storage: S3StorageRepository, @Logger(__filename) private log: LoggerInterface) {}

    public async store(filepath: string, content: Buffer | Readable): Promise<void> {
        this.log.debug(`Writing ${filepath}`);
        return await this.storage.store(filepath, content);
    }

    public async deleteFile(filepath: string): Promise<void> {
        this.log.debug(`Deleting file ${filepath}`);
        return await this.storage.deleteFile(filepath);
    }

    public async deleteDirectory(directoryPath: string): Promise<void> {
        this.log.debug(`Deleting directory ${directoryPath}`);
        return await this.storage.deleteDirectory(directoryPath);
    }

    public async listFiles(directoryPath: string): Promise<string[]> {
        this.log.debug(`Listing files in ${directoryPath}`);
        return await this.storage.listFiles(directoryPath);
    }

    public async read(filepath: string): Promise<Buffer | Readable> {
        this.log.debug(`Retrieving ${filepath}`);
        return await this.storage.read(filepath);
    }
}
