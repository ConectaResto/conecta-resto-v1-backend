import { Test, TestingModule } from '@nestjs/testing';
import { RestaurantsService } from './restaurants.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreateRestaurantDto } from './dto/create-restaurant.dto.js';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto.js';
import { UserRole } from '../../generated/prisma/enums.js';

describe('RestaurantsService', () => {
  let service: RestaurantsService;
  let prisma: PrismaService;

  const adminUser = { sub: 1, role: UserRole.ADMIN, restaurantId: 1 };
  const superAdminUser = { sub: 2, role: UserRole.SUPER_ADMIN, restaurantId: null };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RestaurantsService,
        {
          provide: PrismaService,
          useValue: {
            restaurant: {
              create: vi.fn(),
              findMany: vi.fn(),
              findUnique: vi.fn(),
              findFirst: vi.fn(),
              update: vi.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<RestaurantsService>(RestaurantsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('ADMIN no puede modificar isActive del restaurante (ForbiddenException)', async () => {
    const mockRestaurant = {
      id: 1,
      name: 'Test Restaurant',
      restaurantId: 1,
      isActive: true,
      products: [],
      categories: [],
      users: [],
      tables: [],
    };

    prisma.restaurant.findUnique = vi.fn().mockResolvedValue(mockRestaurant);

    await expect(
      service.update(1, { isActive: false }, adminUser),
    ).rejects.toThrow(ForbiddenException);
  });

  it('SUPER_ADMIN puede modificar isActive del restaurante', async () => {
    const mockRestaurant = {
      id: 1,
      name: 'Test Restaurant',
      restaurantId: 1,
      isActive: true,
      products: [],
      categories: [],
      users: [],
      tables: [],
    };
    const updatedRestaurant = {
      id: 1,
      name: 'Test Restaurant',
      restaurantId: 1,
      isActive: false,
      products: [],
      categories: [],
      users: [],
      tables: [],
    };

    prisma.restaurant.findUnique = vi.fn().mockResolvedValue(mockRestaurant);
    prisma.restaurant.update = vi.fn().mockResolvedValue(updatedRestaurant);

    const result = await service.update(1, { isActive: false }, superAdminUser);

    expect(result).toEqual(updatedRestaurant);
    expect(prisma.restaurant.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { isActive: false },
    });
  });

  it('ADMIN puede modificar otros campos del restaurante (nombre)', async () => {
    const mockRestaurant = {
      id: 1,
      name: 'Old Name',
      restaurantId: 1,
      isActive: true,
      products: [],
      categories: [],
      users: [],
      tables: [],
    };
    const updatedRestaurant = {
      id: 1,
      name: 'New Name',
      restaurantId: 1,
      isActive: true,
      products: [],
      categories: [],
      users: [],
      tables: [],
    };

    prisma.restaurant.findUnique = vi.fn().mockResolvedValue(mockRestaurant);
    prisma.restaurant.update = vi.fn().mockResolvedValue(updatedRestaurant);

    const result = await service.update(1, { name: 'New Name' }, adminUser);

    expect(result).toEqual(updatedRestaurant);
    expect(prisma.restaurant.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { name: 'New Name' },
    });
  });

  it('ADMIN no puede modificar isActive ni otros campos juntos', async () => {
    const mockRestaurant = {
      id: 1,
      name: 'Test Restaurant',
      restaurantId: 1,
      isActive: true,
      products: [],
      categories: [],
      users: [],
      tables: [],
    };

    prisma.restaurant.findUnique = vi.fn().mockResolvedValue(mockRestaurant);

    await expect(
      service.update(1, { name: 'New Name', isActive: false }, adminUser),
    ).rejects.toThrow(ForbiddenException);
  });

  it('SUPER_ADMIN puede crear restaurantes', async () => {
    const createDto: CreateRestaurantDto = {
      name: 'New Restaurant',
      address: 'Calle 1',
      phone: '3001234567',
      email: 'test@test.com',
    };
    const mockRestaurant = {
      id: 2,
      name: 'New Restaurant',
      address: 'Calle 1',
      phone: '3001234567',
      email: 'test@test.com',
      isActive: true,
    };

    prisma.restaurant.create = vi.fn().mockResolvedValue(mockRestaurant);

    const result = await service.create(createDto);

    expect(result).toEqual(mockRestaurant);
    expect(prisma.restaurant.create).toHaveBeenCalledWith({
      data: createDto,
    });
  });

  it('SUPER_ADMIN puede consultar todos los restaurantes (findAll sin filtro restaurantId)', async () => {
    const mockRestaurants = [
      { id: 1, name: 'Restaurant 1', restaurantId: 1, isActive: true, products: [], categories: [], users: [], tables: [] },
      { id: 2, name: 'Restaurant 2', restaurantId: 2, isActive: true, products: [], categories: [], users: [], tables: [] },
    ];

    prisma.restaurant.findMany = vi.fn().mockResolvedValue(mockRestaurants);

    const result = await service.findAll();

    expect(result).toEqual(mockRestaurants);
    expect(prisma.restaurant.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
    });
  });

  it('SUPER_ADMIN puede consultar cualquier restaurante (findOne sin filtro restaurantId)', async () => {
    const superAdminUser = { sub: 2, role: UserRole.SUPER_ADMIN, restaurantId: null };
    const mockRestaurant = {
      id: 2,
      name: 'Restaurant 2',
      restaurantId: 2,
      isActive: true,
      products: [],
      categories: [],
      users: [],
      tables: [],
    };

    prisma.restaurant.findUnique = vi.fn().mockResolvedValue(mockRestaurant);

    const result = await service.findOne(2, superAdminUser);

    expect(result).toEqual(mockRestaurant);
    expect(prisma.restaurant.findUnique).toHaveBeenCalledWith({
      where: { id: 2 },
      include: { categories: true },
    });
  });
});