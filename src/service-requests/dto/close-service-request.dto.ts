import { IsNotEmpty, IsString } from 'class-validator';

export class CloseServiceRequestDto {
    @IsString()
    @IsNotEmpty()
    serviceId: string;
}
