import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { CategoriesService } from './categories.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { UserRole } from '../../generated/prisma/enums.js';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: PrismaService;

  const superAdminUser = { sub: 1, role: UserRole.SUPER_ADMIN, restaurantId: null };
  const adminUser = { sub: 2, role: UserRole.ADMIN, restaurantId: 1 };
  const waiterUser = { sub: 3, role: UserRole.WAITER, restaurantId: 1 };
  const cashierUser = { sub: 4, role: UserRole.CASHIER, restaurantId: 1 };

  const mockRestaurant = {
    id: 1,
    name: 'Test Restaurant',
    address: 'Calle 1',
    phone: '3001234567',
    email: 'test@test.com',
    isActive: true,
    createdAt: new Date(),
  };

  const mockRestaurantOther = {
    id: 2,
    name: 'Other Restaurant',
    address: 'Calle 2',
    phone: '3009876543',
    email: 'other@test.com',
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
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: PrismaService,
          useValue: {
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
          },
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    prisma = module.get<PrismaService>(PrismaService);

    vi.clearAllMocks();
  });

  describe('create', () => {
    it('ADMIN puede crear categoría en su restaurante', async () => {
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

    it('SUPER_ADMIN puede crear categoría especificando restaurantId', async () => {
      const createDto: CreateCategoryDto = { name: 'Nueva Categoría', restaurantId: 2 };
      const mockCategory = {
        id: 3,
        name: 'Nueva Categoría',
        restaurantId: 2,
        isActive: true,
        createdAt: new Date(),
        description: null,
      };

      vi.spyOn(prisma.restaurant, 'findUnique').mockResolvedValue(mockRestaurantOther);
      vi.spyOn(prisma.category, 'create').mockResolvedValue(mockCategory);

      const result = await service.create(createDto, superAdminUser);

      expect(result).toEqual(mockCategory);
      expect(prisma.category.create).toHaveBeenCalledWith({
        data: { name: 'Nueva Categoría', restaurantId: 2 },
      });
    });

    it('lanza NotFoundException cuando el restaurante no existe', async () => {
      const createDto: CreateCategoryDto = { name: 'Nueva Categoría', restaurantId: 99 };

      vi.spyOn(prisma.restaurant, 'findUnique').mockResolvedValue(null);

      await expect(service.create(createDto, adminUser)).rejects.toThrow(NotFoundException);
    });

    it('lanza ConflictException cuando el nombre ya existe (P2002)', async () => {
      const createDto: CreateCategoryDto = { name: 'Bebidas', restaurantId: 1 };
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed on field(s): name',
        { code: 'P2002', clientVersion: '5.7.1' },
      );

      vi.spyOn(prisma.restaurant, 'findUnique').mockResolvedValue(mockRestaurant);
      vi.spyOn(prisma.category, 'create').mockRejectedValue(prismaError);

      await expect(service.create(createDto, adminUser)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('ADMIN obtiene categorías de su restaurante', async () => {
      vi.spyOn(prisma.category, 'findMany').mockResolvedValue([mockCategoryOwn]);

      const result = await service.findAll(adminUser);

      expect(result).toEqual([mockCategoryOwn]);
      expect(prisma.category.findMany).toHaveBeenCalledWith({
        where: { restaurantId: 1 },
        orderBy: { createdAt: 'desc' },
        include: { productCategories: { include: { product: true } } },
      });
    });

    it('SUPER_ADMIN obtiene todas las categorías', async () => {
      vi.spyOn(prisma.category, 'findMany').mockResolvedValue([mockCategoryOwn, mockCategoryOther]);

      const result = await service.findAll(superAdminUser);

      expect(result).toHaveLength(2);
      expect(prisma.category.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
        include: { productCategories: { include: { product: true } } },
      });
    });
  });

  describe('findOne', () => {
    it('ADMIN obtiene categoría de su restaurante', async () => {
      vi.spyOn(prisma.category, 'findFirst').mockResolvedValue(mockCategoryOwn);

      const result = await service.findOne(1, adminUser);

      expect(result).toEqual(mockCategoryOwn);
      expect(prisma.category.findFirst).toHaveBeenCalledWith({
        where: { id: 1, restaurantId: 1 },
        include: { productCategories: { include: { product: true } } },
      });
    });

    it('SUPER_ADMIN obtiene cualquier categoría', async () => {
      vi.spyOn(prisma.category, 'findFirst').mockResolvedValue(mockCategoryOther);

      const result = await service.findOne(2, superAdminUser);

      expect(result).toEqual(mockCategoryOther);
      expect(prisma.category.findFirst).toHaveBeenCalledWith({
        where: { id: 2 },
        include: { productCategories: { include: { product: true } } },
      });
    });

    it('lanza NotFoundException cuando la categoría no existe', async () => {
      vi.spyOn(prisma.category, 'findFirst').mockResolvedValue(null);

      await expect(service.findOne(99, adminUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('ADMIN puede actualizar categoría de su restaurante', async () => {
      const updatedCategory = { ...mockCategoryOwn, name: 'Nuevo Nombre' };

      vi.spyOn(prisma.category, 'findFirst').mockResolvedValue(mockCategoryOwn);
      vi.spyOn(prisma.category, 'update').mockResolvedValue(updatedCategory);

      const result = await service.update(1, { name: 'Nuevo Nombre' }, adminUser);

      expect(result).toEqual(updatedCategory);
      expect(prisma.category.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: 'Nuevo Nombre', restaurantId: 1 },
      });
    });

    it('SUPER_ADMIN puede actualizar cualquier categoría', async () => {
      const updatedCategory = { ...mockCategoryOther, name: 'Nuevo Nombre' };

      vi.spyOn(prisma.category, 'findFirst').mockResolvedValue(mockCategoryOther);
      vi.spyOn(prisma.category, 'update').mockResolvedValue(updatedCategory);

      const result = await service.update(2, { name: 'Nuevo Nombre' }, superAdminUser);

      expect(result).toEqual(updatedCategory);
      expect(prisma.category.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { name: 'Nuevo Nombre' },
      });
    });

    it('ADMIN no puede actualizar categoría de otro restaurante', async () => {
      vi.spyOn(prisma.category, 'findFirst').mockResolvedValue(null);

      await expect(
        service.update(2, { name: 'Nuevo Nombre' }, adminUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('WAITER no puede actualizar categoría de otro restaurante', async () => {
      vi.spyOn(prisma.category, 'findFirst').mockResolvedValue(null);

      await expect(
        service.update(2, { name: 'Nuevo Nombre' }, waiterUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('CASHIER puede eliminar categoría de su restaurante', async () => {
      vi.spyOn(prisma.category, 'findFirst').mockResolvedValue(mockCategoryOwn);
      vi.spyOn(prisma.category, 'delete').mockResolvedValue(mockCategoryOwn);

      const result = await service.remove(1, cashierUser);

      expect(result).toEqual(mockCategoryOwn);
      expect(prisma.category.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('WAITER no puede eliminar categoría de otro restaurante', async () => {
      vi.spyOn(prisma.category, 'findFirst').mockResolvedValue(null);

      await expect(
        service.remove(2, waiterUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('ADMIN puede eliminar categoría de su restaurante', async () => {
      vi.spyOn(prisma.category, 'findFirst').mockResolvedValue(mockCategoryOwn);
      vi.spyOn(prisma.category, 'delete').mockResolvedValue(mockCategoryOwn);

      const result = await service.remove(1, adminUser);

      expect(result).toEqual(mockCategoryOwn);
      expect(prisma.category.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('SUPER_ADMIN puede eliminar categoría de cualquier restaurante', async () => {
      vi.spyOn(prisma.category, 'findFirst').mockResolvedValue(mockCategoryOther);
      vi.spyOn(prisma.category, 'delete').mockResolvedValue(mockCategoryOther);

      const result = await service.remove(2, superAdminUser);

      expect(result).toEqual(mockCategoryOther);
      expect(prisma.category.delete).toHaveBeenCalledWith({
        where: { id: 2 },
      });
    });
  });
});
