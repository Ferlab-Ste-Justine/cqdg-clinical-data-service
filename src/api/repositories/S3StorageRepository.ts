import { Readable } from 'stream';
import { Service } from 'typedi';
import { IStorageRepository } from './IStorageRepository';
import fs from 'fs';

@Service()
export class S3StorageRepository implements IStorageRepository {
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

    public async store(filepath: string, file: Buffer | Readable): Promise<void> {
        // throw new Error('Not implemented.');
        // TODO: WRITE TO AWS S3!!!!
        fs.writeFileSync('/home/plaplante/CHUST/projects/cqdg/cqdg-data-submission/test.tsv', file.toString());

        return Promise.resolve(undefined);
    }
}
