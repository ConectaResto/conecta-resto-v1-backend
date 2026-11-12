
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UserRole } from '../../generated/prisma/enums.js';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  const superAdminUser = {
    sub: 1,
    role: UserRole.SUPER_ADMIN,
    restaurantId: null,
  };

  const adminUser = {
    sub: 2,
    role: UserRole.ADMIN,
    restaurantId: 1,
  };

  const waiterUser = {
    sub: 3,
    role: UserRole.WAITER,
    restaurantId: 1,
  };

  const mockUser = {
    id: 10,
    name: 'Test User',
    email: 'test@test.com',
    role: UserRole.WAITER,
    restaurantId: 1,
    passwordHash: 'hashed-password',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

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

  describe('findAll', () => {
    it('SUPER_ADMIN puede consultar todos los usuarios', async () => {
      vi.spyOn(prisma.user, 'findMany').mockResolvedValue([
        mockUser,
      ]);

      const result = await service.findAll(superAdminUser);

      expect(result).toHaveLength(1);
      expect(result[0]).not.toHaveProperty('passwordHash');
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {},
      });
    });

    it('ADMIN solo puede consultar usuarios de su restaurante', async () => {
      vi.spyOn(prisma.user, 'findMany').mockResolvedValue([
        mockUser,
      ]);

      const result = await service.findAll(adminUser);

      expect(result).toHaveLength(1);
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { restaurantId: 1 },
      });
    });
  });

  describe('findOne', () => {
    it('SUPER_ADMIN puede consultar cualquier usuario', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockUser);

      const result = await service.findOne(10, superAdminUser);

      expect(result).toMatchObject({
        id: 10,
        name: 'Test User',
        email: 'test@test.com',
        role: UserRole.WAITER,
        restaurantId: 1,
      });

      expect(result).not.toHaveProperty('passwordHash');

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { id: 10 },
      });
    });

    it('ADMIN solo puede consultar usuarios de su restaurante', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockUser);

      await service.findOne(10, adminUser);

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          id: 10,
          restaurantId: 1,
        },
      });
    });

    it('lanza NotFoundException cuando el usuario no existe', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(null);

      await expect(
        service.findOne(99, adminUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('ADMIN puede crear usuarios en su restaurante', async () => {
      vi.spyOn(prisma.user, 'create').mockResolvedValue(mockUser);

      const result = await service.create(
        {
          name: 'Test User',
          email: 'test@test.com',
          password: 'Password123',
          role: UserRole.WAITER,
          restaurantId: 99,
        },
        adminUser,
      );

      expect(result).toMatchObject({
        id: 10,
        name: 'Test User',
        restaurantId: 1,
      });

      expect(result).not.toHaveProperty('passwordHash');

      const createCall = vi.mocked(prisma.user.create).mock.calls[0][0];

      expect(createCall.data.restaurantId).toBe(1);
      expect(createCall.data.passwordHash).toBeDefined();
      expect(createCall.data.passwordHash).not.toBe('Password123');
    });

    it('SUPER_ADMIN puede crear usuarios sin restaurante cuando son SUPER_ADMIN', async () => {
      const superAdminCreated = {
        ...mockUser,
        role: UserRole.SUPER_ADMIN,
        restaurantId: null,
      };

      vi.spyOn(prisma.user, 'create').mockResolvedValue(
        superAdminCreated,
      );

      const result = await service.create(
        {
          name: 'Super Admin',
          email: 'super@test.com',
          password: 'Password123',
          role: UserRole.SUPER_ADMIN,
          restaurantId: null,
        },
        superAdminUser,
      );

      expect(result.role).toBe(UserRole.SUPER_ADMIN);
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it('ADMIN no puede crear usuarios SUPER_ADMIN', async () => {
      await expect(
        service.create(
          {
            name: 'Super Admin',
            email: 'super@test.com',
            password: 'Password123',
            role: UserRole.SUPER_ADMIN,
          },
          adminUser,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('lanza BadRequestException si el rol requiere restaurante y no tiene asignación', async () => {
      const adminWithoutRestaurant = {
        ...adminUser,
        restaurantId: null,
      };

      await expect(
        service.create(
          {
            name: 'Waiter',
            email: 'waiter@test.com',
            password: 'Password123',
            role: UserRole.WAITER,
          },
          adminWithoutRestaurant,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('maneja errores de correo duplicado', async () => {
      vi.spyOn(prisma.user, 'create').mockRejectedValue({
        code: 'P2002',
      });

      await expect(
        service.create(
          {
            name: 'Test User',
            email: 'test@test.com',
            password: 'Password123',
            role: UserRole.WAITER,
          },
          adminUser,
        ),
      ).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('lanza NotFoundException cuando el usuario no existe', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(null);

      await expect(
        service.update(99, { name: 'Nuevo nombre' }, adminUser),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('ADMIN no puede modificar un usuario SUPER_ADMIN', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue({
        ...mockUser,
        role: UserRole.SUPER_ADMIN,
      });

      await expect(
        service.update(10, { name: 'Nuevo nombre' }, adminUser),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('ADMIN no puede asignar el rol SUPER_ADMIN', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockUser);

      await expect(
        service.update(
          10,
          { role: UserRole.SUPER_ADMIN },
          adminUser,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('ADMIN puede actualizar usuarios de su restaurante', async () => {
      const updatedUser = {
        ...mockUser,
        name: 'Updated User',
      };

      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockUser);
      vi.spyOn(prisma.user, 'update').mockResolvedValue(updatedUser);

      const result = await service.update(
        10,
        { name: 'Updated User' },
        adminUser,
      );

      expect(result.name).toBe('Updated User');
      expect(result).not.toHaveProperty('passwordHash');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: {
          name: 'Updated User',
          restaurantId: 1,
          passwordHash: undefined,
        },
      });
    });

    it('actualiza la contraseña mediante un hash', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockUser);
      vi.spyOn(prisma.user, 'update').mockResolvedValue(mockUser);

      await service.update(
        10,
        { password: 'NewPassword123' },
        adminUser,
      );

      const updateCall = vi.mocked(prisma.user.update).mock.calls[0][0];

      expect(updateCall.data.passwordHash).toBeDefined();
      expect(updateCall.data.passwordHash).not.toBe('NewPassword123');
    });

    it('SUPER_ADMIN puede cambiar el restaurante de un usuario', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockUser);
      vi.spyOn(prisma.user, 'update').mockResolvedValue({
        ...mockUser,
        restaurantId: 2,
      });

      const result = await service.update(
        10,
        { restaurantId: 2 },
        superAdminUser,
      );

      expect(result.restaurantId).toBe(2);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: {
          restaurantId: 2,
          passwordHash: undefined,
        },
      });
    });

    it('lanza BadRequestException si el rol requiere restaurante y no tiene asignación', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue({
        ...mockUser,
        restaurantId: null,
      });

      await expect(
        service.update(
          10,
          { restaurantId: null },
          superAdminUser,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('maneja errores de correo duplicado al actualizar', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockUser);
      vi.spyOn(prisma.user, 'update').mockRejectedValue({
        code: 'P2002',
      });

      await expect(
        service.update(
          10,
          { email: 'existing@test.com' },
          adminUser,
        ),
      ).rejects.toThrow();
    });
  });
});
