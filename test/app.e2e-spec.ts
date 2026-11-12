import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../generated/prisma/enums.js';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const testUser = {
    email: 'e2e-login-test@test.com',
    password: 'TestPassword123',
    name: 'E2E Login Test',
    role: 'WAITER',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();

    const passwordHash = await bcrypt.hash(testUser.password, 10);
    await prisma.user.create({
      data: {
        email: testUser.email,
        passwordHash,
        name: testUser.name,
        role: testUser.role,
        isActive: true,
      },
    });
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { email: testUser.email } });
    await app.close();
  });

  describe('POST /auth/login', () => {
    it('debe rechazar credenciales inválidas (usuario inexistente)', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'anything' })
        .expect(401);
    });

    it('debe rechazar credenciales inválidas (contraseña incorrecta)', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: 'wrongpassword' })
        .expect(401);
    });

    it('debe autenticar con éxito y devolver JWT válido', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(201);

      expect(response.body.accessToken).toBeDefined();
      expect(typeof response.body.accessToken).toBe('string');
      expect(response.body.accessToken.length).toBeGreaterThan(0);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.role).toBe(testUser.role);
    });
  });
});

describe('Restaurants (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let superAdminToken: string;
  let adminToken: string;
  let waiterToken: string;
  let restaurantId: number;

  const superAdminUser = {
    email: 'e2e-superadmin-resto@test.com',
    password: 'TestPassword123',
    name: 'E2E SuperAdmin Restaurant',
    role: UserRole.SUPER_ADMIN,
  };

  const adminUser = {
    email: 'e2e-admin-resto@test.com',
    password: 'TestPassword123',
    name: 'E2E Admin Restaurant',
    role: UserRole.ADMIN,
  };

  const waiterUser = {
    email: 'e2e-waiter-resto@test.com',
    password: 'TestPassword123',
    name: 'E2E Waiter Restaurant',
    role: UserRole.WAITER,
  };

  const createRestaurantDto = {
    name: 'E2E Test Restaurant',
    address: 'Calle Test 123',
    phone: '3001234567',
    email: 'e2e-restaurant@test.com',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();

    // Crear SUPER_ADMIN
    const superAdminHash = await bcrypt.hash(superAdminUser.password, 10);
    await prisma.user.create({
      data: {
        email: superAdminUser.email,
        passwordHash: superAdminHash,
        name: superAdminUser.name,
        role: superAdminUser.role,
        isActive: true,
      },
    });

    // Login SUPER_ADMIN
    const superAdminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: superAdminUser.email, password: superAdminUser.password });
    superAdminToken = superAdminLogin.body.accessToken;

    // Crear restaurante como SUPER_ADMIN
    const createRes = await request(app.getHttpServer())
      .post('/restaurants')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send(createRestaurantDto)
      .expect(201);
    restaurantId = createRes.body.id;

    // Crear ADMIN con restaurantId del restaurante creado
    const adminHash = await bcrypt.hash(adminUser.password, 10);
    await prisma.user.create({
      data: {
        email: adminUser.email,
        passwordHash: adminHash,
        name: adminUser.name,
        role: adminUser.role,
        restaurantId,
        isActive: true,
      },
    });

    // Login ADMIN
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: adminUser.email, password: adminUser.password });
    adminToken = adminLogin.body.accessToken;

    // Crear y login WAITER para prueba de autorización
    const waiterHash = await bcrypt.hash(waiterUser.password, 10);
    await prisma.user.create({
      data: {
        email: waiterUser.email,
        passwordHash: waiterHash,
        name: waiterUser.name,
        role: waiterUser.role,
        isActive: true,
      },
    });
    const waiterLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: waiterUser.email, password: waiterUser.password });
    waiterToken = waiterLogin.body.accessToken;
  });

  afterAll(async () => {
    await prisma.restaurant.delete({ where: { id: restaurantId } });
    await prisma.user.delete({ where: { email: waiterUser.email } });
    await prisma.user.delete({ where: { email: adminUser.email } });
    await prisma.user.delete({ where: { email: superAdminUser.email } });
    await app.close();
  });

  describe('POST /restaurants', () => {
    it('debe crear restaurante como SUPER_ADMIN', async () => {
      const res = await request(app.getHttpServer())
        .get(`/restaurants/${restaurantId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);
      expect(res.body.name).toBe(createRestaurantDto.name);
    });

    it('debe rechazar crear restaurante como WAITER (403)', async () => {
      await request(app.getHttpServer())
        .post('/restaurants')
        .set('Authorization', `Bearer ${waiterToken}`)
        .send(createRestaurantDto)
        .expect(403);
    });
  });

  describe('GET /restaurants', () => {
    it('debe listar restaurantes como SUPER_ADMIN', async () => {
      const res = await request(app.getHttpServer())
        .get('/restaurants')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  describe('GET /restaurants/:id', () => {
    it('debe obtener restaurante como ADMIN del mismo restaurante', async () => {
      const res = await request(app.getHttpServer())
        .get(`/restaurants/${restaurantId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.id).toBe(restaurantId);
    });
  });

  describe('PATCH /restaurants/:id', () => {
    it('debe actualizar nombre de restaurante como ADMIN', async () => {
      await request(app.getHttpServer())
        .patch(`/restaurants/${restaurantId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'E2E Test Restaurant Updated' })
        .expect(200);
    });
  });

  describe('Validaciones de Restaurants', () => {
    it('debe devolver 404 al obtener restaurante inexistente', async () => {
      await request(app.getHttpServer())
        .get('/restaurants/99999')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(404);
    });

    it('debe rechazar crear restaurante sin campos obligatorios (400)', async () => {
      await request(app.getHttpServer())
        .post('/restaurants')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ name: '', address: '', phone: '' })
        .expect(400);
    });
  });
});

describe('Categories (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let superAdminToken: string;
  let adminToken: string;
  let waiterToken: string;
  let categoryId: number;
  let restaurantId: number;

  const superAdminUser = {
    email: 'e2e-superadmin-cat@test.com',
    password: 'TestPassword123',
    name: 'E2E SuperAdmin Category',
    role: UserRole.SUPER_ADMIN,
  };

  const adminUser = {
    email: 'e2e-admin-cat@test.com',
    password: 'TestPassword123',
    name: 'E2E Admin Category',
    role: UserRole.ADMIN,
  };

  const waiterUser = {
    email: 'e2e-waiter-cat@test.com',
    password: 'TestPassword123',
    name: 'E2E Waiter Category',
    role: UserRole.WAITER,
  };

  const createRestaurantDto = {
    name: 'E2E Test Restaurant Category',
    address: 'Calle Cat 123',
    phone: '3001234567',
    email: 'e2e-restaurant-cat@test.com',
  };

  const createCategoryDto = {
    name: 'E2E Test Category',
    description: 'Descripción prueba E2E',
    restaurantId: 0, // se asigna después de crear el restaurante
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();

    // Crear SUPER_ADMIN
    const superAdminHash = await bcrypt.hash(superAdminUser.password, 10);
    await prisma.user.create({
      data: {
        email: superAdminUser.email,
        passwordHash: superAdminHash,
        name: superAdminUser.name,
        role: superAdminUser.role,
        isActive: true,
      },
    });

    // Login SUPER_ADMIN
    const superAdminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: superAdminUser.email, password: superAdminUser.password });
    superAdminToken = superAdminLogin.body.accessToken;

    // Crear restaurante como SUPER_ADMIN
    const createRes = await request(app.getHttpServer())
      .post('/restaurants')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send(createRestaurantDto)
      .expect(201);
    restaurantId = createRes.body.id;
    createCategoryDto.restaurantId = restaurantId;

    // Crear ADMIN con restaurantId del restaurante creado
    const adminHash = await bcrypt.hash(adminUser.password, 10);
    await prisma.user.create({
      data: {
        email: adminUser.email,
        passwordHash: adminHash,
        name: adminUser.name,
        role: adminUser.role,
        restaurantId,
        isActive: true,
      },
    });

    // Login ADMIN
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: adminUser.email, password: adminUser.password });
    adminToken = adminLogin.body.accessToken;

    // Crear y login WAITER para prueba de autorización
    const waiterHash = await bcrypt.hash(waiterUser.password, 10);
    await prisma.user.create({
      data: {
        email: waiterUser.email,
        passwordHash: waiterHash,
        name: waiterUser.name,
        role: waiterUser.role,
        isActive: true,
      },
    });
    const waiterLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: waiterUser.email, password: waiterUser.password });
    waiterToken = waiterLogin.body.accessToken;
  });

  afterAll(async () => {
    if (categoryId) {
      await prisma.category.delete({ where: { id: categoryId } });
    }
    await prisma.restaurant.delete({ where: { id: restaurantId } });
    await prisma.user.delete({ where: { email: waiterUser.email } });
    await prisma.user.delete({ where: { email: adminUser.email } });
    await prisma.user.delete({ where: { email: superAdminUser.email } });
    await app.close();
  });

  describe('POST /categories', () => {
    it('debe crear categoría como ADMIN', async () => {
      const res = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createCategoryDto)
        .expect(201);
      categoryId = res.body.id;
      expect(res.body.name).toBe(createCategoryDto.name);
      expect(res.body.restaurantId).toBe(restaurantId);
    });

    it('debe rechazar crear categoría como WAITER (403)', async () => {
      await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${waiterToken}`)
        .send(createCategoryDto)
        .expect(403);
    });
  });
});

