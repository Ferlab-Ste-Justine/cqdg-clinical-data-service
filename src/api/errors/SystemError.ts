import { IsNotEmpty, IsOptional } from 'class-validator';

export class SystemError {
    @IsNotEmpty()
    public code: string;

    @IsNotEmpty()
    public message: string;

    @IsOptional()
    public details: any;

    constructor(code: string, message: string, details: any) {
        this.code = code;
        this.message = message;
        this.details = details;
    }
}
