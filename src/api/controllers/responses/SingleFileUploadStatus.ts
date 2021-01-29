import { IsNotEmpty, ValidateNested } from 'class-validator';
import { RecordValidationError } from './RecordValidationError';
import { Exclude, Type } from 'class-transformer';
import { TypedDataRecord } from '@overturebio-stack/lectern-client/lib/schema-entities';

export class SingleFileUploadStatus {
    @IsNotEmpty()
    public filename: string;

    @ValidateNested({ each: true })
    @Type(() => RecordValidationError)
    public validationErrors: RecordValidationError[];

    @Exclude()
    public processedRecords: TypedDataRecord[];
}
