import { Test, TestingModule } from '@nestjs/testing';
import { ServiceService } from './service.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '../../generated/prisma/enums.js';

describe('ServiceService', () => {
  let service: ServiceService;
  let prisma: PrismaService;
  let mockPrisma: any;

  const waiterUser = { sub: 2, role: UserRole.WAITER, restaurantId: 1 };
  const cashierUser = { sub: 3, role: UserRole.CASHIER, restaurantId: 1 };
  const adminUser = { sub: 1, role: UserRole.ADMIN, restaurantId: 1 };
  const superAdminUser = { sub: 4, role: UserRole.SUPER_ADMIN, restaurantId: null };

  const mockTable = {
    id: 1,
    number: 5,
    qrToken: 'qr-token-123',
    isActive: true,
    isAvailable: true,
    restaurantId: 1,
    createdAt: new Date(),
  };

  const mockRestaurant = {
    id: 1,
    name: 'Test Restaurant',
    address: 'Calle 1',
    phone: '3001234567',
    email: 'test@test.com',
    isActive: true,
    createdAt: new Date(),
  };

  const mockCategories = [
    {
      id: 1,
      name: 'Bebidas',
      restaurantId: 1,
      isActive: true,
      createdAt: new Date(),
      description: null,
      productCategories: [
        {
          product: {
            id: 10,
            name: 'Coca Cola',
            price: 2500,
            restaurantId: 1,
            image: null,
            createdAt: new Date(),
            productCategories: [],
          },
        },
      ],
    },
  ];

  beforeEach(async () => {
    mockPrisma = {
      $queryRaw: vi.fn(),
      restaurant: {
        findUnique: vi.fn(),
      },
      table: {
        findFirst: vi.fn(),
      },
      service: {
        findFirst: vi.fn(),
        create: vi.fn(),
        findUnique: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: vi.fn(async (callback: any) => {
              return callback(mockPrisma);
            }),
            $queryRaw: mockPrisma.$queryRaw,
            restaurant: mockPrisma.restaurant,
            table: mockPrisma.table,
            service: mockPrisma.service,
          },
        },
      ],
    }).compile();

    service = module.get<ServiceService>(ServiceService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('QR válido, sin servicio ACTIVE → crea servicio ACTIVE', async () => {
    const qrToken = 'test-qr-token-123';
    const mockTableRow = [{ id: 1, restaurant_id: 1, is_active: 1 }];

    vi.mocked(mockPrisma.$queryRaw).mockResolvedValueOnce(mockTableRow);
    vi.mocked(mockPrisma.restaurant.findUnique).mockResolvedValue(mockRestaurant);
    vi.mocked(mockPrisma.service.findFirst).mockResolvedValue(null);
    vi.mocked(mockPrisma.service.create).mockResolvedValue({
      id: 1,
      tableId: 1,
      restaurantId: 1,
      status: 'ACTIVE',
      createdAt: new Date(),
      table: mockTable,
      restaurant: mockRestaurant,
    });

    const result = await service.findOrCreateActiveFromQr(qrToken);

    expect(result).toBeDefined();
    expect(result.status).toEqual('ACTIVE');
    expect(result.tableId).toEqual(1);
    expect(result.restaurantId).toEqual(1);
    expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(mockPrisma.service.create).toHaveBeenCalledWith({
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

  it('QR válido, ya existe servicio ACTIVE → reutiliza', async () => {
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
      id: 1,
      tableId: 1,
      restaurantId: 1,
      status: 'ACTIVE',
      createdAt: new Date(),
    };

    vi.mocked(mockPrisma.$queryRaw).mockResolvedValueOnce(mockTableRow);
    vi.mocked(mockPrisma.restaurant.findUnique).mockResolvedValue(mockRestaurant);
    vi.mocked(mockPrisma.service.findFirst).mockResolvedValue(mockExistingService);

    const result = await service.findOrCreateActiveFromQr(qrToken);

    expect(result).toEqual(mockExistingService);
    expect(mockPrisma.service.create).not.toHaveBeenCalled();
  });

  it('QR inválido → NotFoundException', async () => {
    vi.mocked(mockPrisma.$queryRaw).mockResolvedValueOnce([]);

    await expect(service.findOrCreateActiveFromQr('invalid-token')).rejects.toThrow(NotFoundException);
  });

  it('Mesa inactiva → NotFoundException', async () => {
    vi.mocked(mockPrisma.$queryRaw).mockResolvedValueOnce([]);

    await expect(service.findOrCreateActiveFromQr('some-token')).rejects.toThrow(NotFoundException);
  });

  it('Restaurante inactivo → ForbiddenException', async () => {
    const mockTableRow = [{ id: 1, restaurant_id: 1, is_active: 1 }];
    const mockRestaurantInactive = {
      id: 1,
      name: 'Test Restaurant',
      address: 'Calle 1',
      phone: '3001234567',
      email: 'test@test.com',
      isActive: false,
      createdAt: new Date(),
    };

    vi.mocked(mockPrisma.$queryRaw).mockResolvedValueOnce(mockTableRow);
    vi.mocked(mockPrisma.restaurant.findUnique).mockResolvedValue(mockRestaurantInactive);

    await expect(service.findOrCreateActiveFromQr('some-token')).rejects.toThrow(ForbiddenException);
  });

  it('SUPER_ADMIN crea servicio de cualquier restaurante', async () => {
    const mockTableRow = [{ id: 1, restaurant_id: 5, is_active: 1 }];
    const mockTable5 = { id: 1, number: 5, isActive: true, isAvailable: true, restaurantId: 5, qrToken: 'qr-token-123', createdAt: new Date() };
    const mockRestaurant5 = {
      id: 5,
      name: 'Other Restaurant',
      address: 'Calle 2',
      phone: '3009999999',
      email: 'other@test.com',
      isActive: true,
      createdAt: new Date(),
    };
    const mockService = {
      id: 1,
      tableId: 1,
      restaurantId: 5,
      status: 'ACTIVE',
      createdAt: new Date(),
    };

    vi.mocked(mockPrisma.$queryRaw).mockResolvedValueOnce(mockTableRow);
    vi.mocked(mockPrisma.table.findFirst).mockResolvedValue(mockTable5);
    vi.mocked(mockPrisma.restaurant.findUnique).mockResolvedValue(mockRestaurant5);
    vi.mocked(mockPrisma.service.findFirst).mockResolvedValue(null);
    vi.mocked(mockPrisma.service.create).mockResolvedValue(mockService);

    const result = await service.create(superAdminUser, 1);

    expect(result).toEqual(mockService);
    expect(mockPrisma.service.create).toHaveBeenCalledWith({
      data: {
        tableId: 1,
        restaurantId: 5,
        status: 'ACTIVE',
      },
      include: {
        table: true,
        restaurant: true,
      },
    });
  });

  it('WAITER crea servicio de su restaurante', async () => {
    const mockTableRow = [{ id: 1, restaurant_id: 1, is_active: 1 }];
    const mockTable = { id: 1, number: 5, isActive: true, isAvailable: true, restaurantId: 1, qrToken: 'qr-token-123', createdAt: new Date() };
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
    };

    vi.mocked(mockPrisma.$queryRaw).mockResolvedValueOnce(mockTableRow);
    vi.mocked(mockPrisma.table.findFirst).mockResolvedValue(mockTable);
    vi.mocked(mockPrisma.restaurant.findUnique).mockResolvedValue(mockRestaurant);
    vi.mocked(mockPrisma.service.findFirst).mockResolvedValue(null);
    vi.mocked(mockPrisma.service.create).mockResolvedValue(mockService);

    const result = await service.create(waiterUser, 1);

    expect(result).toEqual(mockService);
    expect(mockPrisma.service.create).toHaveBeenCalledWith({
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

  it('CASHIER crea servicio → ForbiddenException', async () => {
    const mockTableRow = [{ id: 1, restaurant_id: 1, is_active: 1 }];
    const mockTableCashier = { id: 1, number: 5, isActive: true, isAvailable: true, restaurantId: 1, qrToken: 'qr-token-123', createdAt: new Date() };
    const mockRestaurantCashier = {
      id: 1,
      name: 'Test Restaurant',
      address: 'Calle 1',
      phone: '3001234567',
      email: 'test@test.com',
      isActive: true,
      createdAt: new Date(),
    };

    vi.mocked(mockPrisma.$queryRaw).mockResolvedValueOnce(mockTableRow);
    vi.mocked(mockPrisma.table.findFirst).mockResolvedValue(mockTableCashier);
    vi.mocked(mockPrisma.restaurant.findUnique).mockResolvedValue(mockRestaurantCashier);

    await expect(service.create(cashierUser, 1)).rejects.toThrow(ForbiddenException);
  });

  it('SUPER_ADMIN obtiene cualquier servicio', async () => {
    const mockService = {
      id: 1,
      tableId: 1,
      restaurantId: 1,
      status: 'ACTIVE',
      createdAt: new Date(),
      table: mockTable,
      restaurant: mockRestaurant,
      orders: [],
    };

    vi.mocked(mockPrisma.service.findFirst).mockResolvedValue(mockService);

    const result = await service.findOne(1, superAdminUser);

    expect(result).toEqual(mockService);
    expect(mockPrisma.service.findFirst).toHaveBeenCalledWith({
      where: { id: 1 },
      include: {
        table: true,
        restaurant: true,
        orders: {
          include: {
            orderItems: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });
  });

  it('WAITER obtiene servicio de otro restaurante → ForbiddenException', async () => {
    vi.mocked(mockPrisma.service.findFirst).mockResolvedValue(null);

    await expect(service.findOne(1, waiterUser)).rejects.toThrow(NotFoundException);
    expect(mockPrisma.service.findFirst).toHaveBeenCalledWith({
      where: { id: 1, restaurantId: 1 },
      include: {
        table: true,
        restaurant: true,
        orders: {
          include: {
            orderItems: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });
  });
});
