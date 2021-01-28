import {
    SchemaValidationError,
    SchemaValidationErrorTypes,
} from '@overturebio-stack/lectern-client/lib/schema-entities';
import { IsEnum, IsJSON, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class RecordValidationError implements SchemaValidationError {
    @IsEnum(SchemaValidationErrorTypes)
    public errorType: SchemaValidationErrorTypes;

    @IsNumber()
    public index: number;

    @IsNotEmpty()
    public fieldName: string;

    @IsString()
    public message: string;

    @IsJSON()
    public info: Record<string, any>;

    constructor(json: any) {
        this.errorType = SchemaValidationErrorTypes[json.errorType] || undefined;
        this.index = json.index || undefined;
        this.fieldName = json.fieldName || undefined;
        this.message = json.message || '';
        this.info = json.info || {};
    }
}
