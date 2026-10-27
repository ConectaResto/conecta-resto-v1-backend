import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateTableDto } from './dto/create-table.dto.js';
import { Prisma } from '../../generated/prisma/client.js';
import { UpdateTableDto } from './dto/update-table.dto.js';

@Injectable()
export class TablesService {
    constructor(private readonly prisma: PrismaService) { }

    // Create a table
    async create(createTableDto: CreateTableDto) {
        const { number, restaurantId } = createTableDto;

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
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002'
            ) {
                throw new ConflictException(
                    `Table number ${number} already exists in this restaurant`,
                );
            }

            throw error;
        }
    }

    // Get all tables
    async findAll() {
        return this.prisma.table.findMany({
            include: {
                restaurant: true,
            },
            orderBy: {
                number: 'asc',
            },
        });
    }

    // Get a table by ID
    async findOne(id: number) {
        const table = await this.prisma.table.findUnique({
            where: { id },
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
    async update(id: number, updateTableDto: UpdateTableDto) {
        await this.findOne(id);

        try {
            return await this.prisma.table.update({
                where: { id },
                data: updateTableDto,
                include: {
                    restaurant: true,
                },
            });
        } catch (error) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002'
            ) {
                throw new ConflictException(
                    'A table with this number already exists in this restaurant',
                );
            }

            throw error;
        }
    }

    // Delete a table
    async remove(id: number) {
        await this.findOne(id);

        await this.prisma.table.delete({
            where: { id },
        });
    }
}   