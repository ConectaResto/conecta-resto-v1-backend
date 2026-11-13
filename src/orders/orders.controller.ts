import {
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service.js';
import { CreateOrderFromQrDto } from './dto/create-order-from-qr.dto.js';
import { CreateOrderFromWaiterDto } from './dto/create-order-from-waiter.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../../generated/prisma/enums.js';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface.js';

@Controller('orders')
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) { }

    // Crear pedido desde QR (público, sin autenticación)
    @Post('from-qr')
    createFromQr(
        @Body() createDto: CreateOrderFromQrDto,
    ) {
        return this.ordersService.createFromQr(
            createDto.qrToken,
            createDto.items,
        );
    }

    // Crear pedido desde panel del personal (autenticado, AUTHORIZED directo)
    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.WAITER)
    createFromWaiter(
        @Body() createDto: CreateOrderFromWaiterDto,
        @Req() request: AuthenticatedRequest,
    ) {
        return this.ordersService.createFromWaiter(
            request.user,
            createDto.tableId,
            createDto.items,
        );
    }

    // Listar pedidos pendientes (con filtro por restaurante según rol)
    @Get('pending')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.WAITER, UserRole.CASHIER)
    findPending(@Req() request: AuthenticatedRequest) {
        return this.ordersService.findPending(request.user);
    }

    // Autorizar pedido
    @Patch(':id/authorize')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.WAITER)
    authorize(
        @Param('id', ParseIntPipe) id: number,
        @Req() request: AuthenticatedRequest,
    ) {
        return this.ordersService.authorize(id, request.user);
    }

    // Listar pedidos listos para entregar (AUTHORIZED + KitchenOrder READY)
    @Get('ready')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.WAITER)
    findReady(@Req() request: AuthenticatedRequest) {
        return this.ordersService.findReady(request.user);
    }
}
