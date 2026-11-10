import { IsString, IsNotEmpty } from 'class-validator';

export class CreateServiceDto {
  @IsString()
  @IsNotEmpty()
  qrToken: string;
}
