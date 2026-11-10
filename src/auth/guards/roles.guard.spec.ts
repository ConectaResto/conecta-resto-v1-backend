import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard.js';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        { provide: Reflector, useValue: { getAllAndOverride: vi.fn() } },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  it('debe lanzar ForbiddenException cuando el rol no está permitido', () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue(['SUPER_ADMIN', 'ADMIN']);
    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user: { role: 'WAITER' } }),
      }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('debe autorizar cuando el rol está permitido', () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue(['SUPER_ADMIN', 'ADMIN', 'WAITER']);
    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user: { role: 'WAITER' } }),
      }),
    } as unknown as ExecutionContext;

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('debe autorizar cuando no hay decorador @Roles (sin restricciones)', () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue(undefined);
    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user: { role: 'CASHIER' } }),
      }),
    } as unknown as ExecutionContext;

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('CASHIER no puede acceder a endpoint de actualización de mesas (ForbiddenException)', () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue(['SUPER_ADMIN', 'ADMIN', 'WAITER']);
    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user: { role: 'CASHIER' } }),
      }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('WAITER puede acceder a endpoint de lectura de mesas', () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue(['SUPER_ADMIN', 'ADMIN', 'WAITER', 'CASHIER']);
    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user: { role: 'WAITER' } }),
      }),
    } as unknown as ExecutionContext;

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });
});
