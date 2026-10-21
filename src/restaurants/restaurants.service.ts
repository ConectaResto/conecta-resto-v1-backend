import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateRestaurantDto } from './dto/create-restaurant.dto.js';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto.js';

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

    async findOne(id: number) {
        const restaurant = await this.prisma.restaurant.findUnique({
            where: { id },
        });

        if (!restaurant) {
            throw new NotFoundException(
                `Restaurant with ID ${id} was not found`,
            );
        }

        return restaurant;
    }

    async update(
        id: number,
        updateRestaurantDto: UpdateRestaurantDto,
    ) {
        await this.findOne(id);

        return this.prisma.restaurant.update({
            where: { id },
            data: updateRestaurantDto,
        });
    }

    async toggleStatus(id: number) {
        const restaurant = await this.findOne(id);

        return this.prisma.restaurant.update({
            where: { id },
            data: {
                isActive: !restaurant.isActive,
            },
        });
    }

}