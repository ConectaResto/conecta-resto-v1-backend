import {
    IsInt,
    IsNotEmpty,
    IsPositive,
} from 'class-validator';

export class CreateTableDto {
    @IsInt()
    @IsPositive()
    number: number;

    @IsInt()
    @IsNotEmpty()
    @IsPositive()
    restaurantId: number;
}