describe('Products (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let superAdminToken: string;
  let adminToken: string;
  let waiterToken: string;
  let productId: number;
  let restaurantId: number;

  const superAdminUser = {
    email: 'e2e-superadmin-prod@test.com',
    password: 'TestPassword123',
    name: 'E2E SuperAdmin Product',
    role: UserRole.SUPER_ADMIN,
  };

  const adminUser = {
    email: 'e2e-admin-prod@test.com',
    password: 'TestPassword123',
    name: 'E2E Admin Product',
    role: UserRole.ADMIN,
  };

  const waiterUser = {
    email: 'e2e-waiter-prod@test.com',
    password: 'TestPassword123',
    name: 'E2E Waiter Product',
    role: UserRole.WAITER,
  };

  const createRestaurantDto = {
    name: 'E2E Test Restaurant Product',
    address: 'Calle Prod 123',
    phone: '3001234567',
    email: 'e2e-restaurant-prod@test.com',
  };

  const createProductDto = {
    name: 'E2E Test Product',
    description: 'Descripción prueba E2E producto',
    price: 12500,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();

    // Crear SUPER_ADMIN
    const superAdminHash = await bcrypt.hash(superAdminUser.password, 10);
    await prisma.user.create({
      data: {
        email: superAdminUser.email,
        passwordHash: superAdminHash,
        name: superAdminUser.name,
        role: superAdminUser.role,
        isActive: true,
      },
    });

    // Login SUPER_ADMIN
    const superAdminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: superAdminUser.email, password: superAdminUser.password });
    superAdminToken = superAdminLogin.body.accessToken;

    // Crear restaurante como SUPER_ADMIN
    const createRes = await request(app.getHttpServer())
      .post('/restaurants')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send(createRestaurantDto)
      .expect(201);
    restaurantId = createRes.body.id;

    // Crear ADMIN con restaurantId del restaurante creado
    const adminHash = await bcrypt.hash(adminUser.password, 10);
    await prisma.user.create({
      data: {
        email: adminUser.email,
        passwordHash: adminHash,
        name: adminUser.name,
        role: adminUser.role,
        restaurantId,
        isActive: true,
      },
    });

    // Login ADMIN
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: adminUser.email, password: adminUser.password });
    adminToken = adminLogin.body.accessToken;

    // Crear y login WAITER para prueba de autorización
    const waiterHash = await bcrypt.hash(waiterUser.password, 10);
    await prisma.user.create({
      data: {
        email: waiterUser.email,
        passwordHash: waiterHash,
        name: waiterUser.name,
        role: waiterUser.role,
        isActive: true,
      },
    });
    const waiterLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: waiterUser.email, password: waiterUser.password });
    waiterToken = waiterLogin.body.accessToken;
  });

  afterAll(async () => {
    if (productId) {
      await prisma.product.delete({ where: { id: productId } });
    }
    await prisma.restaurant.delete({ where: { id: restaurantId } });
    await prisma.user.delete({ where: { email: waiterUser.email } });
    await prisma.user.delete({ where: { email: adminUser.email } });
    await prisma.user.delete({ where: { email: superAdminUser.email } });
    await app.close();
  });

  describe('POST /products', () => {
    it('debe crear producto como ADMIN', async () => {
      const res = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createProductDto)
        .expect(201);
      productId = res.body.id;
      expect(res.body.name).toBe(createProductDto.name);
      expect(Number(res.body.price)).toBe(createProductDto.price);
      expect(res.body.restaurantId).toBe(restaurantId);
    });

    it('debe rechazar crear producto como WAITER (403)', async () => {
      await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${waiterToken}`)
        .send(createProductDto)
        .expect(403);
    });
  });
});

describe('Tables (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let superAdminToken: string;
  let adminToken: string;
  let waiterToken: string;
  let tableId: number;
  let restaurantId: number;

  const superAdminUser = {
    email: 'e2e-superadmin-table@test.com',
    password: 'TestPassword123',
    name: 'E2E SuperAdmin Table',
    role: UserRole.SUPER_ADMIN,
  };

  const adminUser = {
    email: 'e2e-admin-table@test.com',
    password: 'TestPassword123',
    name: 'E2E Admin Table',
    role: UserRole.ADMIN,
  };

  const waiterUser = {
    email: 'e2e-waiter-table@test.com',
    password: 'TestPassword123',
    name: 'E2E Waiter Table',
    role: UserRole.WAITER,
  };

  const createRestaurantDto = {
    name: 'E2E Test Restaurant Table',
    address: 'Calle Table 123',
    phone: '3001234567',
    email: 'e2e-restaurant-table@test.com',
  };

  const createTableDto = {
    number: 5,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();

    // Crear SUPER_ADMIN
    const superAdminHash = await bcrypt.hash(superAdminUser.password, 10);
    await prisma.user.create({
      data: {
        email: superAdminUser.email,
        passwordHash: superAdminHash,
        name: superAdminUser.name,
        role: superAdminUser.role,
        isActive: true,
      },
    });

    // Login SUPER_ADMIN
    const superAdminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: superAdminUser.email, password: superAdminUser.password });
    superAdminToken = superAdminLogin.body.accessToken;

    // Crear restaurante como SUPER_ADMIN
    const createRes = await request(app.getHttpServer())
      .post('/restaurants')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send(createRestaurantDto)
      .expect(201);
    restaurantId = createRes.body.id;

    // Crear ADMIN con restaurantId del restaurante creado
    const adminHash = await bcrypt.hash(adminUser.password, 10);
    await prisma.user.create({
      data: {
        email: adminUser.email,
        passwordHash: adminHash,
        name: adminUser.name,
        role: adminUser.role,
        restaurantId,
        isActive: true,
      },
    });

    // Login ADMIN
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: adminUser.email, password: adminUser.password });
    adminToken = adminLogin.body.accessToken;

    // Crear y login WAITER para prueba de autorización
    const waiterHash = await bcrypt.hash(waiterUser.password, 10);
    await prisma.user.create({
      data: {
        email: waiterUser.email,
        passwordHash: waiterHash,
        name: waiterUser.name,
        role: waiterUser.role,
        isActive: true,
      },
    });
    const waiterLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: waiterUser.email, password: waiterUser.password });
    waiterToken = waiterLogin.body.accessToken;
  });

  afterAll(async () => {
    if (tableId) {
      await prisma.table.delete({ where: { id: tableId } });
    }
    await prisma.restaurant.delete({ where: { id: restaurantId } });
    await prisma.user.delete({ where: { email: waiterUser.email } });
    await prisma.user.delete({ where: { email: adminUser.email } });
    await prisma.user.delete({ where: { email: superAdminUser.email } });
    await app.close();
  });

  describe('POST /tables', () => {
    it('debe crear mesa como ADMIN', async () => {
      const res = await request(app.getHttpServer())
        .post('/tables')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createTableDto)
        .expect(201);
      tableId = res.body.id;
      expect(res.body.number).toBe(createTableDto.number);
      expect(res.body.restaurantId).toBe(restaurantId);
      expect(res.body.isActive).toBe(true);
    });

    it('debe rechazar crear mesa como WAITER (403)', async () => {
      await request(app.getHttpServer())
        .post('/tables')
        .set('Authorization', `Bearer ${waiterToken}`)
        .send(createTableDto)
        .expect(403);
    });
  });

  describe('GET /tables/:id', () => {
    it('debe obtener mesa como ADMIN del mismo restaurante', async () => {
      const res = await request(app.getHttpServer())
        .get(`/tables/${tableId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.id).toBe(tableId);
      expect(res.body.number).toBe(createTableDto.number);
    });
  });

  describe('Validaciones de Tables', () => {
    it('debe rechazar crear mesa sin número (400)', async () => {
      await request(app.getHttpServer())
        .post('/tables')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);
    });

    it('debe rechazar número de mesa duplicado en mismo restaurante (409)', async () => {
      await request(app.getHttpServer())
        .post('/tables')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ number: createTableDto.number })
        .expect(409);
    });

    it('debe devolver 404 al obtener mesa inexistente', async () => {
      await request(app.getHttpServer())
        .get('/tables/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('debe devolver 404 al crear mesa con restaurante inexistente como SUPER_ADMIN', async () => {
      await request(app.getHttpServer())
        .post('/tables')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ number: 999, restaurantId: 99999 })
        .expect(404);
    });
  });
});

