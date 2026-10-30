import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service.js';
import { CreateProductDto } from './dto/requests/create-product.dto.js';
import { AssignCategoriesDto } from './dto/requests/assign-categories.dto.js';
import { UpdateProductDto } from './dto/requests/update-product.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../../generated/prisma/enums.js';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
  ) { }

  // Create product
  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  // Get all products
  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  // Get product by ID
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }

  // Update product
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(id, updateProductDto);
  }

  // Delete product
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.remove(id);
  }

  // Assign categories to a product
  @Post(':id/categories')
  assignCategories(
    @Param('id', ParseIntPipe) id: number,
    @Body() assignCategoriesDto: AssignCategoriesDto,
  ) {
    return this.productsService.assignCategories(
      id,
      assignCategoriesDto,
    );
  }

  // Remove a category from a product
  @Delete(':id/categories/:categoryId')
  removeCategory(
    @Param('id', ParseIntPipe) id: number,
    @Param('categoryId', ParseIntPipe) categoryId: number,
  ) {
    return this.productsService.removeCategory(id, categoryId);
  }
}