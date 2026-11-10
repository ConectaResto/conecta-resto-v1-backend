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
import { ServiceRequestService } from './service-request.service.js';
import { CreateServiceRequestDto } from './dto/create-service-request.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../../generated/prisma/enums.js';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface.js';

@Controller('service-requests')
export class ServiceRequestController {
    constructor(private readonly serviceRequestService: ServiceRequestService) { }

    // Inicio o recuperación de servicio desde QR (público, sin autenticación)
    @Post('qr')
    createFromQr(
        @Body() createDto: CreateServiceRequestDto,
    ) {
        return this.serviceRequestService.findOrCreateActiveFromQr(
            createDto.qrToken,
        );
    }

    // Listar servicios (con filtro por restaurante según rol)
    @Get()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.WAITER, UserRole.CASHIER)
    findAll(@Req() request: AuthenticatedRequest) {
        return this.serviceRequestService.findAll(request.user);
    }

    // Obtener servicio por ID
    @Get(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.WAITER, UserRole.CASHIER)
    findOne(
        @Param('id', ParseIntPipe) id: number,
        @Req() request: AuthenticatedRequest,
    ) {
        return this.serviceRequestService.findOne(id, request.user);
    }

    // Cerrar servicio
    @Patch(':id/close')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.WAITER)
    close(
        @Param('id', ParseIntPipe) id: number,
        @Req() request: AuthenticatedRequest,
    ) {
        return this.serviceRequestService.close(id, request.user);
    }
}
