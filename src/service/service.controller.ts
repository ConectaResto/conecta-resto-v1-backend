import {
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common';
import { ServiceService } from './service.service.js';
import { CreateServiceDto } from './dto/create-service.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../../generated/prisma/enums.js';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface.js';

@Controller('services')
export class ServiceController {
    constructor(private readonly serviceService: ServiceService) { }

    // Crear o recuperar servicio desde QR (público, sin autenticación)
    @Post('qr')
    createFromQr(
        @Body() createDto: CreateServiceDto,
    ) {
        return this.serviceService.findOrCreateActiveFromQr(createDto.qrToken);
    }

    // Crear servicio autenticado
    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.WAITER)
    create(
        @Body() body: { tableId: number },
        @Req() request: AuthenticatedRequest,
    ) {
        return this.serviceService.create(request.user, body.tableId);
    }

    // Obtener servicio por ID
    @Get(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.WAITER)
    findOne(
        @Param('id', ParseIntPipe) id: number,
        @Req() request: AuthenticatedRequest,
    ) {
        return this.serviceService.findOne(id, request.user);
    }
}
