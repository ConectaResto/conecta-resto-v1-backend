import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service.js';

import { CreateUserDto } from './dto/requests/create-user.dto.js';
import { UpdateUserDto } from './dto/requests/update-user.dto.js';

import {
    mapUserResponse,
    mapUserResponseList,
} from './mappers/user-response.mapper.js';

import { handlePrismaUniqueConstraintError } from '../common/utils/handle-prisma-unique-constraint.js';

import { UserRole } from '../../generated/prisma/client.js';

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) { }

    async create(createUserDto: CreateUserDto) {
        const { password, ...userData } = createUserDto;

        this.validateRestaurantAssignment(
            userData.role,
            userData.restaurantId,
        );

        const passwordHash = await bcrypt.hash(password, 10);

        try {
            const user = await this.prisma.user.create({
                data: {
                    ...userData,
                    passwordHash,
                },
            });

            return mapUserResponse(user);
        } catch (error) {
            handlePrismaUniqueConstraintError(
                error,
                'A user with this email already exists.',
            );
        }
    }

    async findAll() {
        const users = await this.prisma.user.findMany();

        return mapUserResponseList(users);
    }

    async findOne(id: number) {
        const user = await this.prisma.user.findUnique({
            where: { id },
        });

        if (!user) {
            throw new NotFoundException(
                `User with ID ${id} not found.`,
            );
        }

        return mapUserResponse(user);
    }

    async update(id: number, updateUserDto: UpdateUserDto) {
        const currentUser = await this.prisma.user.findUnique({
            where: { id },
        });

        if (!currentUser) {
            throw new NotFoundException(
                `User with ID ${id} not found.`,
            );
        }

        const { password, ...userData } = updateUserDto;

        const role = userData.role ?? currentUser.role;

        const restaurantId =
            userData.restaurantId !== undefined
                ? userData.restaurantId
                : currentUser.restaurantId;

        this.validateRestaurantAssignment(role, restaurantId);

        const data = {
            ...userData,
            passwordHash: password
                ? await bcrypt.hash(password, 10)
                : undefined,
        };

        try {
            const user = await this.prisma.user.update({
                where: { id },
                data,
            });

            return mapUserResponse(user);
        } catch (error) {
            handlePrismaUniqueConstraintError(
                error,
                'A user with this email already exists.',
            );
        }
    }

    private validateRestaurantAssignment(
        role: UserRole,
        restaurantId: number | null | undefined,
    ) {
        if (role !== UserRole.SUPER_ADMIN && restaurantId == null) {
            throw new BadRequestException(
                'This user role requires a restaurant assignment.',
            );
        }
    }
}
