import { Type } from 'class-transformer';
import {
    IsEmail,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    Min,
    MinLength,
} from 'class-validator';
import { UserRole } from '../../../generated/prisma/enums.js';

export class CreateUserDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(150)
    name: string;

    @IsEmail()
    @MaxLength(191)
    email: string;

    @IsString()
    @MinLength(8)
    @MaxLength(72)
    password: string;

    @IsEnum(UserRole)
    role: UserRole;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    restaurantId?: number;
}