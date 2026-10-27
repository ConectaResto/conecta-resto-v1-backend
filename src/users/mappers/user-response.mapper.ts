import { Prisma } from '../../../generated/prisma/client.js';
import { UserResponseDto } from '../dto/responses/user-response.dto.js';

type UserData = Prisma.UserGetPayload<{}>;

export function mapUserResponse(
    user: UserData,
): UserResponseDto {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        restaurantId: user.restaurantId,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}

export function mapUserResponseList(
    users: UserData[],
): UserResponseDto[] {
    return users.map(mapUserResponse);
}