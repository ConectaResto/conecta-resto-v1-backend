import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { createObserveModule } from '@nestjs/observe';
import { PrismaModule } from './prisma/prisma.module.js';
import { RestaurantsModule } from './restaurants/restaurants.module.js';
import { ProductsModule } from './products/products.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { UsersModule } from './users/users.module.js';
import { TablesModule } from './tables/tables.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ServiceRequestModule } from './service-requests/service-request.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { ServiceModule } from './service/service.module.js';
import { MenuModule } from './menu/menu.module.js';
import { KitchenModule } from './kitchen/kitchen.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    PrismaModule,
    RestaurantsModule,
    ProductsModule,
    CategoriesModule,
    UsersModule,
    TablesModule,
    AuthModule,
    ServiceRequestModule,
    OrdersModule,
    ServiceModule,
    MenuModule,
    KitchenModule,
  ],
})
export class AppModule { }
