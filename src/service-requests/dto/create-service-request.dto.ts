import { IsNotEmpty, IsString } from 'class-validator';

export class CreateServiceRequestDto {
    @IsString()
    @IsNotEmpty()
    qrToken: string;
}
