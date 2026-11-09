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

  const waiterUser = { sub: 2, role: UserRole.WAITER, restaurantId: 1 };
  const cashierUser = { sub: 3, role: UserRole.CASHIER, restaurantId: 1 };
  const adminUser = { sub: 1, role: UserRole.ADMIN, restaurantId: 1 };

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
  });

  it('WAITER puede consultar categorías de su restaurante (findAll)', async () => {
    const mockCategories = [
      {
        id: 1,
        name: 'Bebidas',
        restaurantId: 1,
        isActive: true,
        createdAt: new Date(),
        description: null,
      },
    ];

    vi.spyOn(prisma.category, 'findMany').mockResolvedValue(mockCategories);

    const result = await service.findAll(waiterUser);

    expect(result).toEqual(mockCategories);
    expect(prisma.category.findMany).toHaveBeenCalledWith({
      where: { restaurantId: 1 },
      orderBy: { createdAt: 'desc' },
      include: { productCategories: { include: { product: true } } },
    });
  });

  it('CASHIER puede consultar categorías de su restaurante (findAll)', async () => {
    const mockCategories = [
      {
        id: 1,
        name: 'Bebidas',
        restaurantId: 1,
        isActive: true,
        createdAt: new Date(),
        description: null,
      },
    ];

    vi.spyOn(prisma.category, 'findMany').mockResolvedValue(mockCategories);

    const result = await service.findAll(cashierUser);

    expect(result).toEqual(mockCategories);
  });

  it('WAITER puede consultar una categoría de su restaurante (findOne)', async () => {
    const mockCategory = {
      id: 1,
      name: 'Bebidas',
      restaurantId: 1,
      isActive: true,
      createdAt: new Date(),
      description: null,
    };

    vi.spyOn(prisma.category, 'findFirst').mockResolvedValue(mockCategory);

    const result = await service.findOne(1, waiterUser);

    expect(result).toEqual(mockCategory);
    expect(prisma.category.findFirst).toHaveBeenCalledWith({
      where: { id: 1, restaurantId: 1 },
      include: { productCategories: { include: { product: true } } },
    });
  });

  it('CASHIER puede consultar una categoría de su restaurante (findOne)', async () => {
    const mockCategory = {
      id: 1,
      name: 'Bebidas',
      restaurantId: 1,
      isActive: true,
      createdAt: new Date(),
      description: null,
    };

    vi.spyOn(prisma.category, 'findFirst').mockResolvedValue(mockCategory);

    const result = await service.findOne(1, cashierUser);

    expect(result).toEqual(mockCategory);
  });

  it('ADMIN puede crear categorías', async () => {
    const createDto: CreateCategoryDto = {
      name: 'New Category',
      restaurantId: 1,
    };
    const mockCategory = {
      id: 2,
      name: 'New Category',
      restaurantId: 1,
      isActive: true,
      createdAt: new Date(),
      description: null,
    };

    vi.spyOn(prisma.restaurant, 'findUnique').mockResolvedValue({
      id: 1,
      name: 'Test Restaurant',
      address: 'Calle 1',
      phone: '3001234567',
      email: 'test@test.com',
      isActive: true,
      createdAt: new Date(),
    });
    vi.spyOn(prisma.category, 'create').mockResolvedValue(mockCategory);

    const result = await service.create(createDto, adminUser);

    expect(result).toEqual(mockCategory);
  });
});
