import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    UseGuards,
} from '@nestjs/common';
import { Req } from '@nestjs/common';
import { ParseIntPipe } from '@nestjs/common';
import { KitchenService } from './kitchen.service.js';
import { UpdateKitchenOrderStatusDto } from './dto/requests/update-kitchen-order-status.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { UserRole } from '../../generated/prisma/enums.js';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface.js';

@Controller('kitchen')
@UseGuards(JwtAuthGuard, RolesGuard)
export class KitchenController {
    constructor(private readonly kitchenService: KitchenService) { }

    @Get('orders')
    @Roles(UserRole.SUPER_ADMIN, UserRole.KITCHEN)
    findAll(@Req() request: AuthenticatedRequest) {
        return this.kitchenService.findAll(request.user);
    }

    @Get('orders/:id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.KITCHEN)
    findOne(
        @Param('id', ParseIntPipe) id: number,
        @Req() request: AuthenticatedRequest,
    ) {
        return this.kitchenService.findOne(id, request.user);
    }

    @Patch('orders/:id/status')
    @Roles(UserRole.KITCHEN)
    updateStatus(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateKitchenOrderStatusDto: UpdateKitchenOrderStatusDto,
        @Req() request: AuthenticatedRequest,
    ) {
        return this.kitchenService.updateStatus(
            id,
            updateKitchenOrderStatusDto.status,
            request.user,
        );
    }
}
