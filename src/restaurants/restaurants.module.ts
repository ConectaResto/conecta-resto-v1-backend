import { Module } from '@nestjs/common';
import { RestaurantsService } from './restaurants.service.js';
import { RestaurantsController } from './restaurants.controller.js';

@Module({
  controllers: [RestaurantsController],
  providers: [RestaurantsService],
})
export class RestaurantsModule {}