describe('Users (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let superAdminToken: string;
  let adminToken: string;
  let waiterToken: string;
  let createdUserId: number;
  let restaurantId: number;

  const superAdminUser = {
    email: 'e2e-superadmin-user@test.com',
    password: 'TestPassword123',
    name: 'E2E SuperAdmin User',
    role: UserRole.SUPER_ADMIN,
  };

  const adminUser = {
    email: 'e2e-admin-user@test.com',
    password: 'TestPassword123',
    name: 'E2E Admin User',
    role: UserRole.ADMIN,
  };

  const waiterUser = {
    email: 'e2e-waiter-user@test.com',
    password: 'TestPassword123',
    name: 'E2E Waiter User',
    role: UserRole.WAITER,
  };

  const createRestaurantDto = {
    name: 'E2E Test Restaurant User',
    address: 'Calle User 123',
    phone: '3001234567',
    email: 'e2e-restaurant-user@test.com',
  };

  const createUserDto = {
    name: 'E2E Test Created User',
    email: 'e2e-created-user@test.com',
    password: 'TestPassword123',
    role: UserRole.WAITER,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();

    // Crear SUPER_ADMIN
    const superAdminHash = await bcrypt.hash(superAdminUser.password, 10);
    await prisma.user.create({
      data: {
        email: superAdminUser.email,
        passwordHash: superAdminHash,
        name: superAdminUser.name,
        role: superAdminUser.role,
        isActive: true,
      },
    });

    // Login SUPER_ADMIN
    const superAdminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: superAdminUser.email, password: superAdminUser.password });
    superAdminToken = superAdminLogin.body.accessToken;

    // Crear restaurante como SUPER_ADMIN
    const createRes = await request(app.getHttpServer())
      .post('/restaurants')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send(createRestaurantDto)
      .expect(201);
    restaurantId = createRes.body.id;

    // Crear ADMIN con restaurantId del restaurante creado
    const adminHash = await bcrypt.hash(adminUser.password, 10);
    await prisma.user.create({
      data: {
        email: adminUser.email,
        passwordHash: adminHash,
        name: adminUser.name,
        role: adminUser.role,
        restaurantId,
        isActive: true,
      },
    });

    // Login ADMIN
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: adminUser.email, password: adminUser.password });
    adminToken = adminLogin.body.accessToken;

    // Crear y login WAITER para prueba de autorización
    const waiterHash = await bcrypt.hash(waiterUser.password, 10);
    await prisma.user.create({
      data: {
        email: waiterUser.email,
        passwordHash: waiterHash,
        name: waiterUser.name,
        role: waiterUser.role,
        isActive: true,
      },
    });
    const waiterLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: waiterUser.email, password: waiterUser.password });
    waiterToken = waiterLogin.body.accessToken;
  });

  afterAll(async () => {
    if (createdUserId) {
      await prisma.user.delete({ where: { id: createdUserId } });
    }
    await prisma.restaurant.delete({ where: { id: restaurantId } });
    await prisma.user.delete({ where: { email: waiterUser.email } });
    await prisma.user.delete({ where: { email: adminUser.email } });
    await prisma.user.delete({ where: { email: superAdminUser.email } });
    await app.close();
  });

  describe('POST /users', () => {
    it('debe crear usuario como ADMIN', async () => {
      const res = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createUserDto)
        .expect(201);
      createdUserId = res.body.id;
      expect(res.body.name).toBe(createUserDto.name);
      expect(res.body.email).toBe(createUserDto.email);
      expect(res.body.role).toBe(createUserDto.role);
      expect(res.body.restaurantId).toBe(restaurantId);
    });

    it('debe rechazar crear usuario como WAITER (403)', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${waiterToken}`)
        .send(createUserDto)
        .expect(403);
    });
  });

  describe('GET /users/:id', () => {
    it('debe obtener usuario creado como ADMIN', async () => {
      const res = await request(app.getHttpServer())
        .get(`/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.id).toBe(createdUserId);
      expect(res.body.email).toBe(createUserDto.email);
      expect(res.body.role).toBe(createUserDto.role);
    });
  });
});

