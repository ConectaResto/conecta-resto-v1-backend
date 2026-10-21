import { Type } from 'class-transformer';
import {
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    MaxLength,
    Min,
} from 'class-validator';

export class CreateProductDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(150)
    name: string;

    @IsOptional()
    @IsString()
    description?: string;

    @Type(() => Number)
    @IsNumber({ allowNaN: false, allowInfinity: false })
    @Min(0)
    price: number;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    image?: string;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    restaurantId: number;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    categoryId: number;
}