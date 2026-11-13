import { IsArray, IsNotEmpty, IsInt, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderItemDto } from './order-item.dto.js';

export class CreateOrderFromWaiterDto {
    @IsInt()
    @IsNotEmpty()
    tableId: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => OrderItemDto)
    @IsNotEmpty()
    items: OrderItemDto[];
}