describe('Menu público (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let menuRestaurantId: number;
  let menuTableId: number;

  const createRestaurantDto = {
    name: 'E2E Test Restaurant Menu',
    address: 'Calle Menu 123',
    phone: '3001234567',
    email: 'e2e-restaurant-menu@test.com',
  };

  const createTableDto = {
    number: 1,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();

    const restaurant = await prisma.restaurant.create({
      data: {
        ...createRestaurantDto,
        isActive: true,
      },
    });
    menuRestaurantId = restaurant.id;

    const table = await prisma.table.create({
      data: {
        ...createTableDto,
        restaurantId: menuRestaurantId,
        isActive: true,
        isAvailable: true,
        qrToken: 'e2e-menu-qr-token-001',
      },
    });
    menuTableId = table.id;
  });

  afterAll(async () => {
    await prisma.table.delete({ where: { id: menuTableId } });
    await prisma.restaurant.delete({ where: { id: menuRestaurantId } });
    await app.close();
  });

  describe('GET /menu/restaurant/:restaurantId/table/:tableId', () => {
    it('debe obtener el menú público sin JWT', async () => {
      const res = await request(app.getHttpServer())
        .get(`/menu/restaurant/${menuRestaurantId}/table/${menuTableId}`)
        .expect(200);

      expect(res.body.restaurant).toBeDefined();
      expect(res.body.restaurant.id).toBe(menuRestaurantId);
      expect(res.body.restaurant.name).toBe(createRestaurantDto.name);
      expect(res.body.restaurant.isActive).toBe(true);
      expect(res.body.table).toBeDefined();
      expect(res.body.table.id).toBe(menuTableId);
      expect(res.body.table.number).toBe(createTableDto.number);
      expect(res.body.table.isAvailable).toBe(true);
      expect(Array.isArray(res.body.categories)).toBe(true);
    });

    it('debe devolver 404 cuando la mesa o restaurante no existen', async () => {
      await request(app.getHttpServer())
        .get('/menu/restaurant/99999/table/99999')
        .expect(404);
    });
  });
});

