import { Module } from '@nestjs/common';
import { TablesService } from './tables.service.js';
import { TablesController } from './tables.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [TablesController],
  providers: [TablesService],
})
export class TablesModule { }