import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { KitchenService } from './kitchen.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UserRole, KitchenOrderStatus } from '../../generated/prisma/enums.js';

describe('KitchenService', () => {
  let service: KitchenService;
  let prisma: PrismaService;

  const superAdminUser = { sub: 1, role: UserRole.SUPER_ADMIN, restaurantId: null };
  const kitchenUser = { sub: 2, role: UserRole.KITCHEN, restaurantId: 1 };
  const kitchenUserOther = { sub: 3, role: UserRole.KITCHEN, restaurantId: 2 };
  const adminUser = { sub: 4, role: UserRole.ADMIN, restaurantId: 1 };
  const waiterUser = { sub: 5, role: UserRole.WAITER, restaurantId: 1 };
  const cashierUser = { sub: 6, role: UserRole.CASHIER, restaurantId: 1 };

  const mockOrderOwn = {
    id: 1,
    name: 'Order 1',
    restaurantId: 1,
    status: 'PENDING',
    orderItems: [
      { id: 1, productId: 1, quantity: 2, price: 15000 },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOrderOther = {
    id: 2,
    name: 'Order 2',
    restaurantId: 2,
    status: 'PENDING',
    orderItems: [
      { id: 2, productId: 2, quantity: 1, price: 20000 },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockKitchenOrderOwn = {
    id: 1,
    orderId: 1,
    status: KitchenOrderStatus.RECEIVED,
    order: mockOrderOwn,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockKitchenOrderOther = {
    id: 2,
    orderId: 2,
    status: KitchenOrderStatus.RECEIVED,
    order: mockOrderOther,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KitchenService,
        {
          provide: PrismaService,
          useValue: {
            kitchenOrder: {
              create: vi.fn(),
              findMany: vi.fn(),
              findFirst: vi.fn(),
              update: vi.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<KitchenService>(KitchenService);
    prisma = module.get<PrismaService>(PrismaService);

    vi.clearAllMocks();
  });

  describe('findAll', () => {
    it('KITCHEN obtiene pedidos de cocina de su restaurante', async () => {
      vi.spyOn(prisma.kitchenOrder, 'findMany').mockResolvedValue([mockKitchenOrderOwn]);

      const result = await service.findAll(kitchenUser);

      expect(result).toEqual([mockKitchenOrderOwn]);
      expect(prisma.kitchenOrder.findMany).toHaveBeenCalledWith({
        where: {
          order: {
            restaurantId: 1,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          order: {
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

    it('SUPER_ADMIN obtiene todos los pedidos de cocina', async () => {
      vi.spyOn(prisma.kitchenOrder, 'findMany').mockResolvedValue([mockKitchenOrderOwn, mockKitchenOrderOther]);

      const result = await service.findAll(superAdminUser);

      expect(result).toHaveLength(2);
      expect(prisma.kitchenOrder.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          order: {
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

    it('ADMIN no puede consultar pedidos de cocina (403)', async () => {
      await expect(service.findAll(adminUser)).rejects.toThrow(ForbiddenException);
    });

    it('WAITER no puede consultar pedidos de cocina (403)', async () => {
      await expect(service.findAll(waiterUser)).rejects.toThrow(ForbiddenException);
    });

    it('CASHIER no puede consultar pedidos de cocina (403)', async () => {
      await expect(service.findAll(cashierUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findOne', () => {
    it('KITCHEN obtiene pedido de cocina de su restaurante', async () => {
      vi.spyOn(prisma.kitchenOrder, 'findFirst').mockResolvedValue(mockKitchenOrderOwn);

      const result = await service.findOne(1, kitchenUser);

      expect(result).toEqual(mockKitchenOrderOwn);
      expect(prisma.kitchenOrder.findFirst).toHaveBeenCalledWith({
        where: {
          orderId: 1,
          order: {
            restaurantId: 1,
          },
        },
        include: {
          order: {
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

    it('SUPER_ADMIN obtiene cualquier pedido de cocina', async () => {
      vi.spyOn(prisma.kitchenOrder, 'findFirst').mockResolvedValue(mockKitchenOrderOther);

      const result = await service.findOne(2, superAdminUser);

      expect(result).toEqual(mockKitchenOrderOther);
      expect(prisma.kitchenOrder.findFirst).toHaveBeenCalledWith({
        where: {
          orderId: 2,
        },
        include: {
          order: {
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

    it('KITCHEN no puede obtener pedido de cocina de otro restaurante', async () => {
      vi.spyOn(prisma.kitchenOrder, 'findFirst').mockResolvedValue(null);

      await expect(service.findOne(2, kitchenUser)).rejects.toThrow(NotFoundException);
    });

    it('ADMIN no puede consultar pedido de cocina (403)', async () => {
      await expect(service.findOne(1, adminUser)).rejects.toThrow(ForbiddenException);
    });

    it('WAITER no puede consultar pedido de cocina (403)', async () => {
      await expect(service.findOne(1, waiterUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateStatus', () => {
    it('KITCHEN puede cambiar de RECEIVED a PREPARING', async () => {
      vi.spyOn(prisma.kitchenOrder, 'findFirst').mockResolvedValue(mockKitchenOrderOwn);
      vi.spyOn(prisma.kitchenOrder, 'update').mockResolvedValue({
        ...mockKitchenOrderOwn,
        status: KitchenOrderStatus.PREPARING,
      });

      const result = await service.updateStatus(1, KitchenOrderStatus.PREPARING, kitchenUser);

      expect(result.status).toBe(KitchenOrderStatus.PREPARING);
      expect(prisma.kitchenOrder.update).toHaveBeenCalledWith({
        where: { id: 1, status: KitchenOrderStatus.RECEIVED },
        data: { status: KitchenOrderStatus.PREPARING },
      });
    });

    it('KITCHEN puede cambiar de PREPARING a READY', async () => {
      const preparingOrder = { ...mockKitchenOrderOwn, status: KitchenOrderStatus.PREPARING };
      vi.spyOn(prisma.kitchenOrder, 'findFirst').mockResolvedValue(preparingOrder);
      vi.spyOn(prisma.kitchenOrder, 'update').mockResolvedValue({
        ...preparingOrder,
        status: KitchenOrderStatus.READY,
      });

      const result = await service.updateStatus(1, KitchenOrderStatus.READY, kitchenUser);

      expect(result.status).toBe(KitchenOrderStatus.READY);
      expect(prisma.kitchenOrder.update).toHaveBeenCalledWith({
        where: { id: 1, status: KitchenOrderStatus.PREPARING },
        data: { status: KitchenOrderStatus.READY },
      });
    });

    it('KITCHEN no puede cambiar de RECEIVED a READY (transición inválida)', async () => {
      vi.spyOn(prisma.kitchenOrder, 'findFirst').mockResolvedValue(mockKitchenOrderOwn);

      await expect(
        service.updateStatus(1, KitchenOrderStatus.READY, kitchenUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('SUPER_ADMIN no puede cambiar estados de cocina (403)', async () => {
      vi.spyOn(prisma.kitchenOrder, 'findFirst').mockResolvedValue(mockKitchenOrderOwn);

      await expect(
        service.updateStatus(1, KitchenOrderStatus.PREPARING, superAdminUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('KITCHEN no puede modificar pedido de cocina de otro restaurante', async () => {
      vi.spyOn(prisma.kitchenOrder, 'findFirst').mockResolvedValue(null);

      await expect(
        service.updateStatus(2, KitchenOrderStatus.PREPARING, kitchenUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('ADMIN no puede modificar estado de cocina (403)', async () => {
      await expect(
        service.updateStatus(1, KitchenOrderStatus.PREPARING, adminUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('WAITER no puede modificar estado de cocina (403)', async () => {
      await expect(
        service.updateStatus(1, KitchenOrderStatus.PREPARING, waiterUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('pedido de cocina inexistente lanza NotFoundException', async () => {
      vi.spyOn(prisma.kitchenOrder, 'findFirst').mockResolvedValue(null);

      await expect(
        service.updateStatus(99, KitchenOrderStatus.PREPARING, kitchenUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('actualización condicional usa id y status en el where', async () => {
      vi.spyOn(prisma.kitchenOrder, 'findFirst').mockResolvedValue(mockKitchenOrderOwn);
      vi.spyOn(prisma.kitchenOrder, 'update').mockResolvedValue({
        ...mockKitchenOrderOwn,
        status: KitchenOrderStatus.PREPARING,
      });

      await service.updateStatus(1, KitchenOrderStatus.PREPARING, kitchenUser);

      expect(prisma.kitchenOrder.update).toHaveBeenCalledWith({
        where: { id: 1, status: KitchenOrderStatus.RECEIVED },
        data: { status: KitchenOrderStatus.PREPARING },
      });
    });

    it('update re-lanza errores que no son P2025', async () => {
      const dbError = new Error('Conexión a la base de datos falló');
      vi.spyOn(prisma.kitchenOrder, 'findFirst').mockResolvedValue(mockKitchenOrderOwn);
      vi.spyOn(prisma.kitchenOrder, 'update').mockRejectedValue(dbError);

      await expect(
        service.updateStatus(1, KitchenOrderStatus.PREPARING, kitchenUser),
      ).rejects.toThrow(dbError);
    });

    it('update usa where con id y status para actualización condicional', async () => {
      vi.spyOn(prisma.kitchenOrder, 'findFirst').mockResolvedValue(mockKitchenOrderOwn);
      vi.spyOn(prisma.kitchenOrder, 'update').mockResolvedValue({
        ...mockKitchenOrderOwn,
        status: KitchenOrderStatus.PREPARING,
      });

      await service.updateStatus(1, KitchenOrderStatus.PREPARING, kitchenUser);

      expect(prisma.kitchenOrder.update).toHaveBeenCalledWith({
        where: { id: 1, status: KitchenOrderStatus.RECEIVED },
        data: { status: KitchenOrderStatus.PREPARING },
      });
    });
  });
});
