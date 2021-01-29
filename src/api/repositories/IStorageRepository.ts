import { Readable } from 'stream';

export interface IStorageRepository {
    store(filepath: string, file: Buffer | Readable): Promise<void>;
    deleteFile(filepath: string): Promise<void>;
    deleteDirectory(directoryPath: string): Promise<void>;
    listFiles(directoryPath: string): Promise<string[]>;
    read(filepath: string): Promise<Readable | Buffer>;
}
