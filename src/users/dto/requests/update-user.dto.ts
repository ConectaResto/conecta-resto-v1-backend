import {
    IsBoolean,
    IsEmail,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';
import { UserRole } from '../../../../generated/prisma/enums.js';

export class UpdateUserDto {
    @IsOptional()
    @IsString()
    @MaxLength(150)
    name?: string;

    @IsOptional()
    @IsEmail()
    @MaxLength(191)
    email?: string;

    @IsOptional()
    @IsString()
    @MinLength(8)
    @MaxLength(72)
    password?: string;

    @IsOptional()
    @IsEnum(UserRole)
    role?: UserRole;

    @IsOptional()
    @IsInt()
    restaurantId?: number | null;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}