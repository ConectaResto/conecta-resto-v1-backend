import {
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateProductDto } from './dto/requests/create-product.dto.js';
import { UpdateProductDto } from './dto/requests/update-product.dto.js';
import { AssignCategoriesDto } from './dto/requests/assign-categories.dto.js';
import { mapProductResponse } from './mappers/product-response.mapper.js';

@Injectable()
export class ProductsService {
    constructor(private readonly prisma: PrismaService) { }

    // Create product
    async create(createProductDto: CreateProductDto) {
        const restaurant = await this.prisma.restaurant.findUnique({
            where: {
                id: createProductDto.restaurantId,
            },
        });

        if (!restaurant) {
            throw new NotFoundException('Restaurant not found');
        }

        const product = await this.prisma.product.create({
            data: createProductDto,
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

    // Get all products
    async findAll() {
        const products = await this.prisma.product.findMany({
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

    // Get product by ID
    async findOne(id: number) {
        const product = await this.prisma.product.findUnique({
            where: { id },
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

    // Update product
    async update(id: number, updateProductDto: UpdateProductDto) {
        await this.findOne(id);

        const product = await this.prisma.product.update({
            where: {
                id,
            },
            data: updateProductDto,
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

    // Delete product
    async remove(id: number) {
        await this.findOne(id);

        await this.prisma.product.delete({
            where: {
                id,
            },
        });
    }

    // Assign categories to a product
    async assignCategories(id: number, assignCategoriesDto: AssignCategoriesDto) {
        const product = await this.findOne(id);

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

        return this.findOne(id);
    }

    // Remove a category from a product
    async removeCategory(id: number, categoryId: number) {
        await this.findOne(id);

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

        return this.findOne(id);
    }
}