import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';
import { ServiceRequestService } from './../src/service-requests/service-request.service.js';

describe('ServiceRequest concurrency (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let service: ServiceRequestService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    service = moduleFixture.get<ServiceRequestService>(ServiceRequestService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('dos solicitudes concurrentes con mismo qrToken devuelven el mismo servicio ACTIVE', async () => {
    // Preparar: crear restaurante y mesa activos con qrToken conocido
    const restaurant = await prisma.restaurant.create({
      data: {
        name: 'Test Restaurant Concurrency',
        address: 'Calle 1',
        phone: '3001234567',
        email: 'concurrency@test.com',
        isActive: true,
      },
    });

    const qrToken = 'concurrency-test-token-001';
    const table = await prisma.table.create({
      data: {
        number: 999,
        qrToken: qrToken,
        isActive: true,
        restaurantId: restaurant.id,
      },
    });

    try {
      // Ejecutar dos solicitudes en paralelo
      const [result1, result2] = await Promise.all([
        service.findOrCreateActiveFromQr(qrToken),
        service.findOrCreateActiveFromQr(qrToken),
      ]);

      // Ambas obtienen el mismo servicio
      expect(result1.id).toEqual(result2.id);
      expect(result1.status).toEqual('ACTIVE');
      expect(result2.status).toEqual('ACTIVE');

      // Solo existe un servicio ACTIVE para esa mesa
      const activeCount = await prisma.serviceRequest.count({
        where: { tableId: table.id, status: 'ACTIVE' },
      });
      expect(activeCount).toEqual(1);
    } finally {
      // Limpiar datos de prueba
      await prisma.serviceRequest.deleteMany({
        where: { tableId: table.id },
      });
      await prisma.table.delete({ where: { id: table.id } });
      await prisma.restaurant.delete({ where: { id: restaurant.id } });
    }
  });
});
