import { Module } from '@nestjs/common';
import { MenuService } from './menu.service.js';
import { MenuController } from './menu.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
    imports: [PrismaModule],
    controllers: [MenuController],
    providers: [MenuService],
})
export class MenuModule { }
