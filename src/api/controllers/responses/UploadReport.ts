import { SingleFileUploadStatus } from './SingleFileUploadStatus';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';

export class UploadReport {
    @ValidateNested({ each: true })
    @Type(() => SingleFileUploadStatus)
    public files: SingleFileUploadStatus[];

    @IsOptional()
    public dataSubmissionId: number;
}
