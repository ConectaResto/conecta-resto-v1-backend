import {
    BadRequestException,
    ForbiddenException,
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
import { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface.js';

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) { }

    async create(
        createUserDto: CreateUserDto,
        currentUser: AuthenticatedRequest['user'],
    ) {
        const { password, ...userData } = createUserDto;

        if (
            currentUser.role === UserRole.ADMIN &&
            userData.role === UserRole.SUPER_ADMIN
        ) {
            throw new ForbiddenException(
                'You cannot create a SUPER_ADMIN user.',
            );
        }

        const restaurantId =
            currentUser.role === UserRole.SUPER_ADMIN
                ? userData.restaurantId
                : currentUser.restaurantId!;

        this.validateRestaurantAssignment(
            userData.role,
            restaurantId,
        );

        const passwordHash = await bcrypt.hash(password, 10);

        try {
            const user = await this.prisma.user.create({
                data: {
                    ...userData,
                    restaurantId,
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

    async findAll(currentUser: AuthenticatedRequest['user']) {
        const users = await this.prisma.user.findMany({
            where:
                currentUser.role === UserRole.SUPER_ADMIN
                    ? {}
                    : { restaurantId: currentUser.restaurantId! },
        });

        return mapUserResponseList(users);
    }

    async findOne(
        id: number,
        currentUser: AuthenticatedRequest['user'],
    ) {
        const user = await this.prisma.user.findFirst({
            where: {
                id,
                ...(currentUser.role !== UserRole.SUPER_ADMIN && {
                    restaurantId: currentUser.restaurantId!,
                }),
            },
        });

        if (!user) {
            throw new NotFoundException(
                `User with ID ${id} not found.`,
            );
        }

        return mapUserResponse(user);
    }

    async update(
        id: number,
        updateUserDto: UpdateUserDto,
        currentUser: AuthenticatedRequest['user'],
    ) {
        const currentTargetUser = await this.prisma.user.findFirst({
            where: {
                id,
                ...(currentUser.role !== UserRole.SUPER_ADMIN && {
                    restaurantId: currentUser.restaurantId!,
                }),
            },
        });

        if (!currentTargetUser) {
            throw new NotFoundException(
                `User with ID ${id} not found.`,
            );
        }

        if (
            currentUser.role === UserRole.ADMIN &&
            currentTargetUser.role === UserRole.SUPER_ADMIN
        ) {
            throw new ForbiddenException(
                'You cannot modify a SUPER_ADMIN user.',
            );
        }

        if (
            currentUser.role === UserRole.ADMIN &&
            updateUserDto.role === UserRole.SUPER_ADMIN
        ) {
            throw new ForbiddenException(
                'You cannot assign the SUPER_ADMIN role.',
            );
        }

        const { password, ...userData } = updateUserDto;

        const role = userData.role ?? currentTargetUser.role;

        const restaurantId =
            currentUser.role === UserRole.SUPER_ADMIN
                ? userData.restaurantId !== undefined
                    ? userData.restaurantId
                    : currentTargetUser.restaurantId
                : currentUser.restaurantId!;

        this.validateRestaurantAssignment(role, restaurantId);

        const data = {
            ...userData,
            restaurantId,
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