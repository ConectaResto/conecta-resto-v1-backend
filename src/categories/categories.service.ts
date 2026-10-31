import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { handlePrismaUniqueConstraintError } from '../common/utils/handle-prisma-unique-constraint.js';
import { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface.js';
import { UserRole } from '../../generated/prisma/enums.js';

@Injectable()
export class CategoriesService {
    constructor(private readonly prisma: PrismaService) { }

    async create(
        createCategoryDto: CreateCategoryDto,
        user: AuthenticatedRequest['user'],
    ) {
        const restaurantId =
            user.role === UserRole.SUPER_ADMIN
                ? createCategoryDto.restaurantId
                : user.restaurantId!;

        const restaurant = await this.prisma.restaurant.findUnique({
            where: {
                id: restaurantId,
            },
        });

        if (!restaurant) {
            throw new NotFoundException(
                `Restaurant with ID ${restaurantId} was not found`,
            );
        }

        try {
            return await this.prisma.category.create({
                data: {
                    ...createCategoryDto,
                    restaurantId,
                },
            });
        } catch (error) {
            handlePrismaUniqueConstraintError(
                error,
                'A category with this name already exists in this restaurant',
            );
        }
    }

    async findAll(user: AuthenticatedRequest['user']) {
        return this.prisma.category.findMany({
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
                        product: true,
                    },
                },
            },
        });
    }

    async findOne(
        id: number,
        user: AuthenticatedRequest['user'],
    ) {
        const category = await this.prisma.category.findFirst({
            where: {
                id,
                ...(user.role !== UserRole.SUPER_ADMIN && {
                    restaurantId: user.restaurantId!,
                }),
            },
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

    async update(
        id: number,
        updateCategoryDto: UpdateCategoryDto,
        user: AuthenticatedRequest['user'],
    ) {
        const category = await this.findOne(id, user);

        try {
            return await this.prisma.category.update({
                where: { id },
                data:
                    user.role === UserRole.SUPER_ADMIN
                        ? updateCategoryDto
                        : {
                            ...updateCategoryDto,
                            restaurantId: category.restaurantId,
                        },
            });
        } catch (error) {
            handlePrismaUniqueConstraintError(
                error,
                'A category with this name already exists in this restaurant',
            );
        }
    }

    async remove(
        id: number,
        user: AuthenticatedRequest['user'],
    ) {
        await this.findOne(id, user);

        return this.prisma.category.delete({
            where: { id },
        });
    }
}