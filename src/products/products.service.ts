import {
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateProductDto } from './dto/requests/create-product.dto.js';
import { UpdateProductDto } from './dto/requests/update-product.dto.js';
import { AssignCategoriesDto } from './dto/requests/assign-categories.dto.js';
import { mapProductResponse } from './mappers/product-response.mapper.js';
import { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface.js';
import { UserRole } from '../../generated/prisma/enums.js';


@Injectable()
export class ProductsService {
    constructor(private readonly prisma: PrismaService) { }

    async create(
        createProductDto: CreateProductDto,
        user: AuthenticatedRequest['user'],
    ) {
        const restaurantId =
            user.role === UserRole.SUPER_ADMIN
                ? createProductDto.restaurantId
                : user.restaurantId!;

        const restaurant = await this.prisma.restaurant.findUnique({
            where: {
                id: restaurantId,
            },
        });

        if (!restaurant) {
            throw new NotFoundException('Restaurant not found');
        }

        const product = await this.prisma.product.create({
            data: {
                ...createProductDto,
                restaurantId,
            },
            include: {
                productCategories: {
                    include: {
                        category: true,
                    },
                },
            },
        });

        return mapProductResponse(product);
    }

    async findAll(user: AuthenticatedRequest['user']) {
        const products = await this.prisma.product.findMany({
            where:
                user.role === UserRole.SUPER_ADMIN
                    ? {}
                    : { restaurantId: user.restaurantId! },
            orderBy: {
                createdAt: 'desc',
            },
            include: {
                productCategories: {
                    include: {
                        category: true,
                    },
                },
            },
        });

        return products.map(mapProductResponse);
    }

    async findOne(
        id: number,
        user: AuthenticatedRequest['user'],
    ) {
        const product = await this.prisma.product.findFirst({
            where: {
                id,
                ...(user.role !== UserRole.SUPER_ADMIN && {
                    restaurantId: user.restaurantId!,
                }),
            },
            include: {
                productCategories: {
                    include: {
                        category: true,
                    },
                },
            },
        });

        if (!product) {
            throw new NotFoundException('Product not found');
        }

        return mapProductResponse(product);
    }

    async update(
        id: number,
        updateProductDto: UpdateProductDto,
        user: AuthenticatedRequest['user'],
    ) {
        await this.findOne(id, user);

        const product = await this.prisma.product.update({
            where: {
                id,
            },
            data:
                user.role === UserRole.SUPER_ADMIN
                    ? updateProductDto
                    : {
                        ...updateProductDto,
                        restaurantId: user.restaurantId!,
                    },
            include: {
                productCategories: {
                    include: {
                        category: true,
                    },
                },
            },
        });

        return mapProductResponse(product);
    }

    async remove(
        id: number,
        user: AuthenticatedRequest['user'],
    ) {
        await this.findOne(id, user);

        await this.prisma.product.delete({
            where: {
                id,
            },
        });
    }

    async assignCategories(
        id: number,
        assignCategoriesDto: AssignCategoriesDto,
        user: AuthenticatedRequest['user'],
    ) {
        const product = await this.findOne(id, user);

        const categoryIds = [...new Set(assignCategoriesDto.categoryIds)];

        const categories = await this.prisma.category.findMany({
            where: {
                id: {
                    in: categoryIds,
                },
                restaurantId: product.restaurantId,
            },
        });

        if (categories.length !== categoryIds.length) {
            throw new NotFoundException(
                'One or more categories were not found in this restaurant',
            );
        }

        await this.prisma.$transaction(async (tx) => {
            for (const categoryId of categoryIds) {
                await tx.productCategory.upsert({
                    where: {
                        productId_categoryId: {
                            productId: id,
                            categoryId,
                        },
                    },
                    update: {},
                    create: {
                        productId: id,
                        categoryId,
                    },
                });
            }
        });

        return this.findOne(id, user);
    }

    async removeCategory(
        id: number,
        categoryId: number,
        user: AuthenticatedRequest['user'],
    ) {
        await this.findOne(id, user);

        const relation = await this.prisma.productCategory.findUnique({
            where: {
                productId_categoryId: {
                    productId: id,
                    categoryId,
                },
            },
        });

        if (!relation) {
            throw new NotFoundException(
                'This category is not assigned to the product',
            );
        }

        await this.prisma.productCategory.delete({
            where: {
                productId_categoryId: {
                    productId: id,
                    categoryId,
                },
            },
        });

        return this.findOne(id, user);
    }
}