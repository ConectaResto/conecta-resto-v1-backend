import {
    IsEnum,
    IsNotEmpty,
} from 'class-validator';
import { KitchenOrderStatus } from '../../../../generated/prisma/enums.js';

export class UpdateKitchenOrderStatusDto {
    @IsEnum(KitchenOrderStatus)
    @IsNotEmpty()
    status: KitchenOrderStatus;
}
