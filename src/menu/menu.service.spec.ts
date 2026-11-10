import { Test, TestingModule } from '@nestjs/testing';
import { MenuService } from './menu.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('MenuService', () => {
  let service: MenuService;
  let prisma: PrismaService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      table: {
        findFirst: vi.fn(),
      },
      category: {
        findMany: vi.fn(),
      },
      restaurant: {
        findUnique: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MenuService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<MenuService>(MenuService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('Restaurant not found → NotFoundException', async () => {
    vi.mocked(mockPrisma.table.findFirst).mockResolvedValue(null);

    await expect(service.getMenu(999, 1)).rejects.toThrow(NotFoundException);
  });

  it('Inactive restaurant → NotFoundException', async () => {
    vi.mocked(mockPrisma.table.findFirst).mockResolvedValue({
      id: 1,
      restaurantId: 1,
      isActive: true,
      restaurant: {
        id: 1,
        name: 'Test Restaurant',
        isActive: false,
        createdAt: new Date(),
      },
    });

    await expect(service.getMenu(1, 1)).rejects.toThrow(ForbiddenException);
  });

  it('Table not found → NotFoundException', async () => {
    vi.mocked(mockPrisma.table.findFirst).mockResolvedValue(null);

    await expect(service.getMenu(1, 999)).rejects.toThrow(NotFoundException);
  });

  it('Table belongs to another restaurant → NotFoundException', async () => {
    vi.mocked(mockPrisma.table.findFirst).mockResolvedValue(null);

    await expect(service.getMenu(1, 2)).rejects.toThrow(NotFoundException);
  });

  it('Table inactive → NotFoundException', async () => {
    vi.mocked(mockPrisma.table.findFirst).mockResolvedValue(null);

    await expect(service.getMenu(1, 3)).rejects.toThrow(NotFoundException);
  });

  it('Return menu with categories and products', async () => {
    const mockTable = {
      id: 1,
      number: 1,
      restaurantId: 1,
      isActive: true,
      isAvailable: true,
      restaurant: {
        id: 1,
        name: 'Test Restaurant',
        isActive: true,
        createdAt: new Date(),
      },
    };
    const mockCategories = [
      {
        id: 1,
        name: 'Drinks',
        description: null,
        restaurantId: 1,
        productCategories: [
          {
            product: {
              id: 1,
              name: 'Coca Cola',
              price: 2500,
              image: null,
              restaurantId: 1,
            },
          },
        ],
      },
    ];

    vi.mocked(mockPrisma.table.findFirst).mockResolvedValue(mockTable);
    vi.mocked(mockPrisma.category.findMany).mockResolvedValue(mockCategories);

    const result = await service.getMenu(1, 1);

    expect(result.restaurant).toEqual({
      id: 1,
      name: 'Test Restaurant',
      isActive: true,
    });
    expect(result.table).toEqual({
      id: 1,
      number: 1,
      isAvailable: true,
    });
    expect(result.categories).toHaveLength(1);
    expect(result.categories[0].products).toHaveLength(1);
    expect(result.categories[0].products[0].price).toEqual(2500);
  });
});
