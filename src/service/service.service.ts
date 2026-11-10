import {
    Injectable,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface.js';
import { UserRole } from '../../generated/prisma/enums.js';

@Injectable()
export class ServiceService {
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
            const existing = await prisma.service.findFirst({
                where: { tableId: table.id, status: 'ACTIVE' },
            });

            if (existing) {
                return existing;
            }

            // 4. Crear nuevo servicio ACTIVE
            return prisma.service.create({
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

    async create(user: AuthenticatedRequest['user'], tableId: number) {
        return this.prisma.$transaction(async (prisma) => {
            // 1. Bloquear la fila de la mesa con SELECT ... FOR UPDATE
            const table = await prisma.table.findFirst({
                where: { id: tableId },
            });

            if (!table) {
                throw new NotFoundException('Mesa no encontrada');
            }

            if (!table.isActive) {
                throw new NotFoundException('Mesa inactiva');
            }

            // 2. Validar restaurante activo
            const restaurant = await prisma.restaurant.findUnique({
                where: { id: table.restaurantId },
            });

            if (!restaurant || !restaurant.isActive) {
                throw new ForbiddenException('El restaurante está inactivo');
            }

            // 3. Validar aislamiento por restaurante (excepto SUPER_ADMIN)
            if (user.role !== UserRole.SUPER_ADMIN) {
                if (table.restaurantId !== user.restaurantId) {
                    throw new ForbiddenException('No pertenece a su restaurante');
                }
            }

            // 4. CASHIER no puede crear servicios
            if (user.role === UserRole.CASHIER) {
                throw new ForbiddenException('CASHIER no puede crear servicios');
            }

            // 4. Buscar servicio ACTIVE existente para esta mesa
            const existing = await prisma.service.findFirst({
                where: { tableId: table.id, status: 'ACTIVE' },
            });

            if (existing) {
                return existing;
            }

            // 5. Crear nuevo servicio ACTIVE
            return prisma.service.create({
                data: {
                    tableId: table.id,
                    restaurantId: table.restaurantId,
                    status: 'ACTIVE',
                },
                include: {
                    table: true,
                    restaurant: true,
                },
            });
        });
    }

    async findOne(id: number, user: AuthenticatedRequest['user']) {
        const service = await this.prisma.service.findFirst({
            where:
                user.role === UserRole.SUPER_ADMIN
                    ? { id }
                    : { id, restaurantId: user.restaurantId! },
            include: {
                table: true,
                restaurant: true,
                orders: {
                    include: {
                        orderItems: {
                            include: {
                                product: true,
                            },
                        },
                    },
                },
            },
        });

        if (!service) {
            throw new NotFoundException('Servicio no encontrado');
        }

        return service;
    }
}
