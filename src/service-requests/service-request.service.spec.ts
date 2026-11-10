import { Test, TestingModule } from '@nestjs/testing';
import { ServiceRequestService } from './service-request.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '../../generated/prisma/enums.js';

describe('ServiceRequestService', () => {
  let service: ServiceRequestService;
  let prisma: PrismaService;
  let mockPrisma: any;

  const waiterUser = { sub: 2, role: UserRole.WAITER, restaurantId: 1 };
  const cashierUser = { sub: 3, role: UserRole.CASHIER, restaurantId: 1 };
  const adminUser = { sub: 1, role: UserRole.ADMIN, restaurantId: 1 };
  const superAdminUser = { sub: 4, role: UserRole.SUPER_ADMIN, restaurantId: null };

  beforeEach(async () => {
    mockPrisma = {
      $queryRaw: vi.fn(),
      restaurant: {
        findUnique: vi.fn(),
      },
      serviceRequest: {
        findFirst: vi.fn(),
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceRequestService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: vi.fn(async (callback: any) => {
              return callback(mockPrisma);
            }),
            $queryRaw: mockPrisma.$queryRaw,
            restaurant: mockPrisma.restaurant,
            serviceRequest: mockPrisma.serviceRequest,
          },
        },
      ],
    }).compile();

    service = module.get<ServiceRequestService>(ServiceRequestService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('QR válido, sin servicio ACTivo → crea servicio ACTIVE', async () => {
    const qrToken = 'test-qr-token-123';
    const mockTableRow = [{ id: 1, restaurant_id: 1, is_active: 1 }];
    const mockRestaurant = {
      id: 1,
      name: 'Test Restaurant',
      address: 'Calle 1',
      phone: '3001234567',
      email: 'test@test.com',
      isActive: true,
      createdAt: new Date(),
    };
    const mockService = {
      id: 1,
      tableId: 1,
      restaurantId: 1,
      status: 'ACTIVE',
      createdAt: new Date(),
      closedAt: null,
    };

    vi.mocked(mockPrisma.$queryRaw).mockResolvedValueOnce(mockTableRow);
    vi.mocked(mockPrisma.restaurant.findUnique).mockResolvedValue(mockRestaurant);
    vi.mocked(mockPrisma.serviceRequest.findFirst).mockResolvedValue(null);
    vi.mocked(mockPrisma.serviceRequest.create).mockResolvedValue(mockService);

    const result = await service.findOrCreateActiveFromQr(qrToken);

    expect(result).toEqual(mockService);
    expect(mockPrisma.serviceRequest.create).toHaveBeenCalledWith({
      data: {
        tableId: 1,
        restaurantId: 1,
        status: 'ACTIVE',
      },
      include: {
        table: true,
        restaurant: true,
      },
    });
  });

  it('QR válido, ya existe servicio ACTIVE → reutiliza (no crea)', async () => {
    const qrToken = 'test-qr-token-123';
    const mockTableRow = [{ id: 1, restaurant_id: 1, is_active: 1 }];
    const mockRestaurant = {
      id: 1,
      name: 'Test Restaurant',
      address: 'Calle 1',
      phone: '3001234567',
      email: 'test@test.com',
      isActive: true,
      createdAt: new Date(),
    };
    const mockExistingService = {
      id: 5,
      tableId: 1,
      restaurantId: 1,
      status: 'ACTIVE',
      createdAt: new Date(),
      closedAt: null,
    };

    vi.mocked(mockPrisma.$queryRaw).mockResolvedValueOnce(mockTableRow);
    vi.mocked(mockPrisma.restaurant.findUnique).mockResolvedValue(mockRestaurant);
    vi.mocked(mockPrisma.serviceRequest.findFirst).mockResolvedValue(mockExistingService);

    const result = await service.findOrCreateActiveFromQr(qrToken);

    expect(result).toEqual(mockExistingService);
    expect(mockPrisma.serviceRequest.create).not.toHaveBeenCalled();
  });

  it('QR inválido o inexistente → NotFoundException', async () => {
    vi.mocked(mockPrisma.$queryRaw).mockResolvedValueOnce([]);

    await expect(
      service.findOrCreateActiveFromQr('invalid-token'),
    ).rejects.toThrow(NotFoundException);
  });

  it('Mesa inactiva → NotFoundException', async () => {
    // SQL filtra por is_active = 1, así que mesa inactiva no devuelve filas
    vi.mocked(mockPrisma.$queryRaw).mockResolvedValueOnce([]);

    await expect(
      service.findOrCreateActiveFromQr('some-token'),
    ).rejects.toThrow(NotFoundException);
  });

  it('Restaurante inactivo → ForbiddenException', async () => {
    const mockTableRow = [{ id: 1, restaurant_id: 1, is_active: 1 }];
    const mockRestaurant = {
      id: 1,
      name: 'Test Restaurant',
      address: 'Calle 1',
      phone: '3001234567',
      email: 'test@test.com',
      isActive: false,
      createdAt: new Date(),
    };

    vi.mocked(mockPrisma.$queryRaw).mockResolvedValueOnce(mockTableRow);
    vi.mocked(mockPrisma.restaurant.findUnique).mockResolvedValue(mockRestaurant);

    await expect(
      service.findOrCreateActiveFromQr('some-token'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('SUPER_ADMIN consulta todos los servicios → sin filtro restaurantId', async () => {
    const mockServices = [
      {
        id: 1,
        tableId: 1,
        restaurantId: 1,
        status: 'ACTIVE',
        createdAt: new Date(),
        closedAt: null,
      },
      {
        id: 2,
        tableId: 2,
        restaurantId: 2,
        status: 'ACTIVE',
        createdAt: new Date(),
        closedAt: null,
      },
    ];

    vi.mocked(mockPrisma.serviceRequest.findMany).mockResolvedValue(mockServices);

    const result = await service.findAll(superAdminUser);

    expect(result).toEqual(mockServices);
    expect(mockPrisma.serviceRequest.findMany).toHaveBeenCalledWith({
      where: {},
      include: {
        table: true,
        restaurant: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('ADMIN consulta servicios → filtro restaurantId propio', async () => {
    vi.mocked(mockPrisma.serviceRequest.findMany).mockResolvedValue([]);

    await service.findAll(adminUser);

    expect(mockPrisma.serviceRequest.findMany).toHaveBeenCalledWith({
      where: { restaurantId: 1 },
      include: {
        table: true,
        restaurant: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('SUPER_ADMIN puede consultar cualquier servicio (findOne sin filtro)', async () => {
    const mockService = {
      id: 2,
      tableId: 2,
      restaurantId: 2,
      status: 'ACTIVE',
      createdAt: new Date(),
      closedAt: null,
    };

    vi.mocked(mockPrisma.serviceRequest.findFirst).mockResolvedValue(mockService);

    const result = await service.findOne(2, superAdminUser);

    expect(result).toEqual(mockService);
    expect(mockPrisma.serviceRequest.findFirst).toHaveBeenCalledWith({
      where: { id: 2 },
      include: {
        table: true,
        restaurant: true,
      },
    });
  });

  it('ADMIN no puede consultar servicio de otro restaurante → NotFoundException', async () => {
    vi.mocked(mockPrisma.serviceRequest.findFirst).mockResolvedValue(null);

    await expect(service.findOne(2, adminUser)).rejects.toThrow(NotFoundException);

    expect(mockPrisma.serviceRequest.findFirst).toHaveBeenCalledWith({
      where: { id: 2, restaurantId: 1 },
      include: {
        table: true,
        restaurant: true,
      },
    });
  });

  it('WAITER cierra servicio de su restaurante → CLOSED con closedAt', async () => {
    const mockService = {
      id: 1,
      tableId: 1,
      restaurantId: 1,
      status: 'ACTIVE',
      createdAt: new Date(),
      closedAt: null,
    };
    const mockTableRow = [{ id: 1, restaurant_id: 1 }];
    const mockClosedService = {
      id: 1,
      tableId: 1,
      restaurantId: 1,
      status: 'CLOSED',
      createdAt: new Date(),
      closedAt: new Date(),
    };

    vi.mocked(mockPrisma.serviceRequest.findUnique).mockResolvedValue(mockService);
    vi.mocked(mockPrisma.$queryRaw).mockResolvedValue(mockTableRow);
    vi.mocked(mockPrisma.serviceRequest.findUnique).mockResolvedValueOnce(mockService);
    vi.mocked(mockPrisma.serviceRequest.update).mockResolvedValue(mockClosedService);

    const result = await service.close(1, waiterUser);

    expect(result.status).toEqual('CLOSED');
    expect(result.closedAt).toBeDefined();
    expect(mockPrisma.serviceRequest.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        status: 'CLOSED',
        closedAt: expect.any(Date),
      },
    });
  });

  it('CASHIER intenta cerrar → ForbiddenException', async () => {
    vi.mocked(mockPrisma.serviceRequest.findUnique).mockResolvedValue({
      id: 1,
      tableId: 1,
      restaurantId: 1,
      status: 'ACTIVE',
      createdAt: new Date(),
      closedAt: null,
    });
    vi.mocked(mockPrisma.$queryRaw).mockResolvedValue([{ id: 1, restaurant_id: 1 }]);

    await expect(
      service.close(1, cashierUser),
    ).rejects.toThrow(ForbiddenException);
  });

  it('WAITER intenta cerrar servicio de otro restaurante → ForbiddenException', async () => {
    vi.mocked(mockPrisma.serviceRequest.findUnique).mockResolvedValue({
      id: 1,
      tableId: 2,
      restaurantId: 2,
      status: 'ACTIVE',
      createdAt: new Date(),
      closedAt: null,
    });
    vi.mocked(mockPrisma.$queryRaw).mockResolvedValue([{ id: 2, restaurant_id: 2 }]);

    await expect(
      service.close(1, waiterUser),
    ).rejects.toThrow(ForbiddenException);
  });
});
