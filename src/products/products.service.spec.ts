import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/requests/create-product.dto.js';
import { UserRole } from '../../generated/prisma/enums.js';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: PrismaService;

  const waiterUser = { sub: 2, role: UserRole.WAITER, restaurantId: 1 };
  const cashierUser = { sub: 3, role: UserRole.CASHIER, restaurantId: 1 };
  const adminUser = { sub: 1, role: UserRole.ADMIN, restaurantId: 1 };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: PrismaService,
          useValue: {
            product: {
              create: vi.fn(),
              findMany: vi.fn(),
              findFirst: vi.fn(),
              update: vi.fn(),
              delete: vi.fn(),
            },
            productCategory: {
              upsert: vi.fn(),
              findUnique: vi.fn(),
              delete: vi.fn(),
            },
            category: {
              findMany: vi.fn(),
            },
            restaurant: {
              findUnique: vi.fn(),
            },
            $transaction: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('WAITER puede consultar productos de su restaurante (findAll)', async () => {
    const mockProducts = [
      {
        id: 1,
        name: 'Coca Cola',
        price: 2500,
        restaurantId: 1,
        productCategories: [],
      },
    ];

    prisma.product.findMany = vi.fn().mockResolvedValue(mockProducts);

    const result = await service.findAll(waiterUser);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Coca Cola');
    expect(result[0].price).toEqual('2500');
    expect(result[0].restaurantId).toEqual(1);
    expect(prisma.product.findMany).toHaveBeenCalledWith({
      where: { restaurantId: 1 },
      orderBy: { createdAt: 'desc' },
      include: { productCategories: { include: { category: true } } },
    });
  });

  it('CASHIER puede consultar productos de su restaurante (findAll)', async () => {
    const mockProducts = [
      {
        id: 1,
        name: 'Coca Cola',
        price: 2500,
        restaurantId: 1,
        productCategories: [],
      },
    ];

    prisma.product.findMany = vi.fn().mockResolvedValue(mockProducts);

    const result = await service.findAll(cashierUser);

    expect(result).toHaveLength(1);
  });

  it('WAITER puede consultar un producto de su restaurante (findOne)', async () => {
    const mockProduct = {
      id: 1,
      name: 'Coca Cola',
      price: 2500,
      restaurantId: 1,
      productCategories: [],
    };

    prisma.product.findFirst = vi.fn().mockResolvedValue(mockProduct);

    const result = await service.findOne(1, waiterUser);

    expect(result.name).toEqual('Coca Cola');
    expect(result.price).toEqual('2500');
    expect(result.restaurantId).toEqual(1);
  });

  it('CASHIER puede consultar un producto de su restaurante (findOne)', async () => {
    const mockProduct = {
      id: 1,
      name: 'Coca Cola',
      price: 2500,
      restaurantId: 1,
      productCategories: [],
    };

    prisma.product.findFirst = vi.fn().mockResolvedValue(mockProduct);

    const result = await service.findOne(1, cashierUser);

    expect(result.name).toEqual('Coca Cola');
    expect(result.price).toEqual('2500');
    expect(result.restaurantId).toEqual(1);
  });

  it('ADMIN puede crear productos', async () => {
    const createDto: CreateProductDto = {
      name: 'New Product',
      price: 5000,
      restaurantId: 1,
    };
    const mockProduct = {
      id: 2,
      name: 'New Product',
      price: '5000',
      restaurantId: 1,
      productCategories: [],
    };

    prisma.restaurant.findUnique = vi.fn().mockResolvedValue({
      id: 1,
      name: 'Test Restaurant',
    });
    prisma.product.create = vi.fn().mockResolvedValue(mockProduct);

    const result = await service.create(createDto, adminUser);

    expect(result).toMatchObject({
      id: 2,
      name: 'New Product',
      price: '5000',
      restaurantId: 1,
    });
  });

  it('ADMIN no puede consultar un producto de otro restaurante (NotFoundException)', async () => {
    prisma.product.findFirst = vi.fn().mockResolvedValue(null);

    await expect(service.findOne(2, adminUser)).rejects.toThrow(NotFoundException);

    expect(prisma.product.findFirst).toHaveBeenCalledWith({
      where: { id: 2, restaurantId: 1 },
      include: { productCategories: { include: { category: true } } },
    });
  });

  it('SUPER_ADMIN puede consultar todos los productos (findAll sin filtro restaurantId)', async () => {
    const superAdminUser = { sub: 1, role: UserRole.SUPER_ADMIN, restaurantId: null };
    const mockProducts = [
      { id: 1, name: 'Coca Cola', price: 2500, restaurantId: 1, productCategories: [] },
      { id: 2, name: 'Pepsi', price: 2000, restaurantId: 2, productCategories: [] },
    ];

    prisma.product.findMany = vi.fn().mockResolvedValue(mockProducts);

    const result = await service.findAll(superAdminUser);

    expect(result).toHaveLength(2);
    expect(prisma.product.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { createdAt: 'desc' },
      include: { productCategories: { include: { category: true } } },
    });
  });

  it('SUPER_ADMIN puede consultar cualquier producto (findOne sin filtro restaurantId)', async () => {
    const superAdminUser = { sub: 1, role: UserRole.SUPER_ADMIN, restaurantId: null };
    const mockProduct = {
      id: 2,
      name: 'Pepsi',
      price: 2000,
      restaurantId: 2,
      productCategories: [],
    };

    prisma.product.findFirst = vi.fn().mockResolvedValue(mockProduct);

    const result = await service.findOne(2, superAdminUser);

    expect(result.name).toEqual('Pepsi');
    expect(result.restaurantId).toEqual(2);
    expect(prisma.product.findFirst).toHaveBeenCalledWith({
      where: { id: 2 },
      include: { productCategories: { include: { category: true } } },
    });
  });
  it('ADMIN puede actualizar un producto de su restaurante', async () => {
    const mockProduct = {
      id: 1,
      name: 'Coca Cola',
      price: 2500,
      restaurantId: 1,
      productCategories: [],
    };

    prisma.product.findFirst = vi.fn().mockResolvedValue(mockProduct);
    prisma.product.update = vi.fn().mockResolvedValue({
      ...mockProduct,
      name: 'Coca Cola Zero',
    });

    const result = await service.update(
      1,
      { name: 'Coca Cola Zero' },
      adminUser,
    );

    expect(result.name).toBe('Coca Cola Zero');
    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        name: 'Coca Cola Zero',
        restaurantId: 1,
      },
      include: { productCategories: { include: { category: true } } },
    });
  });

  it('SUPER_ADMIN puede actualizar un producto sin forzar restaurantId', async () => {
    const superAdminUser = {
      sub: 1,
      role: UserRole.SUPER_ADMIN,
      restaurantId: null,
    };

    const mockProduct = {
      id: 1,
      name: 'Coca Cola',
      price: 2500,
      restaurantId: 1,
      productCategories: [],
    };

    prisma.product.findFirst = vi.fn().mockResolvedValue(mockProduct);
    prisma.product.update = vi.fn().mockResolvedValue({
      ...mockProduct,
      name: 'Pepsi',
    });

    const result = await service.update(1, { name: 'Pepsi' }, superAdminUser);

    expect(result.name).toBe('Pepsi');
    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { name: 'Pepsi' },
      include: { productCategories: { include: { category: true } } },
    });
  });

  it('no permite actualizar un producto inexistente', async () => {
    prisma.product.findFirst = vi.fn().mockResolvedValue(null);

    await expect(
      service.update(99, { name: 'Nuevo nombre' }, adminUser),
    ).rejects.toThrow(NotFoundException);

    expect(prisma.product.update).not.toHaveBeenCalled();
  });

  it('ADMIN puede eliminar un producto de su restaurante', async () => {
    prisma.product.findFirst = vi.fn().mockResolvedValue({
      id: 1,
      name: 'Coca Cola',
      price: 2500,
      restaurantId: 1,
      productCategories: [],
    });

    prisma.product.delete = vi.fn().mockResolvedValue({ id: 1 });

    await service.remove(1, adminUser);

    expect(prisma.product.delete).toHaveBeenCalledWith({
      where: { id: 1 },
    });
  });
  it('ADMIN puede asignar categorías a un producto', async () => {
    const mockProduct = {
      id: 1,
      name: 'Coca Cola',
      price: 2500,
      restaurantId: 1,
      productCategories: [],
    };

    prisma.product.findFirst = vi.fn().mockResolvedValue(mockProduct);
    prisma.category.findMany = vi.fn().mockResolvedValue([
      { id: 1, restaurantId: 1 },
      { id: 2, restaurantId: 1 },
    ]);

    prisma.$transaction = vi.fn().mockImplementation(async (callback) =>
      callback({
        productCategory: {
          upsert: vi.fn().mockResolvedValue({}),
        },
      }),
    );

    const result = await service.assignCategories(
      1,
      { categoryIds: [1, 2] },
      adminUser,
    );

    expect(result.id).toBe(1);
    expect(prisma.category.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: [1, 2] },
        restaurantId: 1,
      },
    });
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('elimina IDs de categorías repetidos antes de asignarlas', async () => {
    const mockProduct = {
      id: 1,
      name: 'Coca Cola',
      price: 2500,
      restaurantId: 1,
      productCategories: [],
    };

    prisma.product.findFirst = vi.fn().mockResolvedValue(mockProduct);
    prisma.category.findMany = vi.fn().mockResolvedValue([
      { id: 1, restaurantId: 1 },
    ]);

    const upsert = vi.fn().mockResolvedValue({});

    prisma.$transaction = vi.fn().mockImplementation(async (callback) =>
      callback({
        productCategory: { upsert },
      }),
    );

    await service.assignCategories(
      1,
      { categoryIds: [1, 1] },
      adminUser,
    );

    expect(prisma.category.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: [1] },
        restaurantId: 1,
      },
    });
    expect(upsert).toHaveBeenCalledTimes(1);
  });

  it('no permite asignar categorías inexistentes o de otro restaurante', async () => {
    prisma.product.findFirst = vi.fn().mockResolvedValue({
      id: 1,
      name: 'Coca Cola',
      price: 2500,
      restaurantId: 1,
      productCategories: [],
    });

    prisma.category.findMany = vi.fn().mockResolvedValue([]);

    await expect(
      service.assignCategories(1, { categoryIds: [99] }, adminUser),
    ).rejects.toThrow(NotFoundException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it('ADMIN puede quitar una categoría asignada a un producto', async () => {
    const mockProduct = {
      id: 1,
      name: 'Coca Cola',
      price: 2500,
      restaurantId: 1,
      productCategories: [],
    };

    prisma.product.findFirst = vi.fn().mockResolvedValue(mockProduct);
    prisma.productCategory.findUnique = vi.fn().mockResolvedValue({
      productId: 1,
      categoryId: 2,
    });
    prisma.productCategory.delete = vi.fn().mockResolvedValue({});

    const result = await service.removeCategory(1, 2, adminUser);

    expect(prisma.productCategory.findUnique).toHaveBeenCalledWith({
      where: {
        productId_categoryId: {
          productId: 1,
          categoryId: 2,
        },
      },
    });

    expect(prisma.productCategory.delete).toHaveBeenCalledWith({
      where: {
        productId_categoryId: {
          productId: 1,
          categoryId: 2,
        },
      },
    });

    expect(result.id).toBe(1);
  });

  it('no permite quitar una categoría que no está asignada al producto', async () => {
    prisma.product.findFirst = vi.fn().mockResolvedValue({
      id: 1,
      name: 'Coca Cola',
      price: 2500,
      restaurantId: 1,
      productCategories: [],
    });

    prisma.productCategory.findUnique = vi.fn().mockResolvedValue(null);

    await expect(
      service.removeCategory(1, 99, adminUser),
    ).rejects.toThrow(NotFoundException);

    expect(prisma.productCategory.delete).not.toHaveBeenCalled();
  });

  it('no permite eliminar categorías de un producto inexistente', async () => {
    prisma.product.findFirst = vi.fn().mockResolvedValue(null);

    await expect(
      service.removeCategory(99, 2, adminUser),
    ).rejects.toThrow(NotFoundException);

    expect(prisma.productCategory.findUnique).not.toHaveBeenCalled();
  });
});