describe('Service (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let superAdminToken: string;
  let adminToken: string;
  let waiterToken: string;
  let serviceId: number;
  let tableId: number;
  let restaurantId: number;
  const qrToken = 'e2e-service-qr-token-001';

  const superAdminUser = {
    email: 'e2e-superadmin-svc@test.com',
    password: 'TestPassword123',
    name: 'E2E SuperAdmin Service',
    role: UserRole.SUPER_ADMIN,
  };

  const adminUser = {
    email: 'e2e-admin-svc@test.com',
    password: 'TestPassword123',
    name: 'E2E Admin Service',
    role: UserRole.ADMIN,
  };

  const waiterUser = {
    email: 'e2e-waiter-svc@test.com',
    password: 'TestPassword123',
    name: 'E2E Waiter Service',
    role: UserRole.WAITER,
  };

  const createRestaurantDto = {
    name: 'E2E Test Restaurant Service',
    address: 'Calle Svc 123',
    phone: '3001234567',
    email: 'e2e-restaurant-svc@test.com',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();

    // Crear SUPER_ADMIN
    const superAdminHash = await bcrypt.hash(superAdminUser.password, 10);
    await prisma.user.create({
      data: {
        email: superAdminUser.email,
        passwordHash: superAdminHash,
        name: superAdminUser.name,
        role: superAdminUser.role,
        isActive: true,
      },
    });

    // Login SUPER_ADMIN
    const superAdminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: superAdminUser.email, password: superAdminUser.password });
    superAdminToken = superAdminLogin.body.accessToken;

    // Crear restaurante como SUPER_ADMIN
    const createRes = await request(app.getHttpServer())
      .post('/restaurants')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send(createRestaurantDto)
      .expect(201);
    restaurantId = createRes.body.id;

    // Crear ADMIN con restaurantId del restaurante creado
    const adminHash = await bcrypt.hash(adminUser.password, 10);
    await prisma.user.create({
      data: {
        email: adminUser.email,
        passwordHash: adminHash,
        name: adminUser.name,
        role: adminUser.role,
        restaurantId,
        isActive: true,
      },
    });

    // Login ADMIN
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: adminUser.email, password: adminUser.password });
    adminToken = adminLogin.body.accessToken;

    // Crear y login WAITER para prueba de autorización
    const waiterHash = await bcrypt.hash(waiterUser.password, 10);
    await prisma.user.create({
      data: {
        email: waiterUser.email,
        passwordHash: waiterHash,
        name: waiterUser.name,
        role: waiterUser.role,
        isActive: true,
      },
    });
    const waiterLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: waiterUser.email, password: waiterUser.password });
    waiterToken = waiterLogin.body.accessToken;

    // Crear mesa activa con qrToken conocido (vía Prisma, menu/publico sin auth)
    const table = await prisma.table.create({
      data: {
        number: 99,
        restaurantId,
        isActive: true,
        isAvailable: true,
        qrToken,
      },
    });
    tableId = table.id;
  });

  afterAll(async () => {
    if (serviceId) {
      await prisma.service.delete({ where: { id: serviceId } });
    }
    await prisma.table.delete({ where: { id: tableId } });
    await prisma.restaurant.delete({ where: { id: restaurantId } });
    await prisma.user.delete({ where: { email: waiterUser.email } });
    await prisma.user.delete({ where: { email: adminUser.email } });
    await prisma.user.delete({ where: { email: superAdminUser.email } });
    await app.close();
  });

  describe('POST /services/qr', () => {
    it('debe crear servicio desde QR (público, sin JWT)', async () => {
      const res = await request(app.getHttpServer())
        .post('/services/qr')
        .send({ qrToken })
        .expect(201);
      serviceId = res.body.id;
      expect(res.body.status).toBe('ACTIVE');
      expect(res.body.tableId).toBe(tableId);
      expect(res.body.restaurantId).toBe(restaurantId);
    });

    it('debe reutilizar servicio ACTIVE existente para el mismo QR (no duplica)', async () => {
      const res = await request(app.getHttpServer())
        .post('/services/qr')
        .send({ qrToken })
        .expect(201);
      expect(res.body.id).toBe(serviceId);
      expect(res.body.status).toBe('ACTIVE');
    });

    it('debe rechazar QR de mesa inexistente', async () => {
      await request(app.getHttpServer())
        .post('/services/qr')
        .send({ qrToken: 'qr-token-inexistente' })
        .expect(404);
    });
  });

  describe('GET /services/:id', () => {
    it('debe obtener servicio como ADMIN del mismo restaurante', async () => {
      const res = await request(app.getHttpServer())
        .get(`/services/${serviceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.id).toBe(serviceId);
      expect(res.body.status).toBe('ACTIVE');
      expect(res.body.tableId).toBe(tableId);
    });
  });

  describe('POST /services', () => {
    it('debe crear servicio autenticado como ADMIN', async () => {
      const res = await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ tableId })
        .expect(201);
      expect(res.body.id).toBe(serviceId); // reutiliza el existente
      expect(res.body.status).toBe('ACTIVE');
    });

    it('debe rechazar crear servicio como CASHIER (403)', async () => {
      const cashierHash = await bcrypt.hash('TestPassword123', 10);
      await prisma.user.create({
        data: {
          email: 'e2e-cashier-svc@test.com',
          passwordHash: cashierHash,
          name: 'E2E Cashier Service',
          role: UserRole.CASHIER,
          restaurantId,
          isActive: true,
        },
      });
      const cashierLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'e2e-cashier-svc@test.com', password: 'TestPassword123' });
      const cashierToken = cashierLogin.body.accessToken;

      await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({ tableId })
        .expect(403);

      await prisma.user.delete({ where: { email: 'e2e-cashier-svc@test.com' } });
    });
  });
});

describe('Orders (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let superAdminToken: string;
  let adminToken: string;
  let waiterToken: string;
  let orderId: number;
  let serviceId: number;
  let tableId: number;
  let productId: number;
  let restaurantId: number;
  const qrToken = 'e2e-orders-qr-token-001';

  const superAdminUser = {
    email: 'e2e-superadmin-ord@test.com',
    password: 'TestPassword123',
    name: 'E2E SuperAdmin Order',
    role: UserRole.SUPER_ADMIN,
  };

  const adminUser = {
    email: 'e2e-admin-ord@test.com',
    password: 'TestPassword123',
    name: 'E2E Admin Order',
    role: UserRole.ADMIN,
  };

  const waiterUser = {
    email: 'e2e-waiter-ord@test.com',
    password: 'TestPassword123',
    name: 'E2E Waiter Order',
    role: UserRole.WAITER,
  };

  const createRestaurantDto = {
    name: 'E2E Test Restaurant Order',
    address: 'Calle Ord 123',
    phone: '3001234567',
    email: 'e2e-restaurant-ord@test.com',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();

    // Crear SUPER_ADMIN
    const superAdminHash = await bcrypt.hash(superAdminUser.password, 10);
    await prisma.user.create({
      data: {
        email: superAdminUser.email,
        passwordHash: superAdminHash,
        name: superAdminUser.name,
        role: superAdminUser.role,
        isActive: true,
      },
    });

    // Login SUPER_ADMIN
    const superAdminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: superAdminUser.email, password: superAdminUser.password });
    superAdminToken = superAdminLogin.body.accessToken;

    // Crear restaurante como SUPER_ADMIN
    const createRes = await request(app.getHttpServer())
      .post('/restaurants')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send(createRestaurantDto)
      .expect(201);
    restaurantId = createRes.body.id;

    // Crear ADMIN con restaurantId del restaurante creado
    const adminHash = await bcrypt.hash(adminUser.password, 10);
    await prisma.user.create({
      data: {
        email: adminUser.email,
        passwordHash: adminHash,
        name: adminUser.name,
        role: adminUser.role,
        restaurantId,
        isActive: true,
      },
    });

    // Login ADMIN
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: adminUser.email, password: adminUser.password });
    adminToken = adminLogin.body.accessToken;

    // Crear y login WAITER
    const waiterHash = await bcrypt.hash(waiterUser.password, 10);
    await prisma.user.create({
      data: {
        email: waiterUser.email,
        passwordHash: waiterHash,
        name: waiterUser.name,
        role: waiterUser.role,
        isActive: true,
      },
    });
    const waiterLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: waiterUser.email, password: waiterUser.password });
    waiterToken = waiterLogin.body.accessToken;

    // Crear producto en este restaurante (vía Prisma, fixture de prueba)
    const product = await prisma.product.create({
      data: {
        name: 'E2E Test Product Order',
        description: 'Producto prueba E2E ordenes',
        price: 15000,
        restaurantId,
      },
    });
    productId = product.id;

    // Crear mesa activa con qrToken conocido
    const table = await prisma.table.create({
      data: {
        number: 88,
        restaurantId,
        isActive: true,
        isAvailable: true,
        qrToken,
      },
    });
    tableId = table.id;
  });

  afterAll(async () => {
    if (orderId) {
      await prisma.kitchenOrder.delete({ where: { orderId } });
      await prisma.orderItem.deleteMany({ where: { orderId } });
      await prisma.order.delete({ where: { id: orderId } });
    }
    if (serviceId) {
      await prisma.service.delete({ where: { id: serviceId } });
    }
    await prisma.table.delete({ where: { id: tableId } });
    await prisma.product.delete({ where: { id: productId } });
    await prisma.restaurant.delete({ where: { id: restaurantId } });
    await prisma.user.delete({ where: { email: waiterUser.email } });
    await prisma.user.delete({ where: { email: adminUser.email } });
    await prisma.user.delete({ where: { email: superAdminUser.email } });
    await app.close();
  });

  describe('POST /orders/from-qr', () => {
    it('debe crear pedido desde QR con estado PENDING y OrderItems', async () => {
      const res = await request(app.getHttpServer())
        .post('/orders/from-qr')
        .send({
          qrToken,
          items: [{ productId, quantity: 2 }],
        })
        .expect(201);
      orderId = res.body.id;
      serviceId = res.body.serviceId;
      expect(res.body.status).toBe('PENDING');
      expect(res.body.restaurantId).toBe(restaurantId);
      expect(Array.isArray(res.body.orderItems)).toBe(true);
      expect(res.body.orderItems.length).toBe(1);
      expect(res.body.orderItems[0].productId).toBe(productId);
      expect(res.body.orderItems[0].quantity).toBe(2);
      expect(res.body.serviceId).toBeDefined();
    });
  });

  describe('PATCH /orders/:id/authorize', () => {
    it('debe autorizar pedido como ADMIN del mismo restaurante', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/orders/${orderId}/authorize`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.id).toBe(orderId);
      expect(res.body.status).toBe('AUTHORIZED');
      expect(res.body.authorizedAt).toBeDefined();
    });

    it('debe rechazar autorizar como CASHIER (403)', async () => {
      // Crear un segundo pedido PENDING para probar CASHIER
      const res = await request(app.getHttpServer())
        .post('/orders/from-qr')
        .send({
          qrToken,
          items: [{ productId, quantity: 1 }],
        })
        .expect(201);
      const cashierOrderId = res.body.id;

      const cashierHash = await bcrypt.hash('TestPassword123', 10);
      await prisma.user.create({
        data: {
          email: 'e2e-cashier-ord@test.com',
          passwordHash: cashierHash,
          name: 'E2E Cashier Order',
          role: UserRole.CASHIER,
          restaurantId,
          isActive: true,
        },
      });
      const cashierLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'e2e-cashier-ord@test.com', password: 'TestPassword123' });
      const cashierToken = cashierLogin.body.accessToken;

      await request(app.getHttpServer())
        .patch(`/orders/${cashierOrderId}/authorize`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .expect(403);

      // Limpiar segundo pedido y CASHIER
      await prisma.orderItem.deleteMany({ where: { orderId: cashierOrderId } });
      await prisma.order.delete({ where: { id: cashierOrderId } });
      await prisma.user.delete({ where: { email: 'e2e-cashier-ord@test.com' } });
    });

    it('debe rechazar autorizar pedido de otro restaurante (403)', async () => {
      // Crear segundo restaurante y ADMIN de otro restaurante
      const otherRes = await request(app.getHttpServer())
        .post('/restaurants')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'E2E Other Restaurant Order',
          address: 'Otra Calle 123',
          phone: '3009876543',
          email: 'e2e-other-restaurant-ord@test.com',
        })
        .expect(201);
      const otherRestaurantId = otherRes.body.id;

      const otherAdminHash = await bcrypt.hash('TestPassword123', 10);
      await prisma.user.create({
        data: {
          email: 'e2e-other-admin-ord@test.com',
          passwordHash: otherAdminHash,
          name: 'E2E Other Admin Order',
          role: UserRole.ADMIN,
          restaurantId: otherRestaurantId,
          isActive: true,
        },
      });
      const otherAdminLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'e2e-other-admin-ord@test.com', password: 'TestPassword123' });
      const otherAdminToken = otherAdminLogin.body.accessToken;

      // Crear un tercer pedido PENDING para probar aislamiento
      const res = await request(app.getHttpServer())
        .post('/orders/from-qr')
        .send({
          qrToken,
          items: [{ productId, quantity: 1 }],
        })
        .expect(201);
      const isolationOrderId = res.body.id;

      await request(app.getHttpServer())
        .patch(`/orders/${isolationOrderId}/authorize`)
        .set('Authorization', `Bearer ${otherAdminToken}`)
        .expect(403);

      // Limpiar
      await prisma.orderItem.deleteMany({ where: { orderId: isolationOrderId } });
      await prisma.order.delete({ where: { id: isolationOrderId } });
      await prisma.user.delete({ where: { email: 'e2e-other-admin-ord@test.com' } });
      await prisma.restaurant.delete({ where: { id: otherRestaurantId } });
    });
  });

  describe('GET /orders/pending', () => {
    it('debe listar pedidos pendientes como ADMIN con aislamiento por restaurante', async () => {
      const res = await request(app.getHttpServer())
        .get('/orders/pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      res.body.forEach((o: any) => {
        expect(o.restaurantId).toBe(restaurantId);
        expect(o.status).toBe('PENDING');
  });
});
});

