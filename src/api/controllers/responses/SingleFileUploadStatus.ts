import { IsNotEmpty, ValidateNested } from 'class-validator';
import { RecordValidationError } from './RecordValidationError';
import { Type } from 'class-transformer';

export class SingleFileUploadStatus {
    @IsNotEmpty()
    public filename: string;

    @ValidateNested({ each: true })
    @Type(() => RecordValidationError)
    public validationErrors: RecordValidationError[];
}
