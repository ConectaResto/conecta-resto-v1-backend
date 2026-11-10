import { Test, TestingModule } from '@nestjs/testing';
import { TablesService } from './tables.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreateTableDto } from './dto/create-table.dto.js';
import { UpdateTableDto } from './dto/update-table.dto.js';
import { UserRole } from '../../generated/prisma/enums.js';

describe('TablesService', () => {
  let service: TablesService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TablesService,
        {
          provide: PrismaService,
          useValue: {
            table: {
              create: vi.fn(),
              findMany: vi.fn(),
              findFirst: vi.fn(),
              update: vi.fn(),
              delete: vi.fn(),
            },
            restaurant: {
              findUnique: vi.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<TablesService>(TablesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('WAITER puede consultar mesas de su restaurante (findAll)', async () => {
    const waiterUser = { sub: 2, role: UserRole.WAITER, restaurantId: 1 };
    const mockTables = [
      { id: 1, number: 1, isActive: true, isAvailable: true, restaurantId: 1 },
    ];

    prisma.table.findMany = vi.fn().mockResolvedValue(mockTables);

    const result = await service.findAll(waiterUser);

    expect(result).toEqual(mockTables);
    expect(prisma.table.findMany).toHaveBeenCalledWith({
      where: { isActive: true, restaurantId: 1 },
      select: {
        id: true,
        number: true,
        isActive: true,
        isAvailable: true,
        restaurantId: true,
        createdAt: true,
        restaurant: true,
      },
      orderBy: { number: 'asc' },
    });
  });

  it('CASHIER puede consultar mesas de su restaurante (findAll)', async () => {
    const cashierUser = { sub: 3, role: UserRole.CASHIER, restaurantId: 1 };
    const mockTables = [
      { id: 1, number: 1, isActive: true, isAvailable: true, restaurantId: 1 },
    ];

    prisma.table.findMany = vi.fn().mockResolvedValue(mockTables);

    const result = await service.findAll(cashierUser);

    expect(result).toEqual(mockTables);
  });

  it('WAITER puede consultar una mesa de su restaurante (findOne)', async () => {
    const waiterUser = { sub: 2, role: UserRole.WAITER, restaurantId: 1 };
    const mockTable = {
      id: 1,
      number: 1,
      isActive: true,
      isAvailable: true,
      restaurantId: 1,
    };

    prisma.table.findFirst = vi.fn().mockResolvedValue(mockTable);

    const result = await service.findOne(1, waiterUser);

    expect(result).toEqual(mockTable);
  });

  it('CASHIER puede consultar una mesa de su restaurante (findOne)', async () => {
    const cashierUser = { sub: 3, role: UserRole.CASHIER, restaurantId: 1 };
    const mockTable = {
      id: 1,
      number: 1,
      isActive: true,
      isAvailable: true,
      restaurantId: 1,
    };

    prisma.table.findFirst = vi.fn().mockResolvedValue(mockTable);

    const result = await service.findOne(1, cashierUser);

    expect(result).toEqual(mockTable);
  });

  it('WAITER puede actualizar isAvailable de una mesa', async () => {
    const waiterUser = { sub: 2, role: UserRole.WAITER, restaurantId: 1 };
    const mockTable = {
      id: 1,
      number: 1,
      isActive: true,
      isAvailable: false,
      restaurantId: 1,
    };

    prisma.table.findFirst = vi.fn().mockResolvedValue(mockTable);
    prisma.table.update = vi.fn().mockResolvedValue(mockTable);

    const result = await service.update(1, { isAvailable: false }, waiterUser);

    expect(result).toEqual(mockTable);
    expect(prisma.table.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { isAvailable: false, restaurantId: 1 },
      include: { restaurant: true },
    });
  });

  it('WAITER no puede actualizar número de mesa (ForbiddenException)', async () => {
    const waiterUser = { sub: 2, role: UserRole.WAITER, restaurantId: 1 };
    const mockTable = {
      id: 1,
      number: 1,
      isActive: true,
      isAvailable: true,
      restaurantId: 1,
    };

    prisma.table.findFirst = vi.fn().mockResolvedValue(mockTable);

    await expect(
      service.update(1, { number: 5 }, waiterUser),
    ).rejects.toThrow(ForbiddenException);
  });

  it('ADMIN puede crear mesas', async () => {
    const adminUser = { sub: 1, role: UserRole.ADMIN, restaurantId: 1 };
    const createDto: CreateTableDto = { number: 5, restaurantId: 1 };
    const mockTable = {
      id: 2,
      number: 5,
      isActive: true,
      isAvailable: true,
      restaurantId: 1,
    };

    prisma.restaurant.findUnique = vi.fn().mockResolvedValue({
      id: 1,
      name: 'Test Restaurant',
    });
    prisma.table.create = vi.fn().mockResolvedValue(mockTable);

    const result = await service.create(createDto, adminUser);

    expect(result).toEqual(mockTable);
    expect(prisma.table.create).toHaveBeenCalledWith({
      data: { number: 5, restaurantId: 1, qrToken: expect.any(String) },
      include: { restaurant: true },
    });
  });

  it('ADMIN puede eliminar mesas', async () => {
    const adminUser = { sub: 1, role: UserRole.ADMIN, restaurantId: 1 };
    const mockTable = {
      id: 1,
      number: 1,
      isActive: true,
      isAvailable: true,
      restaurantId: 1,
    };

    prisma.table.findFirst = vi.fn().mockResolvedValue(mockTable);
    prisma.table.update = vi.fn().mockResolvedValue(mockTable);

    await service.remove(1, adminUser);

    expect(prisma.table.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { isActive: false },
    });
  });

  it('ADMIN no puede consultar una mesa de otro restaurante (NotFoundException)', async () => {
    const adminUser = { sub: 1, role: UserRole.ADMIN, restaurantId: 1 };

    prisma.table.findFirst = vi.fn().mockResolvedValue(null);

    await expect(service.findOne(2, adminUser)).rejects.toThrow(NotFoundException);

    expect(prisma.table.findFirst).toHaveBeenCalledWith({
      where: { id: 2, isActive: true, restaurantId: 1 },
      select: {
        id: true,
        number: true,
        isActive: true,
        isAvailable: true,
        restaurantId: true,
        createdAt: true,
        restaurant: true,
      },
    });
  });

  it('WAITER no puede actualizar una mesa de otro restaurante (NotFoundException)', async () => {
    const waiterUser = { sub: 2, role: UserRole.WAITER, restaurantId: 1 };

    prisma.table.findFirst = vi.fn().mockResolvedValue(null);

    await expect(
      service.update(2, { isAvailable: false }, waiterUser),
    ).rejects.toThrow(NotFoundException);

    expect(prisma.table.findFirst).toHaveBeenCalledWith({
      where: { id: 2, isActive: true, restaurantId: 1 },
      select: {
        id: true,
        number: true,
        isActive: true,
        isAvailable: true,
        restaurantId: true,
        createdAt: true,
        restaurant: true,
      },
    });
  });

  it('SUPER_ADMIN puede consultar todas las mesas (findAll sin filtro restaurantId)', async () => {
    const superAdminUser = { sub: 1, role: UserRole.SUPER_ADMIN, restaurantId: null };
    const mockTables = [
      { id: 1, number: 1, isActive: true, isAvailable: true, restaurantId: 1 },
      { id: 2, number: 2, isActive: true, isAvailable: true, restaurantId: 2 },
    ];

    prisma.table.findMany = vi.fn().mockResolvedValue(mockTables);

    const result = await service.findAll(superAdminUser);

    expect(result).toEqual(mockTables);
    expect(prisma.table.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      select: {
        id: true,
        number: true,
        isActive: true,
        isAvailable: true,
        restaurantId: true,
        createdAt: true,
        restaurant: true,
      },
      orderBy: { number: 'asc' },
    });
  });

  it('SUPER_ADMIN puede consultar cualquier mesa (findOne sin filtro restaurantId)', async () => {
    const superAdminUser = { sub: 1, role: UserRole.SUPER_ADMIN, restaurantId: null };
    const mockTable = {
      id: 2,
      number: 2,
      isActive: true,
      isAvailable: true,
      restaurantId: 2,
    };

    prisma.table.findFirst = vi.fn().mockResolvedValue(mockTable);

    const result = await service.findOne(2, superAdminUser);

    expect(result).toEqual(mockTable);
    expect(prisma.table.findFirst).toHaveBeenCalledWith({
      where: { id: 2, isActive: true },
      select: {
        id: true,
        number: true,
        isActive: true,
        isAvailable: true,
        restaurantId: true,
        createdAt: true,
        restaurant: true,
      },
    });
  });

  it('findAll no expone qrToken en la respuesta', async () => {
    const waiterUser = { sub: 2, role: UserRole.WAITER, restaurantId: 1 };
    const mockTables = [
      { id: 1, number: 1, isActive: true, isAvailable: true, restaurantId: 1 },
    ];

    prisma.table.findMany = vi.fn().mockResolvedValue(mockTables);

    const result = await service.findAll(waiterUser);

    expect(result[0]).not.toHaveProperty('qrToken');
    const selectArg = (prisma.table.findMany as any).mock.calls[0][0].select;
    expect(selectArg).not.toHaveProperty('qrToken');
    expect(selectArg).toEqual({
      id: true,
      number: true,
      isActive: true,
      isAvailable: true,
      restaurantId: true,
      createdAt: true,
      restaurant: true,
    });
  });

  it('findOne no expone qrToken en la respuesta', async () => {
    const waiterUser = { sub: 2, role: UserRole.WAITER, restaurantId: 1 };
    const mockTable = {
      id: 1,
      number: 1,
      isActive: true,
      isAvailable: true,
      restaurantId: 1,
    };

    prisma.table.findFirst = vi.fn().mockResolvedValue(mockTable);

    const result = await service.findOne(1, waiterUser);

    expect(result).not.toHaveProperty('qrToken');
    const selectArg = (prisma.table.findFirst as any).mock.calls[0][0].select;
    expect(selectArg).not.toHaveProperty('qrToken');
    expect(selectArg).toEqual({
      id: true,
      number: true,
      isActive: true,
      isAvailable: true,
      restaurantId: true,
      createdAt: true,
      restaurant: true,
    });
  });
});