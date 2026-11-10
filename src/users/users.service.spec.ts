import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UserRole } from '../../generated/prisma/enums.js';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  const superAdminUser = { sub: 1, role: UserRole.SUPER_ADMIN, restaurantId: null };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              create: vi.fn(),
              findMany: vi.fn(),
              findFirst: vi.fn(),
              update: vi.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('SUPER_ADMIN puede consultar todos los usuarios (findAll sin filtro restaurantId)', async () => {
    const mockUsers = [
      { id: 1, name: 'User 1', role: UserRole.ADMIN, restaurantId: 1 },
      { id: 2, name: 'User 2', role: UserRole.WAITER, restaurantId: 2 },
    ];

    prisma.user.findMany = vi.fn().mockResolvedValue(mockUsers);

    const result = await service.findAll(superAdminUser);

    expect(result).toHaveLength(2);
    expect(prisma.user.findMany).toHaveBeenCalledWith({ where: {} });
  });

  it('SUPER_ADMIN puede consultar cualquier usuario (findOne sin filtro restaurantId)', async () => {
    const mockUser = { id: 2, name: 'User 2', role: UserRole.WAITER, restaurantId: 2 };

    prisma.user.findFirst = vi.fn().mockResolvedValue(mockUser);

    const result = await service.findOne(2, superAdminUser);

    expect(result).toEqual(mockUser);
    expect(prisma.user.findFirst).toHaveBeenCalledWith({ where: { id: 2 } });
  });
});
