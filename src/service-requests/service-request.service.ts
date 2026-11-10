import {
    Injectable,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface.js';
import { UserRole } from '../../generated/prisma/enums.js';

@Injectable()
export class ServiceRequestService {
    constructor(private readonly prisma: PrismaService) { }

    async findOrCreateActiveFromQr(qrToken: string) {
        return this.prisma.$transaction(async (prisma) => {
            // 1. Bloquear la fila de la mesa con SELECT ... FOR UPDATE
            const rows = await prisma.$queryRaw<
                { id: number; restaurant_id: number; is_active: number }[]
            >`
                SELECT id, restaurant_id, is_active
                FROM tables
                WHERE qr_token = ${qrToken}
                  AND is_active = 1
                FOR UPDATE
            `;

            if (!rows || rows.length === 0) {
                throw new NotFoundException('Mesa no encontrada o inactiva');
            }

            const table = rows[0];

            // 2. Validar que el restaurante esté activo
            const restaurant = await prisma.restaurant.findUnique({
                where: { id: table.restaurant_id },
            });

            if (!restaurant || !restaurant.isActive) {
                throw new ForbiddenException('El restaurante está inactivo');
            }

            // 3. Buscar servicio ACTIVE existente para esta mesa
            const existing = await prisma.serviceRequest.findFirst({
                where: { tableId: table.id, status: 'ACTIVE' },
            });

            if (existing) {
                return existing;
            }

            // 4. Crear nuevo servicio ACTIVE
            return prisma.serviceRequest.create({
                data: {
                    tableId: table.id,
                    restaurantId: table.restaurant_id,
                    status: 'ACTIVE',
                },
                include: {
                    table: true,
                    restaurant: true,
                },
            });
        });
    }

    async findAll(user: AuthenticatedRequest['user']) {
        return this.prisma.serviceRequest.findMany({
            where:
                user.role === UserRole.SUPER_ADMIN
                    ? {}
                    : { restaurantId: user.restaurantId! },
            include: {
                table: true,
                restaurant: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    async findOne(
        id: number,
        user: AuthenticatedRequest['user'],
    ) {
        const service = await this.prisma.serviceRequest.findFirst({
            where:
                user.role === UserRole.SUPER_ADMIN
                    ? { id }
                    : { id, restaurantId: user.restaurantId! },
            include: {
                table: true,
                restaurant: true,
            },
        });

        if (!service) {
            throw new NotFoundException(`Service with ID ${id} not found`);
        }

        return service;
    }

    async close(
        serviceId: number,
        user: AuthenticatedRequest['user'],
    ) {
        return this.prisma.$transaction(async (prisma) => {
            // 1. Obtener el servicio para saber su tableId
            const service = await prisma.serviceRequest.findUnique({
                where: { id: serviceId },
            });

            if (!service) {
                throw new NotFoundException('Servicio no encontrado');
            }

            // 2. Bloquear la fila de la mesa correspondiente
            const tableRows = await prisma.$queryRaw<
                { id: number; restaurant_id: number }[]
            >`
                SELECT id, restaurant_id
                FROM tables
                WHERE id = ${service.tableId}
                FOR UPDATE
            `;

            if (!tableRows || tableRows.length === 0) {
                throw new NotFoundException('Mesa asociada no encontrada');
            }

    // 3. Volver a consultar el servicio dentro de la transacción
            const currentService = await prisma.serviceRequest.findUnique({
                where: { id: serviceId },
            });

            if (!currentService || currentService.status === 'INACTIVE') {
                throw new ForbiddenException('El servicio ya está cerrado o no existe');
            }

            // 4. Validar rol permitido para cierre
            if (user.role === UserRole.CASHIER) {
                throw new ForbiddenException('Rol no autorizado para cerrar servicios');
            }

            // 5. Validar aislamiento por restaurante
            if (user.role !== UserRole.SUPER_ADMIN) {
                if (currentService.restaurantId !== user.restaurantId) {
                    throw new ForbiddenException('No pertenece a su restaurante');
                }
            }

            // 6. Cerrar el servicio
            return prisma.serviceRequest.update({
                where: { id: serviceId },
                data: {
                    status: 'INACTIVE',
                    closedAt: new Date(),
                },
            });
        });
    }
}
