import {
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreateTableDto } from './dto/create-table.dto.js';
import { UpdateTableDto } from './dto/update-table.dto.js';
import { handlePrismaUniqueConstraintError } from '../common/utils/handle-prisma-unique-constraint.js';
import { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface.js';
import { UserRole } from '../../generated/prisma/enums.js';

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

        try {
            return await this.prisma.table.create({
                data: {
                    number,
                    restaurantId,
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
            where:
                user.role === UserRole.SUPER_ADMIN
                    ? {}
                    : { restaurantId: user.restaurantId! },
            include: {
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
                ...(user.role !== UserRole.SUPER_ADMIN && {
                    restaurantId: user.restaurantId!,
                }),
            },
            include: {
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

    // Delete a table
    async remove(
        id: number,
        user: AuthenticatedRequest['user'],
    ) {
        await this.findOne(id, user);

        await this.prisma.table.delete({
            where: { id },
        });
    }
}