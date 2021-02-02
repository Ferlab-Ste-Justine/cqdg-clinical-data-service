import { IsNotEmpty, IsOptional, ValidateNested } from 'class-validator';
import { RecordValidationError } from './RecordValidationError';
import { Exclude, Type } from 'class-transformer';
import { TypedDataRecord } from '@overturebio-stack/lectern-client/lib/schema-entities';

export class SingleFileValidationStatus {
    @IsNotEmpty()
    public filename: string;

    // If undefined, it means that we were not able to
    // find a schema based on the file provided.
    @IsOptional()
    public schemaName: string;

    @ValidateNested({ each: true })
    @Type(() => RecordValidationError)
    public validationErrors: RecordValidationError[];

    @Exclude()
    public processedRecords: TypedDataRecord[];
}
