import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { randomUUID } from 'crypto';

const adapter = new PrismaMariaDb({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'conectaresto',
});

const prisma = new PrismaClient({ adapter });

async function main() {
    const tablesWithoutToken = await prisma.$queryRaw`
        SELECT id, number, restaurant_id
        FROM tables
        WHERE qr_token IS NULL
    `;

    if (!tablesWithoutToken || tablesWithoutToken.length === 0) {
        console.log('No hay mesas pendientes de asignar qr_token');
        return;
    }

    console.log(`Encontradas ${tablesWithoutToken.length} mesas sin qr_token`);

    let updatedCount = 0;

    for (const table of tablesWithoutToken) {
        const token = randomUUID();
        await prisma.table.update({
            where: { id: table.id },
            data: { qrToken: token },
        });
        updatedCount++;
        console.log(
            `Mesa ${table.id} (número ${table.number}) -> qr_token: ${token}`,
        );
    }

    console.log(`Asignación de qr_token completada: ${updatedCount} mesas actualizadas`);
}

main()
    .catch((e) => {
        console.error('Error asignando qr_tokens:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
