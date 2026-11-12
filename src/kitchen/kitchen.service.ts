import {
    Injectable,
    ForbiddenException,
    NotFoundException,
    ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface.js';
import { UserRole, KitchenOrderStatus } from '../../generated/prisma/enums.js';

@Injectable()
export class KitchenService {
    constructor(private readonly prisma: PrismaService) { }

    async findAll(user: AuthenticatedRequest['user']) {
        if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.KITCHEN) {
            throw new ForbiddenException(
                'Acceso denegado: solo KITCHEN y SUPER_ADMIN pueden consultar pedidos de cocina',
            );
        }

        return this.prisma.kitchenOrder.findMany({
            where:
                user.role === UserRole.SUPER_ADMIN
                    ? {}
                    : {
                        order: {
                            restaurantId: user.restaurantId!,
                        },
                    },
            orderBy: {
                createdAt: 'desc',
            },
            include: {
                order: {
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
    }

    async findOne(id: number, user: AuthenticatedRequest['user']) {
        if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.KITCHEN) {
            throw new ForbiddenException(
                'Acceso denegado: solo KITCHEN y SUPER_ADMIN pueden consultar pedidos de cocina',
            );
        }

        const kitchenOrder = await this.prisma.kitchenOrder.findFirst({
            where: {
                orderId: id,
                ...(user.role !== UserRole.SUPER_ADMIN && {
                    order: {
                        restaurantId: user.restaurantId!,
                    },
                }),
            },
            include: {
                order: {
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

        if (!kitchenOrder) {
            throw new NotFoundException(
                `Kitchen order with ID ${id} was not found`,
            );
        }

        return kitchenOrder;
    }

    async updateStatus(
        id: number,
        status: KitchenOrderStatus,
        user: AuthenticatedRequest['user'],
    ) {
        if (user.role !== UserRole.KITCHEN) {
            throw new ForbiddenException(
                'Acceso denegado: solo KITCHEN puede modificar estados de cocina',
            );
        }

        const kitchenOrder = await this.findOne(id, user);

        const validTransitions: Record<
            KitchenOrderStatus,
            KitchenOrderStatus[]
        > = {
            RECEIVED: [KitchenOrderStatus.PREPARING],
            PREPARING: [KitchenOrderStatus.READY],
            READY: [],
        };

        if (
            !validTransitions[kitchenOrder.status].includes(status)
        ) {
            throw new ForbiddenException(
                `Invalid transition from ${kitchenOrder.status} to ${status}`,
            );
        }

        return await this.prisma.kitchenOrder.update({
            where: { id: kitchenOrder.id, status: kitchenOrder.status },
            data: { status },
        });
    } catch(error: unknown) {
        const prismaError = error as { code?: string };
        if (prismaError.code === 'P2025') {
            throw new ConflictException(
                'El estado del pedido de cocina ha cambiado. Por favor, inténtelo de nuevo.',
            );
        }
        throw error;
    }
}
