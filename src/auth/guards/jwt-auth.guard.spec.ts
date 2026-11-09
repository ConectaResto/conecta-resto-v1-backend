import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: JwtService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        { provide: JwtService, useValue: { verifyAsync: vi.fn() } },
        { provide: PrismaService, useValue: { user: { findUnique: vi.fn() } } },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    jwtService = module.get<JwtService>(JwtService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('debe lanzar UnauthorizedException cuando no hay token', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('debe lanzar UnauthorizedException cuando el scheme no es Bearer', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: { authorization: 'Basic token' } }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('debe lanzar UnauthorizedException cuando el token es inválido', async () => {
    vi.mocked(jwtService.verifyAsync).mockRejectedValue(new Error('Invalid token'));
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: { authorization: 'Bearer invalid-token' } }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('debe lanzar UnauthorizedException cuando el usuario no existe', async () => {
    vi.mocked(jwtService.verifyAsync).mockResolvedValue({ sub: 999 });
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: { authorization: 'Bearer valid-token' } }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('debe lanzar UnauthorizedException cuando el usuario está inactivo', async () => {
    vi.mocked(jwtService.verifyAsync).mockResolvedValue({ sub: 1 });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 1,
      name: 'Test User',
      email: 'test@test.com',
      passwordHash: 'hash',
      role: 'ADMIN',
      restaurantId: 1,
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: { authorization: 'Bearer valid-token' } }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('debe autorizar y setear request.user cuando el token es válido y el usuario está activo', async () => {
    const mockRequest: any = { headers: { authorization: 'Bearer valid-token' } };
    vi.mocked(jwtService.verifyAsync).mockResolvedValue({ sub: 1 });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 1,
      name: 'Test User',
      email: 'test@test.com',
      passwordHash: 'hash',
      role: 'ADMIN',
      restaurantId: 1,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const context = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(mockRequest.user).toEqual({ sub: 1, role: 'ADMIN', restaurantId: 1 });
  });
});
