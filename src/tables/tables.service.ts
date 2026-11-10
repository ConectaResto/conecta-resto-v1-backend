import {
    Injectable,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreateTableDto } from './dto/create-table.dto.js';
import { UpdateTableDto } from './dto/update-table.dto.js';
import { handlePrismaUniqueConstraintError } from '../common/utils/handle-prisma-unique-constraint.js';
import { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { randomUUID } from 'crypto';

@Injectable()
export class TablesService {
    constructor(private readonly prisma: PrismaService) { }

    // Create a table
    async create(
        createTableDto: CreateTableDto,
        user: AuthenticatedRequest['user'],
    ) {
        const { number } = createTableDto;

        const restaurantId =
            user.role === UserRole.SUPER_ADMIN
                ? createTableDto.restaurantId
                : user.restaurantId!;

        const restaurant = await this.prisma.restaurant.findUnique({
            where: { id: restaurantId },
        });

        if (!restaurant) {
            throw new NotFoundException(
                `Restaurant with ID ${restaurantId} not found`,
            );
        }

        const qrToken = randomUUID();

        try {
            return await this.prisma.table.create({
                data: {
                    number,
                    restaurantId,
                    qrToken,
                },
                include: {
                    restaurant: true,
                },
            });
        } catch (error) {
            handlePrismaUniqueConstraintError(
                error,
                `Table number ${number} already exists in this restaurant`,
            );
        }
    }

    // Get all tables
    async findAll(user: AuthenticatedRequest['user']) {
        return this.prisma.table.findMany({
            where: {
                isActive: true,
                ...(user.role === UserRole.SUPER_ADMIN
                    ? {}
                    : { restaurantId: user.restaurantId! }),
            },
            select: {
                id: true,
                number: true,
                isActive: true,
                isAvailable: true,
                restaurantId: true,
                createdAt: true,
                restaurant: true,
            },
            orderBy: {
                number: 'asc',
            },
        });
    }

    // Get a table by ID
    async findOne(
        id: number,
        user: AuthenticatedRequest['user'],
    ) {
        const table = await this.prisma.table.findFirst({
            where: {
                id,
                isActive: true,
                ...(user.role !== UserRole.SUPER_ADMIN && {
                    restaurantId: user.restaurantId!,
                }),
            },
            select: {
                id: true,
                number: true,
                isActive: true,
                isAvailable: true,
                restaurantId: true,
                createdAt: true,
                restaurant: true,
            },
        });

        if (!table) {
            throw new NotFoundException(`Table with ID ${id} not found`);
        }

        return table;
    }

    // Update a table
    async update(
        id: number,
        updateTableDto: UpdateTableDto,
        user: AuthenticatedRequest['user'],
    ) {
        const table = await this.findOne(id, user);

        if (user.role === UserRole.WAITER) {
            const updateKeys = Object.keys(updateTableDto);
            const hasNonAvailabilityUpdate = updateKeys.some(
                (key) => key !== 'isAvailable',
            );
            if (hasNonAvailabilityUpdate) {
                throw new ForbiddenException(
                    'Waiters can only update table availability (isAvailable)',
                );
            }
        }

        try {
            return await this.prisma.table.update({
                where: { id },
                data:
                    user.role === UserRole.SUPER_ADMIN
                        ? updateTableDto
                        : {
                              ...updateTableDto,
                              restaurantId: table.restaurantId,
                          },
                include: {
                    restaurant: true,
                },
            });
        } catch (error) {
            handlePrismaUniqueConstraintError(
                error,
                'A table with this number already exists in this restaurant',
            );
        }
    }

    // Delete a table (soft delete)
    async remove(
        id: number,
        user: AuthenticatedRequest['user'],
    ) {
        const table = await this.findOne(id, user);

        await this.prisma.table.update({
            where: { id },
            data: { isActive: false },
        });
    }
}