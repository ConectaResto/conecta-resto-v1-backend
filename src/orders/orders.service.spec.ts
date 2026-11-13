import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '../../generated/prisma/enums.js';

describe('OrdersService', () => {
  let service: OrdersService;
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
      service: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      product: {
        findUnique: vi.fn(),
      },
      order: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      kitchenOrder: {
        create: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: vi.fn(async (callback: any) => {
              return callback(mockPrisma);
            }),
            $queryRaw: mockPrisma.$queryRaw,
            restaurant: mockPrisma.restaurant,
            serviceRequest: mockPrisma.serviceRequest,
            product: mockPrisma.product,
            order: mockPrisma.order,
          },
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('QR válido, crear pedido con items → orden PENDING con precios congelados', async () => {
    const qrToken = 'test-qr-token-123';
    const items = [
      { productId: 1, quantity: 2 },
      { productId: 2, quantity: 1 },
    ];
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
    const mockProduct1 = {
      id: 1,
      name: 'Coca Cola',
      price: 2500,
      restaurantId: 1,
    };
    const mockProduct2 = {
      id: 2,
      name: 'Pepsi',
      price: 2000,
      restaurantId: 1,
    };
    const mockOrder = {
      id: 1,
      serviceId: 1,
      restaurantId: 1,
      status: 'PENDING',
      createdAt: new Date(),
      authorizedAt: null,
      orderItems: [
        { id: 1, orderId: 1, productId: 1, quantity: 2, price: 2500, product: mockProduct1 },
        { id: 2, orderId: 1, productId: 2, quantity: 1, price: 2000, product: mockProduct2 },
      ],
    };

    vi.mocked(mockPrisma.$queryRaw).mockResolvedValueOnce(mockTableRow);
    vi.mocked(mockPrisma.restaurant.findUnique).mockResolvedValue(mockRestaurant);
    vi.mocked(mockPrisma.service.findFirst).mockResolvedValue(null);
    vi.mocked(mockPrisma.service.create).mockResolvedValue({
      id: 1,
      tableId: 1,
      restaurantId: 1,
      status: 'ACTIVE',
    });
    vi.mocked(mockPrisma.product.findUnique)
      .mockResolvedValueOnce(mockProduct1)
      .mockResolvedValueOnce(mockProduct2);
    vi.mocked(mockPrisma.order.create).mockResolvedValue(mockOrder);

    const result = await service.createFromQr(qrToken, items);

    expect(result.status).toEqual('PENDING');
    expect(result.restaurantId).toEqual(1);
    expect(result.orderItems).toHaveLength(2);
    expect(result.orderItems[0].price).toEqual(2500);
    expect(result.orderItems[1].price).toEqual(2000);
    expect(mockPrisma.order.create).toHaveBeenCalledWith({
      data: {
        serviceId: 1,
        restaurantId: 1,
        status: 'PENDING',
        orderItems: {
          create: [
            { productId: 1, quantity: 2, price: 2500 },
            { productId: 2, quantity: 1, price: 2000 },
          ],
        },
      },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
      },
    });
  });

  it('QR inválido → NotFoundException', async () => {
    vi.mocked(mockPrisma.$queryRaw).mockResolvedValueOnce([]);

    await expect(
      service.createFromQr('invalid-token', [{ productId: 1, quantity: 1 }]),
    ).rejects.toThrow(NotFoundException);
  });

  it('Mesa inactiva → NotFoundException', async () => {
    vi.mocked(mockPrisma.$queryRaw).mockResolvedValueOnce([]);

    await expect(
      service.createFromQr('some-token', [{ productId: 1, quantity: 1 }]),
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
      service.createFromQr('some-token', [{ productId: 1, quantity: 1 }]),
    ).rejects.toThrow(ForbiddenException);
  });

  it('Producto no pertenece al restaurante → ForbiddenException', async () => {
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
    const mockProduct = {
      id: 99,
      name: 'Producto otro restaurante',
      price: 1000,
      restaurantId: 99,
    };

    vi.mocked(mockPrisma.$queryRaw).mockResolvedValueOnce(mockTableRow);
    vi.mocked(mockPrisma.restaurant.findUnique).mockResolvedValue(mockRestaurant);
    vi.mocked(mockPrisma.service.findFirst).mockResolvedValue(null);
    vi.mocked(mockPrisma.service.create).mockResolvedValue({
      id: 1,
      tableId: 1,
      restaurantId: 1,
      status: 'ACTIVE',
    });
    vi.mocked(mockPrisma.product.findUnique).mockResolvedValue(mockProduct);

    await expect(
      service.createFromQr(qrToken, [{ productId: 99, quantity: 1 }]),
    ).rejects.toThrow(ForbiddenException);
  });

  it('Producto inexistente → NotFoundException', async () => {
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

    vi.mocked(mockPrisma.$queryRaw).mockResolvedValueOnce(mockTableRow);
    vi.mocked(mockPrisma.restaurant.findUnique).mockResolvedValue(mockRestaurant);
    vi.mocked(mockPrisma.service.findFirst).mockResolvedValue(null);
    vi.mocked(mockPrisma.service.create).mockResolvedValue({
      id: 1,
      tableId: 1,
      restaurantId: 1,
      status: 'ACTIVE',
    });
    vi.mocked(mockPrisma.product.findUnique).mockResolvedValue(null);

    await expect(
      service.createFromQr(qrToken, [{ productId: 999, quantity: 1 }]),
    ).rejects.toThrow(NotFoundException);
  });

  it('SUPER_ADMIN lista pedidos pendientes → sin filtro restaurantId', async () => {
    const mockOrders = [
      { id: 1, serviceId: 1, restaurantId: 1, status: 'PENDING' },
      { id: 2, serviceId: 2, restaurantId: 2, status: 'PENDING' },
    ];

    vi.mocked(mockPrisma.order.findMany).mockResolvedValue(mockOrders);

    const result = await service.findPending(superAdminUser);

    expect(result).toEqual(mockOrders);
    expect(mockPrisma.order.findMany).toHaveBeenCalledWith({
      where: { status: 'PENDING' },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
        service: {
          include: {
            table: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  });

  it('ADMIN lista pedidos pendientes → filtro restaurantId propio', async () => {
    vi.mocked(mockPrisma.order.findMany).mockResolvedValue([]);

    await service.findPending(adminUser);

    expect(mockPrisma.order.findMany).toHaveBeenCalledWith({
      where: { restaurantId: 1, status: 'PENDING' },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
        service: {
          include: {
            table: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  });

  it('WAITER lista pedidos listos → solo AUTHORIZED y KitchenOrder READY, su restaurante', async () => {
    vi.mocked(mockPrisma.order.findMany).mockResolvedValue([]);

    await service.findReady(waiterUser);

    expect(mockPrisma.order.findMany).toHaveBeenCalledWith({
      where: {
        status: 'AUTHORIZED',
        kitchenOrder: { status: 'READY' },
        restaurantId: 1,
      },
      include: {
        orderItems: { include: { product: true } },
        service: { include: { table: true } },
        kitchenOrder: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  });

  it('ADMIN lista pedidos listos → filtro restaurantId propio', async () => {
    vi.mocked(mockPrisma.order.findMany).mockResolvedValue([]);

    await service.findReady(adminUser);

    expect(mockPrisma.order.findMany).toHaveBeenCalledWith({
      where: {
        status: 'AUTHORIZED',
        kitchenOrder: { status: 'READY' },
        restaurantId: 1,
      },
      include: {
        orderItems: { include: { product: true } },
        service: { include: { table: true } },
        kitchenOrder: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  });

  it('SUPER_ADMIN lista pedidos listos → sin filtro restaurantId', async () => {
    vi.mocked(mockPrisma.order.findMany).mockResolvedValue([]);

    await service.findReady(superAdminUser);

    expect(mockPrisma.order.findMany).toHaveBeenCalledWith({
      where: {
        status: 'AUTHORIZED',
        kitchenOrder: { status: 'READY' },
      },
      include: {
        orderItems: { include: { product: true } },
        service: { include: { table: true } },
        kitchenOrder: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  });

  it('WAITER autoriza pedido de su restaurante → AUTHORIZED con authorizedAt', async () => {
    const mockOrder = {
      id: 1,
      serviceId: 1,
      restaurantId: 1,
      status: 'PENDING',
      createdAt: new Date(),
      authorizedAt: null,
    };
    const mockAuthorizedOrder = {
      id: 1,
      serviceId: 1,
      restaurantId: 1,
      status: 'AUTHORIZED',
      createdAt: new Date(),
      authorizedAt: new Date(),
      orderItems: [],
    };

    vi.mocked(mockPrisma.order.findUnique).mockResolvedValue(mockOrder);
    vi.mocked(mockPrisma.order.update).mockResolvedValue(mockAuthorizedOrder);
    vi.mocked(mockPrisma.kitchenOrder.create).mockResolvedValue({
      id: 1,
      orderId: 1,
      status: 'RECEIVED',
    });

    const result = await service.authorize(1, waiterUser);

    expect(result.status).toEqual('AUTHORIZED');
    expect(result.authorizedAt).toBeDefined();
    expect(mockPrisma.kitchenOrder.create).toHaveBeenCalledWith({
      data: {
        orderId: 1,
        status: 'RECEIVED',
      },
    });
    expect(mockPrisma.order.update).toHaveBeenCalledWith({
      where: { id: 1, status: 'PENDING' },
      data: {
        status: 'AUTHORIZED',
        authorizedAt: expect.any(Date),
      },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
      },
    });
  });

  it('CASHIER autoriza pedido → ForbiddenException', async () => {
    vi.mocked(mockPrisma.order.findUnique).mockResolvedValue({
      id: 1,
      serviceId: 1,
      restaurantId: 1,
      status: 'PENDING',
      createdAt: new Date(),
      authorizedAt: null,
    });

    await expect(
      service.authorize(1, cashierUser),
    ).rejects.toThrow(ForbiddenException);
  });

  it('WAITER autoriza pedido de otro restaurante → ForbiddenException', async () => {
    vi.mocked(mockPrisma.order.findUnique).mockResolvedValue({
      id: 1,
      serviceId: 1,
      restaurantId: 2,
      status: 'PENDING',
      createdAt: new Date(),
      authorizedAt: null,
    });

    await expect(
      service.authorize(1, waiterUser),
    ).rejects.toThrow(ForbiddenException);
  });

  it('Autorizar orden ya AUTORIZADA → ForbiddenException', async () => {
    vi.mocked(mockPrisma.order.findUnique).mockResolvedValue({
      id: 1,
      serviceId: 1,
      restaurantId: 1,
      status: 'AUTHORIZED',
      createdAt: new Date(),
      authorizedAt: new Date(),
    });

    await expect(
      service.authorize(1, waiterUser),
    ).rejects.toThrow(ForbiddenException);
  });

  it('Autorizar orden ya AUTORIZADA → no se crea KitchenOrder', async () => {
    vi.mocked(mockPrisma.order.findUnique).mockResolvedValue({
      id: 1,
      serviceId: 1,
      restaurantId: 1,
      status: 'AUTHORIZED',
      createdAt: new Date(),
      authorizedAt: new Date(),
    });

    await expect(
      service.authorize(1, waiterUser),
    ).rejects.toThrow(ForbiddenException);

    expect(mockPrisma.kitchenOrder.create).not.toHaveBeenCalled();
  });

  it('WAITER autoriza pedido de otro restaurante → no se crea KitchenOrder', async () => {
    vi.mocked(mockPrisma.order.findUnique).mockResolvedValue({
      id: 1,
      serviceId: 1,
      restaurantId: 2,
      status: 'PENDING',
      createdAt: new Date(),
      authorizedAt: null,
    });

    await expect(
      service.authorize(1, waiterUser),
    ).rejects.toThrow(ForbiddenException);

    expect(mockPrisma.kitchenOrder.create).not.toHaveBeenCalled();
  });

  it('kitchenOrder.create() falla → error propaga y order.update() sí se ejecutó', async () => {
    const mockOrder = {
      id: 1,
      serviceId: 1,
      restaurantId: 1,
      status: 'PENDING',
      createdAt: new Date(),
      authorizedAt: null,
    };
    const dbError = new Error('Falla al crear KitchenOrder');

    vi.mocked(mockPrisma.order.findUnique).mockResolvedValue(mockOrder);
    vi.mocked(mockPrisma.order.update).mockResolvedValue({
      ...mockOrder,
      status: 'AUTHORIZED',
      authorizedAt: new Date(),
      orderItems: [],
    });
    vi.mocked(mockPrisma.kitchenOrder.create).mockRejectedValue(dbError);

    await expect(
      service.authorize(1, waiterUser),
    ).rejects.toThrow(dbError);

    expect(mockPrisma.order.update).toHaveBeenCalledWith({
      where: { id: 1, status: 'PENDING' },
      data: {
        status: 'AUTHORIZED',
        authorizedAt: expect.any(Date),
      },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
      },
    });

    expect(mockPrisma.kitchenOrder.create).toHaveBeenCalledWith({
      data: {
        orderId: 1,
        status: 'RECEIVED',
      },
    });
  });
});
