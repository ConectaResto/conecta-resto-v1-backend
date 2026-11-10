import { IsInt, IsNotEmpty } from 'class-validator';

export class MenuQueryDto {
    @IsInt()
    @IsNotEmpty()
    restaurantId: number;

    @IsInt()
    @IsNotEmpty()
    tableId: number;
}
