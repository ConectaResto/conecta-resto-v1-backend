import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { LoginDto } from './dto/requests/login.dto.js';
import { UserRole } from '../../generated/prisma/enums.js';

vi.mock('bcrypt', () => ({
  compare: vi.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const mockUser = {
    id: 1,
    name: 'Test User',
    email: 'test@test.com',
    passwordHash: 'hashed-password',
    role: UserRole.WAITER,
    restaurantId: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockInactiveUser = {
    ...mockUser,
    isActive: false,
  };

  const loginDto: LoginDto = {
    email: 'test@test.com',
    password: 'Password123',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: vi.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);

    vi.clearAllMocks();
  });

  describe('login', () => {
    it('lanza UnauthorizedException cuando el usuario no existe', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('lanza UnauthorizedException cuando el usuario está inactivo', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockInactiveUser);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('lanza UnauthorizedException cuando la contraseña es incorrecta', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
      (vi.mocked(bcrypt.compare) as any).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('login exitoso, retorna accessToken y usuario mapeado', async () => {
      const accessToken = 'mock-access-token';
      const expectedUserResponse = {
        id: 1,
        name: 'Test User',
        email: 'test@test.com',
        role: UserRole.WAITER,
        restaurantId: 1,
        isActive: true,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
      (vi.mocked(bcrypt.compare) as any).mockResolvedValue(true);
      vi.mocked(jwtService.signAsync).mockResolvedValue(accessToken);

      const result = await service.login(loginDto);

      expect(result).toEqual({
        accessToken,
        user: expectedUserResponse,
      });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@test.com' },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith('Password123', 'hashed-password');
      expect(jwtService.signAsync).toHaveBeenCalledWith({ sub: 1 });
    });
  });

  describe('getMe', () => {
    it('lanza UnauthorizedException cuando el usuario no existe', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(service.getMe(99)).rejects.toThrow(UnauthorizedException);
    });

    it('lanza UnauthorizedException cuando el usuario está inactivo', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockInactiveUser);

      await expect(service.getMe(1)).rejects.toThrow(UnauthorizedException);
    });

    it('getMe exitoso, retorna usuario mapeado', async () => {
      const expectedUserResponse = {
        id: 1,
        name: 'Test User',
        email: 'test@test.com',
        role: UserRole.WAITER,
        restaurantId: 1,
        isActive: true,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

      const result = await service.getMe(1);

      expect(result).toEqual(expectedUserResponse);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });
});
