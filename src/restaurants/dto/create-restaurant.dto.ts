import {
    IsEmail,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

export class CreateRestaurantDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(150)
    name: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    address: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(30)
    phone: string;

    @IsOptional()
    @IsEmail()
    @MaxLength(150)
    email?: string;
}