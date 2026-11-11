import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from './categories.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { UserRole } from '../../generated/prisma/enums.js';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: PrismaService;
  let mockPrisma: any;

  const adminUser = { sub: 1, role: UserRole.ADMIN, restaurantId: 1 };
  const waiterUser = { sub: 2, role: UserRole.WAITER, restaurantId: 1 };
  const cashierUser = { sub: 3, role: UserRole.CASHIER, restaurantId: 1 };

  const mockRestaurant = {
    id: 1,
    name: 'Test Restaurant',
    address: 'Calle 1',
    phone: '3001234567',
    email: 'test@test.com',
    isActive: true,
    createdAt: new Date(),
  };

  const mockCategoryOwn = {
    id: 1,
    name: 'Bebidas',
    restaurantId: 1,
    isActive: true,
    createdAt: new Date(),
    description: null,
  };

  const mockCategoryOther = {
    id: 2,
    name: 'Categoría Otro Restaurante',
    restaurantId: 2,
    isActive: true,
    createdAt: new Date(),
    description: null,
  };

  beforeEach(async () => {
    mockPrisma = {
      category: {
        create: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      restaurant: {
        findUnique: vi.fn(),
      },
    };

    mockPrisma.category.findFirst.mockImplementation((args: any) => {
      const where = args?.where ?? {};
      if (where.id === 1 && where.restaurantId === 1) {
        return Promise.resolve(mockCategoryOwn);
      }
      if (where.id === 2 && where.restaurantId === 2) {
        return Promise.resolve(mockCategoryOther);
      }
      return Promise.resolve(null);
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('ADMIN puede crear categorías', async () => {
    const createDto: CreateCategoryDto = { name: 'Nueva Categoría', restaurantId: 1 };
    const mockCategory = {
      id: 2,
      name: 'Nueva Categoría',
      restaurantId: 1,
      isActive: true,
      createdAt: new Date(),
      description: null,
    };

    vi.spyOn(prisma.restaurant, 'findUnique').mockResolvedValue(mockRestaurant);
    vi.spyOn(prisma.category, 'create').mockResolvedValue(mockCategory);

    const result = await service.create(createDto, adminUser);

    expect(result).toEqual(mockCategory);
    expect(prisma.category.create).toHaveBeenCalledWith({
      data: { name: 'Nueva Categoría', restaurantId: 1 },
    });
  });

  it('WAITER no puede crear categorías', async () => {
    const waiterUser = { sub: 2, role: UserRole.WAITER, restaurantId: 1 };
    const createDto: CreateCategoryDto = { name: 'Nueva Categoría', restaurantId: 1 };

    vi.spyOn(prisma.restaurant, 'findUnique').mockResolvedValue(mockRestaurant);
    vi.spyOn(prisma.category, 'create').mockRejectedValue(new ForbiddenException('Waiters cannot create categories'));

    await expect(
      service.create(createDto, waiterUser),
    ).rejects.toThrow(ForbiddenException);
  });

  it('CASHIER no puede crear categorías', async () => {
    const cashierUser = { sub: 3, role: UserRole.CASHIER, restaurantId: 1 };
    const createDto: CreateCategoryDto = { name: 'Nueva Categoría', restaurantId: 1 };

    vi.spyOn(prisma.restaurant, 'findUnique').mockResolvedValue(mockRestaurant);
    vi.spyOn(prisma.category, 'create').mockRejectedValue(new ForbiddenException('Cashiers cannot create categories'));

    await expect(
      service.create(createDto, cashierUser),
    ).rejects.toThrow(ForbiddenException);
  });

  it('ADMIN no puede crear categoría con nombre duplicado', async () => {
    const adminUser = { sub: 1, role: UserRole.ADMIN, restaurantId: 1 };
    const createDto: CreateCategoryDto = { name: 'Bebidas', restaurantId: 1 };
    const mockCategory = {
      id: 1,
      name: 'Bebidas',
      restaurantId: 1,
      isActive: true,
      createdAt: new Date(),
      description: null,
    };

    vi.spyOn(prisma.restaurant, 'findUnique').mockResolvedValue(mockRestaurant);
    vi.spyOn(prisma.category, 'findFirst').mockResolvedValue(mockCategory);
    vi.spyOn(prisma.category, 'create').mockRejectedValue(new ForbiddenException('A category with this name already exists in this restaurant'));

    await expect(
      service.create(createDto, adminUser),
    ).rejects.toThrow(ForbiddenException);
  });

  it('WAITER puede actualizar categorías de su restaurante', async () => {
    const waiterUser = { sub: 2, role: UserRole.WAITER, restaurantId: 1 };
    const updatedCategory = { ...mockCategoryOwn, name: 'Nuevo Nombre' };

    vi.spyOn(prisma.category, 'update').mockResolvedValue(updatedCategory);

    const result = await service.update(1, { name: 'Nuevo Nombre' }, waiterUser);

    expect(result).toEqual(updatedCategory);
    expect(prisma.category.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { name: 'Nuevo Nombre', restaurantId: 1 },
    });
  });

  it('CASHIER puede actualizar categorías de su restaurante', async () => {
    const cashierUser = { sub: 3, role: UserRole.CASHIER, restaurantId: 1 };
    const updatedCategory = { ...mockCategoryOwn, name: 'Nuevo Nombre' };

    vi.spyOn(prisma.category, 'update').mockResolvedValue(updatedCategory);

    const result = await service.update(1, { name: 'Nuevo Nombre' }, cashierUser);

    expect(result).toEqual(updatedCategory);
    expect(prisma.category.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { name: 'Nuevo Nombre', restaurantId: 1 },
    });
  });

  it('ADMIN no puede actualizar categoría de otro restaurante', async () => {
    const adminUser = { sub: 1, role: UserRole.ADMIN, restaurantId: 1 };

    await expect(
      service.update(2, { name: 'Nuevo Nombre' }, adminUser),
    ).rejects.toThrow(NotFoundException);
  });

  it('WAITER no puede actualizar categoría de otro restaurante', async () => {
    const waiterUser = { sub: 2, role: UserRole.WAITER, restaurantId: 1 };

    await expect(
      service.update(2, { name: 'Nuevo Nombre' }, waiterUser),
    ).rejects.toThrow(NotFoundException);
  });

  it('CASHIER puede eliminar categorías de su restaurante', async () => {
    const cashierUser = { sub: 3, role: UserRole.CASHIER, restaurantId: 1 };

    vi.spyOn(prisma.category, 'delete').mockResolvedValue(mockCategoryOwn);

    const result = await service.remove(1, cashierUser);

    expect(result).toEqual(mockCategoryOwn);
    expect(prisma.category.delete).toHaveBeenCalledWith({
      where: { id: 1 },
    });
  });

  it('WAITER no puede eliminar categoría de otro restaurante', async () => {
    const waiterUser = { sub: 2, role: UserRole.WAITER, restaurantId: 1 };

    await expect(
      service.remove(2, waiterUser),
    ).rejects.toThrow(NotFoundException);
  });

  it('ADMIN puede eliminar categorías de su restaurante', async () => {
    const adminUser = { sub: 1, role: UserRole.ADMIN, restaurantId: 1 };
    const mockCategory = {
      id: 1,
      name: 'Bebidas',
      restaurantId: 1,
      isActive: true,
      createdAt: new Date(),
      description: null,
    };

    vi.spyOn(prisma.category, 'findFirst').mockResolvedValue(mockCategory);
    vi.spyOn(prisma.category, 'delete').mockResolvedValue(mockCategory);

    const result = await service.remove(1, adminUser);

    expect(result).toEqual(mockCategory);
    expect(prisma.category.delete).toHaveBeenCalledWith({
      where: { id: 1 },
    });
  });
});
