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
  let mockPrisma: any;

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

  it('ADMIN puede crear mesas', async () => {
    const adminUser = { sub: 1, role: UserRole.ADMIN, restaurantId: 1 };
    const createDto: CreateTableDto = { number: 5, restaurantId: 1 };
    const mockTable = {
      id: 2,
      number: 5,
      isActive: true,
      isAvailable: true,
      restaurantId: 1,
      qrToken: 'test-qr-token-123',
      createdAt: new Date(),
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

  it('WAITER no puede crear mesas de otro restaurante', async () => {
    const waiterUser = { sub: 2, role: UserRole.WAITER, restaurantId: 1 };
    const createDto: CreateTableDto = { number: 5, restaurantId: 2 };

    prisma.restaurant.findUnique = vi.fn().mockResolvedValue(null);

    await expect(
      service.create(createDto, waiterUser),
    ).rejects.toThrow(NotFoundException);
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

  it('WAITER no puede eliminar mesas de otro restaurante', async () => {
    const waiterUser = { sub: 2, role: UserRole.WAITER, restaurantId: 1 };
    const mockTable = {
      id: 2,
      number: 2,
      isActive: true,
      isAvailable: true,
      restaurantId: 2,
    };

    prisma.table.findFirst = vi.fn().mockResolvedValue(null);

    await expect(service.remove(2, waiterUser)).rejects.toThrow(NotFoundException);
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
    expect(prisma.table.findFirst).toHaveBeenCalledWith({
      where: { id: 1, isActive: true, restaurantId: 1 },
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

  it('WAITER puede actualizar isAvailable de su mesa', async () => {
    const waiterUser = { sub: 2, role: UserRole.WAITER, restaurantId: 1 };
    const mockTable = {
      id: 1,
      number: 1,
      isActive: true,
      isAvailable: true,
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

  it('ADMIN puede actualizar cualquier mesa', async () => {
    const superAdminUser = { sub: 1, role: UserRole.SUPER_ADMIN, restaurantId: 1 };
    const mockTable = {
      id: 2,
      number: 2,
      isActive: true,
      isAvailable: true,
      restaurantId: 2,
    };
    const updatedTable = {
      id: 2,
      number: 2,
      isActive: true,
      isAvailable: false,
      restaurantId: 2,
    };

    prisma.table.findFirst = vi.fn().mockImplementation(() => mockTable);
    prisma.table.update = vi.fn().mockResolvedValue(updatedTable);

    const result = await service.update(2, { isAvailable: false }, superAdminUser);

    expect(result).toEqual(updatedTable);
    expect(prisma.table.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { isAvailable: false },
      include: { restaurant: true },
    });
  });

  it('WAITER puede obtener QR de mesa de su restaurante', async () => {
    const waiterUser = { sub: 2, role: UserRole.WAITER, restaurantId: 1 };
    const mockTable = {
      id: 1,
      number: 1,
      isActive: true,
      isAvailable: true,
      restaurantId: 1,
      qrToken: 'test-qr-token-123',
      createdAt: new Date(),
    };

    prisma.table.findFirst = vi.fn().mockResolvedValue(mockTable);

    const result = await service.getQRCode(1, waiterUser);

    expect(result).toBeInstanceOf(Buffer);
  });

  it('WAITER no puede obtener QR de mesa de otro restaurante', async () => {
    const waiterUser = { sub: 2, role: UserRole.WAITER, restaurantId: 1 };

    prisma.table.findFirst = vi.fn().mockResolvedValue(null);

    await expect(service.getQRCode(2, waiterUser)).rejects.toThrow(NotFoundException);
  });

  it('WAITER no puede obtener QR de mesa inexistente', async () => {
    const waiterUser = { sub: 2, role: UserRole.WAITER, restaurantId: 1 };

    prisma.table.findFirst = vi.fn().mockResolvedValue(null);

    await expect(service.getQRCode(999, waiterUser)).rejects.toThrow(NotFoundException);
  });
});
