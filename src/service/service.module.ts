import { Module } from '@nestjs/common';
import { ServiceService } from './service.service.js';
import { ServiceController } from './service.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ServiceController],
  providers: [ServiceService],
})
export class ServiceModule { }
