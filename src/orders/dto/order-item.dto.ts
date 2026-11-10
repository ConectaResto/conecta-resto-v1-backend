import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class OrderItemDto {
    @IsInt()
    @IsNotEmpty()
    productId: number;

    @IsInt()
    @Min(1)
    quantity: number;
}
