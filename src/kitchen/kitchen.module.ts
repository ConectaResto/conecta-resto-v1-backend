import { Module } from '@nestjs/common';
import { KitchenService } from './kitchen.service.js';
import { KitchenController } from './kitchen.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
    imports: [PrismaModule, AuthModule],
    controllers: [KitchenController],
    providers: [KitchenService],
})
export class KitchenModule { }
