import { Module } from '@nestjs/common';
import { TablesService } from './tables.service.js';
import { TablesController } from './tables.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [TablesController],
  providers: [TablesService],
})
export class TablesModule { }