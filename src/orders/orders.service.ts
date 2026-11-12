import {
    Injectable,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { OrderStatus } from '../../generated/prisma/enums.js';
import { KitchenOrderStatus } from '../../generated/prisma/enums.js';
import { OrderItemDto } from './dto/order-item.dto.js';

@Injectable()
export class OrdersService {
    constructor(private readonly prisma: PrismaService) { }

    async createFromQr(
        qrToken: string,
        items: OrderItemDto[],
    ) {
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

            // 3. Buscar o crear servicio ACTIVE para esta mesa
            let service = await prisma.service.findFirst({
                where: { tableId: table.id, status: 'ACTIVE' },
            });

            if (!service) {
                service = await prisma.service.create({
                    data: {
                        tableId: table.id,
                        restaurantId: table.restaurant_id,
                        status: 'ACTIVE',
                    },
                });
            }

            // 4. Validar productos y congelar precios
            const orderItemsData = [];
            for (const item of items) {
                const product = await prisma.product.findUnique({
                    where: { id: item.productId },
                });

                if (!product) {
                    throw new NotFoundException(
                        `Producto con ID ${item.productId} no encontrado`,
                    );
                }

                if (product.restaurantId !== table.restaurant_id) {
                    throw new ForbiddenException(
                        `El producto ${item.productId} no pertenece a este restaurante`,
                    );
                }

                orderItemsData.push({
                    productId: item.productId,
                    quantity: item.quantity,
                    price: product.price,
                });
            }

            // 5. Crear la orden con estado PENDING
            const order = await prisma.order.create({
                data: {
                    serviceId: service.id,
                    restaurantId: table.restaurant_id,
                    status: 'PENDING',
                    orderItems: {
                        create: orderItemsData,
                    },
                },
                include: {
                    orderItems: {
                        include: {
                            product: true,
                        },
                    },
                },
            });

            return order;
        });
    }

    async findPending(user: AuthenticatedRequest['user']) {
        return this.prisma.order.findMany({
            where:
                user.role === UserRole.SUPER_ADMIN
                    ? { status: 'PENDING' }
                    : {
                          restaurantId: user.restaurantId!,
                          status: 'PENDING',
                      },
            include: {
                orderItems: {
                    include: {
                        product: true,
                    },
                },
                service: {
                    include: {
                        table: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'asc',
            },
        });
    }

    async authorize(
        orderId: number,
        user: AuthenticatedRequest['user'],
    ) {
        return this.prisma.$transaction(async (prisma) => {
            // 1. Obtener la orden para validar estado y restaurante
            const order = await prisma.order.findUnique({
                where: { id: orderId },
            });

            if (!order) {
                throw new NotFoundException('Orden no encontrada');
            }

            if (order.status !== 'PENDING') {
                throw new ForbiddenException(
                    'La orden ya fue autorizada o no está pendiente',
                );
            }

            // 2. Validar aislamiento por restaurante
            if (user.role !== UserRole.SUPER_ADMIN) {
                if (order.restaurantId !== user.restaurantId) {
                    throw new ForbiddenException(
                        'No pertenece a su restaurante',
                    );
                }
            }

            // 3. Validar rol permitido para autorizar
            if (user.role === UserRole.CASHIER) {
                throw new ForbiddenException(
                    'Rol no autorizado para autorizar órdenes',
                );
            }

            // 4. Autorizar la orden de forma atómica: solo actualizar si sigue PENDING
            try {
                const authorizedOrder = await prisma.order.update({
                    where: {
                        id: orderId,
                        status: 'PENDING',
                    },
                    data: {
                        status: 'AUTHORIZED',
                        authorizedAt: new Date(),
                    },
                    include: {
                        orderItems: {
                            include: {
                                product: true,
                            },
                        },
                    },
                });

                // 5. Crear registro de cocina automáticamente
                await prisma.kitchenOrder.create({
                    data: {
                        orderId: order.id,
                        status: KitchenOrderStatus.RECEIVED,
                    },
                });

                return authorizedOrder;
            } catch (error) {
                const prismaError = error as { code?: string };
                if (prismaError.code === 'P2025') {
                    throw new ForbiddenException(
                        'La orden ya fue autorizada por otra solicitud',
                    );
                }
                throw error;
            }
        });
    }
}
