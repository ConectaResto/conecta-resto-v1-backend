import { UserRole } from "../../../../generated/prisma/enums.js";

export class UserResponseDto {
    id: number;
    name: string;
    email: string;
    role: UserRole;
    restaurantId: number | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}