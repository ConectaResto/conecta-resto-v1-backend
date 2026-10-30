import {
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsPositive,
} from 'class-validator';

export class CreateTableDto {
    @IsInt()
    @IsPositive()
    number: number;

    @IsOptional()
    @IsInt()
    @IsNotEmpty()
    @IsPositive()
    restaurantId: number;
}