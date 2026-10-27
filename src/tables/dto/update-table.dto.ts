import {
    IsBoolean,
    IsInt,
    IsOptional,
    IsPositive,
} from 'class-validator';

export class UpdateTableDto {
    @IsOptional()
    @IsInt()
    @IsPositive()
    number?: number;

    @IsOptional()
    @IsBoolean()
    isAvailable?: boolean;
}