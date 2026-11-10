import {
    Injectable,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class MenuService {
    constructor(private readonly prisma: PrismaService) { }

    async getMenu(restaurantId: number, tableId: number) {
        const table = await this.prisma.table.findFirst({
            where: {
                id: tableId,
                restaurantId,
                isActive: true,
            },
            include: {
                restaurant: {
                    select: {
                        id: true,
                        name: true,
                        isActive: true,
                    },
                },
            },
        });

        if (!table) {
            throw new NotFoundException('Table not found or inactive');
        }

        if (!table.restaurant.isActive) {
            throw new ForbiddenException('Restaurant is inactive');
        }

        const categories = await this.prisma.category.findMany({
            where: {
                restaurantId,
            },
            include: {
                productCategories: {
                    where: {
                        product: {
                            restaurantId,
                        },
                    },
                    include: {
                        product: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        const categoriesWithProducts = categories.map((category) => ({
            id: category.id,
            name: category.name,
            description: category.description,
            products: category.productCategories.map((pc) => ({
                id: pc.product.id,
                name: pc.product.name,
                price: pc.product.price,
                image: pc.product.image,
            })),
        }));

        return {
            restaurant: {
                id: table.restaurant.id,
                name: table.restaurant.name,
                isActive: table.restaurant.isActive,
            },
            table: {
                id: table.id,
                number: table.number,
                isAvailable: table.isAvailable,
            },
            categories: categoriesWithProducts,
        };
    }
}
