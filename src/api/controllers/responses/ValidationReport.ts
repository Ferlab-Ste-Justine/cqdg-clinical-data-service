import { SingleFileValidationStatus } from './SingleFileValidationStatus';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { SystemError } from '../../errors/SystemError';
import { RecordValidationError } from './RecordValidationError';

export class ValidationReport {
    @ValidateNested({ each: true })
    @Type(() => SingleFileValidationStatus)
    public files: SingleFileValidationStatus[];

    @ValidateNested({ each: true })
    @Type(() => RecordValidationError)
    public globalValidationErrors: RecordValidationError[];

    @IsOptional()
    public dataSubmissionId: number;

    @ValidateNested({ each: true })
    @Type(() => SystemError)
    public errors: SystemError[];
}
