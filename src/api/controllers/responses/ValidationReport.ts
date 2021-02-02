import { SingleFileValidationStatus } from './SingleFileValidationStatus';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { SystemError } from '../../errors/SystemError';

export class ValidationReport {
    @ValidateNested({ each: true })
    @Type(() => SingleFileValidationStatus)
    public files: SingleFileValidationStatus[];

    @IsOptional()
    public dataSubmissionId: number;

    @ValidateNested({ each: true })
    @Type(() => SystemError)
    public errors: SystemError[];
}
