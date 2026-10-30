import {
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateRestaurantDto } from './dto/create-restaurant.dto.js';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto.js';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface.js';
import { UserRole } from '../../generated/prisma/enums.js';

@Injectable()
export class RestaurantsService {
    constructor(private readonly prisma: PrismaService) { }

    async create(createRestaurantDto: CreateRestaurantDto) {
        return this.prisma.restaurant.create({
            data: createRestaurantDto,
        });
    }

    async findAll() {
        return this.prisma.restaurant.findMany({
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    async findOne(id: number, user: AuthenticatedRequest['user']) {
        const restaurant = await this.prisma.restaurant.findUnique({
            where: { id },
            include: {
                categories: true,
            },
        });

        if (
            !restaurant ||
            (user.role !== UserRole.SUPER_ADMIN &&
                user.restaurantId !== restaurant.id)
        ) {
            throw new NotFoundException(
                `Restaurant with ID ${id} was not found`,
            );
        }

        return restaurant;
    }

    async update(
        id: number,
        updateRestaurantDto: UpdateRestaurantDto,
        user: AuthenticatedRequest['user'],
    ) {
        await this.findOne(id, user);

        return this.prisma.restaurant.update({
            where: { id },
            data: updateRestaurantDto,
        });
    }
}
