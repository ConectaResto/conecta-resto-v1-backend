import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma/client.js';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService
    extends PrismaClient
    implements OnModuleInit {
    constructor(configService: ConfigService) {
        const adapter = new PrismaMariaDb({
            host: configService.getOrThrow<string>('DB_HOST'),
            port: configService.getOrThrow<number>('DB_PORT'),
            user: configService.getOrThrow<string>('DB_USER'),
            password: configService.getOrThrow<string>('DB_PASSWORD'),
            database: configService.getOrThrow<string>('DB_NAME'),
        });

        super({ adapter });
    }

    async onModuleInit() {
        await this.$connect();
    }
}