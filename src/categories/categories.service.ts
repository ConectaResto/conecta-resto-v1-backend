import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';

@Injectable()
export class CategoriesService {
    constructor(private readonly prisma: PrismaService) { }

    private handlePrismaError(error: unknown): never {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
        ) {
            throw new ConflictException(
                'A category with this name already exists in this restaurant',
            );
        }

        throw error;
    }

    // Create a category
    async create(createCategoryDto: CreateCategoryDto) {
        const restaurant = await this.prisma.restaurant.findUnique({
            where: {
                id: createCategoryDto.restaurantId,
            },
        });

        if (!restaurant) {
            throw new NotFoundException(
                `Restaurant with ID ${createCategoryDto.restaurantId} was not found`,
            );
        }

        try {
            return await this.prisma.category.create({
                data: createCategoryDto,
            });
        } catch (error) {
            this.handlePrismaError(error);
        }
    }

    // Get all categories
    async findAll() {
        return this.prisma.category.findMany({
            orderBy: {
                createdAt: 'desc',
            },
            include: {
                productCategories: {
                    include: {
                        product: true,
                    },
                },
            },
        });
    }

    // Get a category by ID
    async findOne(id: number) {
        const category = await this.prisma.category.findUnique({
            where: { id },
            include: {
                productCategories: {
                    include: {
                        product: true,
                    },
                },
            },
        });

        if (!category) {
            throw new NotFoundException(
                `Category with ID ${id} was not found`,
            );
        }

        return category;
    }

    // Update a category
    async update(id: number, updateCategoryDto: UpdateCategoryDto) {
        await this.findOne(id);

        try {
            return await this.prisma.category.update({
                where: { id },
                data: updateCategoryDto,
            });
        } catch (error) {
            this.handlePrismaError(error);
        }
    }

    // Delete a category
    async remove(id: number) {
        await this.findOne(id);

        return this.prisma.category.delete({
            where: { id },
        });
    }
}