describe('Kitchen (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let superAdminToken: string;
  let adminToken: string;
  let kitchenToken: string;
  let waiterToken: string;
  let cashierToken: string;
  let orderId: number;
  let kitchenOrderId: number;
  let restaurantId: number;
  let otherRestaurantId: number;
  let tableId: number;
  let productId: number;
  let serviceId: number;
  const qrToken = 'e2e-kitchen-qr-token-001';

  const superAdminUser = {
    email: 'e2e-superadmin-kitchen@test.com',
    password: 'TestPassword123',
    name: 'E2E SuperAdmin Kitchen',
    role: UserRole.SUPER_ADMIN,
  };

  const adminUser = {
    email: 'e2e-admin-kitchen@test.com',
    password: 'TestPassword123',
    name: 'E2E Admin Kitchen',
    role: UserRole.ADMIN,
  };

  const kitchenUser = {
    email: 'e2e-kitchen-kitchen@test.com',
    password: 'TestPassword123',
    name: 'E2E Kitchen User',
    role: UserRole.KITCHEN,
  };

  const waiterUser = {
    email: 'e2e-waiter-kitchen@test.com',
    password: 'TestPassword123',
    name: 'E2E Waiter Kitchen',
    role: UserRole.WAITER,
  };

  const createRestaurantDto = {
    name: 'E2E Test Restaurant Kitchen',
    address: 'Calle Kitchen 123',
    phone: '3001234567',
    email: 'e2e-restaurant-kitchen@test.com',
  };

  const createTableDto = {
    number: 77,
  };

  const createProductDto = {
    name: 'E2E Product Kitchen',
    description: 'Producto prueba E2E cocina',
    price: 10000,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();

    // Crear SUPER_ADMIN
    const superAdminHash = await bcrypt.hash(superAdminUser.password, 10);
    await prisma.user.create({
      data: {
        email: superAdminUser.email,
        passwordHash: superAdminHash,
        name: superAdminUser.name,
        role: superAdminUser.role,
        isActive: true,
      },
    });

    // Login SUPER_ADMIN
    const superAdminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: superAdminUser.email, password: superAdminUser.password });
    superAdminToken = superAdminLogin.body.accessToken;

    // Crear restaurante como SUPER_ADMIN
    const createRes = await request(app.getHttpServer())
      .post('/restaurants')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send(createRestaurantDto)
      .expect(201);
    restaurantId = createRes.body.id;

    // Crear ADMIN con restaurantId del restaurante creado
    const adminHash = await bcrypt.hash(adminUser.password, 10);
    await prisma.user.create({
      data: {
        email: adminUser.email,
        passwordHash: adminHash,
        name: adminUser.name,
        role: adminUser.role,
        restaurantId,
        isActive: true,
      },
    });

    // Login ADMIN
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: adminUser.email, password: adminUser.password });
    adminToken = adminLogin.body.accessToken;

    // Crear KITCHEN con restaurantId del restaurante creado
    const kitchenHash = await bcrypt.hash(kitchenUser.password, 10);
    await prisma.user.create({
      data: {
        email: kitchenUser.email,
        passwordHash: kitchenHash,
        name: kitchenUser.name,
        role: kitchenUser.role,
        restaurantId,
        isActive: true,
      },
    });

    // Login KITCHEN
    const kitchenLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: kitchenUser.email, password: kitchenUser.password });
    kitchenToken = kitchenLogin.body.accessToken;

    // Crear WAITER con restaurantId del restaurante creado
    const waiterHash = await bcrypt.hash(waiterUser.password, 10);
    await prisma.user.create({
      data: {
        email: waiterUser.email,
        passwordHash: waiterHash,
        name: waiterUser.name,
        role: waiterUser.role,
        restaurantId,
        isActive: true,
      },
    });

    // Login WAITER
    const waiterLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: waiterUser.email, password: waiterUser.password });
    waiterToken = waiterLogin.body.accessToken;

    // Crear producto en este restaurante (vía Prisma, fixture de prueba)
    const product = await prisma.product.create({
      data: {
        name: createProductDto.name,
        description: createProductDto.description,
        price: createProductDto.price,
        restaurantId,
      },
    });

    productId = product.id;

    // Crear mesa activa con qrToken conocido
    const table = await prisma.table.create({
      data: {
        ...createTableDto,
        restaurantId,
        isActive: true,
        isAvailable: true,
        qrToken,
      },
    });
    tableId = table.id;
  });

  afterAll(async () => {
    // Limpiar todas las órdenes del restaurante (incluyendo huérfanas de pruebas fallidas)
    const restaurantOrders = await prisma.order.findMany({
      where: { restaurantId },
      select: { id: true },
    });
    for (const o of restaurantOrders) {
      await prisma.kitchenOrder.delete({ where: { orderId: o.id } }).catch(() => {});
      await prisma.orderItem.deleteMany({ where: { orderId: o.id } });
      await prisma.order.delete({ where: { id: o.id } }).catch(() => {});
    }
    await prisma.service.deleteMany({ where: { tableId } });
    await prisma.table.delete({ where: { id: tableId } });
    await prisma.product.delete({ where: { id: productId } });
    await prisma.restaurant.delete({ where: { id: restaurantId } });
    await prisma.user.delete({ where: { email: waiterUser.email } });
    await prisma.user.delete({ where: { email: kitchenUser.email } });
    await prisma.user.delete({ where: { email: adminUser.email } });
    await prisma.user.delete({ where: { email: superAdminUser.email } });
    await app.close();
  });

  describe('POST /orders/from-qr + autorización', () => {
    it('debe crear pedido desde QR y autorizarlo, generando KitchenOrder RECEIVED', async () => {
      const res = await request(app.getHttpServer())
        .post('/orders/from-qr')
        .send({
          qrToken,
          items: [{ productId, quantity: 2 }],
        })
        .expect(201);
      orderId = res.body.id;
      serviceId = res.body.serviceId;
      expect(res.body.status).toBe('PENDING');

      const authRes = await request(app.getHttpServer())
        .patch(`/orders/${orderId}/authorize`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(authRes.body.status).toBe('AUTHORIZED');

      const kitchenRes = await request(app.getHttpServer())
        .get(`/kitchen/orders/${orderId}`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .expect(200);
      kitchenOrderId = kitchenRes.body.id;
      expect(kitchenRes.body.status).toBe('RECEIVED');
      expect(kitchenRes.body.orderId).toBe(orderId);
    });
  });

  describe('PATCH /kitchen/orders/:id/status', () => {
    it('KITCHEN puede cambiar de RECEIVED a PREPARING', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/kitchen/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .send({ status: 'PREPARING' })
        .expect(200);
      expect(res.body.status).toBe('PREPARING');
    });

    it('KITCHEN puede cambiar de PREPARING a READY', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/kitchen/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .send({ status: 'READY' })
        .expect(200);
      expect(res.body.status).toBe('READY');
    });

    it('KITCHEN no puede cambiar de RECEIVED a READY (transición inválida)', async () => {
      // Crear un nuevo pedido para probar transición inválida
      const res = await request(app.getHttpServer())
        .post('/orders/from-qr')
        .send({
          qrToken,
          items: [{ productId, quantity: 1 }],
        })
        .expect(201);
      const testOrderId = res.body.id;

      await request(app.getHttpServer())
        .patch(`/orders/${testOrderId}/authorize`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const kitchenRes = await request(app.getHttpServer())
        .get(`/kitchen/orders/${testOrderId}`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .expect(200);
      const testKitchenOrderId = kitchenRes.body.id;

      await request(app.getHttpServer())
        .patch(`/kitchen/orders/${testOrderId}/status`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .send({ status: 'READY' })
        .expect(403);

      // Limpiar
      await prisma.kitchenOrder.delete({ where: { id: testKitchenOrderId } });
      await prisma.orderItem.deleteMany({ where: { orderId: testOrderId } });
      await prisma.order.delete({ where: { id: testOrderId } });
    });

    it('SUPER_ADMIN no puede cambiar estado de cocina (403)', async () => {
      // Crear un nuevo pedido para probar SUPER_ADMIN sin permiso de escritura
      const res = await request(app.getHttpServer())
        .post('/orders/from-qr')
        .send({
          qrToken,
          items: [{ productId, quantity: 1 }],
        })
        .expect(201);
      const testOrderId = res.body.id;

      await request(app.getHttpServer())
        .patch(`/orders/${testOrderId}/authorize`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const kitchenRes = await request(app.getHttpServer())
        .get(`/kitchen/orders/${testOrderId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);
      const testKitchenOrderId = kitchenRes.body.id;

      await request(app.getHttpServer())
        .patch(`/kitchen/orders/${testKitchenOrderId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ status: 'PREPARING' })
        .expect(403);

      // Limpiar
      await prisma.kitchenOrder.delete({ where: { id: testKitchenOrderId } });
      await prisma.orderItem.deleteMany({ where: { orderId: testOrderId } });
      await prisma.order.delete({ where: { id: testOrderId } });
    });

    it('WAITER no puede modificar estado de cocina (403)', async () => {
      await request(app.getHttpServer())
        .patch(`/kitchen/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({ status: 'PREPARING' })
        .expect(403);
    });
  });

  describe('GET /kitchen/orders', () => {
    it('KITCHEN puede obtener órdenes de su restaurante', async () => {
      const res = await request(app.getHttpServer())
        .get('/kitchen/orders')
        .set('Authorization', `Bearer ${kitchenToken}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('SUPER_ADMIN puede obtener órdenes de cocina globalmente', async () => {
      const res = await request(app.getHttpServer())
        .get('/kitchen/orders')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('CASHIER no puede consultar órdenes de cocina (403)', async () => {
      const cashierHash = await bcrypt.hash('TestPassword123', 10);
      await prisma.user.create({
        data: {
          email: 'e2e-cashier-kitchen@test.com',
          passwordHash: cashierHash,
          name: 'E2E Cashier Kitchen',
          role: UserRole.CASHIER,
          restaurantId,
          isActive: true,
        },
      });
      const cashierLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'e2e-cashier-kitchen@test.com', password: 'TestPassword123' });
      const cashierLoginToken = cashierLogin.body.accessToken;

      await request(app.getHttpServer())
        .get('/kitchen/orders')
        .set('Authorization', `Bearer ${cashierLoginToken}`)
        .expect(403);

      await prisma.user.delete({ where: { email: 'e2e-cashier-kitchen@test.com' } });
    });
  });

  describe('Aislamiento por restaurante', () => {
    let otherRestaurantId: number;
    let otherRestaurantTableId: number;
    let otherRestaurantOrderId: number;
    let otherRestaurantServiceId: number;
    let otherProductId: number;

    beforeAll(async () => {
      // Crear segundo restaurante
      const otherRes = await request(app.getHttpServer())
        .post('/restaurants')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'E2E Other Restaurant Kitchen',
          address: 'Otra Calle 123',
          phone: '3009876543',
          email: 'e2e-other-restaurant-kitchen@test.com',
        })
        .expect(201);
      otherRestaurantId = otherRes.body.id;

      // Crear mesa en otro restaurante
      const otherTable = await prisma.table.create({
        data: {
          number: 78,
          restaurantId: otherRestaurantId,
          isActive: true,
          isAvailable: true,
          qrToken: 'e2e-other-kitchen-qr-token-001',
        },
      });
      otherRestaurantTableId = otherTable.id;

      // Crear producto en el otro restaurante
      const otherProduct = await prisma.product.create({
        data: {
          name: 'E2E Other Product Kitchen',
          description: 'Producto prueba otro restaurante',
          price: 20000,
          restaurantId: otherRestaurantId,
        },
      });
      otherProductId = otherProduct.id;

      // Crear pedido en otro restaurante
      const otherRes2 = await request(app.getHttpServer())
        .post('/orders/from-qr')
        .send({
          qrToken: 'e2e-other-kitchen-qr-token-001',
          items: [{ productId: otherProduct.id, quantity: 1 }],
        })
        .expect(201);
      otherRestaurantOrderId = otherRes2.body.id;
      otherRestaurantServiceId = otherRes2.body.serviceId;

      await request(app.getHttpServer())
        .patch(`/orders/${otherRestaurantOrderId}/authorize`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);
    });

    afterAll(async () => {
      if (otherRestaurantOrderId) {
        await prisma.kitchenOrder.delete({ where: { orderId: otherRestaurantOrderId } });
        await prisma.orderItem.deleteMany({ where: { orderId: otherRestaurantOrderId } });
        await prisma.order.delete({ where: { id: otherRestaurantOrderId } });
      }
      if (otherProductId) {
        await prisma.product.delete({ where: { id: otherProductId } });
      }
      if (otherRestaurantServiceId) {
        await prisma.service.delete({ where: { id: otherRestaurantServiceId } });
      }
      if (otherRestaurantTableId) {
        await prisma.table.delete({ where: { id: otherRestaurantTableId } });
      }
      if (otherRestaurantId) {
        await prisma.restaurant.delete({ where: { id: otherRestaurantId } });
      }
    });

    it('KITCHEN no puede consultar orden de cocina de otro restaurante (404)', async () => {
      await request(app.getHttpServer())
        .get(`/kitchen/orders/${otherRestaurantOrderId}`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .expect(404);
  });
});
});
});
