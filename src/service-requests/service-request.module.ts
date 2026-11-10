import { Module } from '@nestjs/common';
import { ServiceRequestService } from './service-request.service.js';
import { ServiceRequestController } from './service-request.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ServiceRequestController],
  providers: [ServiceRequestService],
})
export class ServiceRequestModule { }
