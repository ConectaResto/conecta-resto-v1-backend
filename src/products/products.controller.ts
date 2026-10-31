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
  Req,
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
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface.js';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
  ) { }

  // Create product
  @Post()
  create(
    @Body() createProductDto: CreateProductDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.productsService.create(
      createProductDto,
      request.user,
    );
  }

  // Get all products
  @Get()
  findAll(@Req() request: AuthenticatedRequest) {
    return this.productsService.findAll(request.user);
  }

  // Get product by ID
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.productsService.findOne(id, request.user);
  }

  // Update product
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductDto: UpdateProductDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.productsService.update(
      id,
      updateProductDto,
      request.user,
    );
  }

  // Delete product
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.productsService.remove(id, request.user);
  }

  // Assign categories to a product
  @Post(':id/categories')
  assignCategories(
    @Param('id', ParseIntPipe) id: number,
    @Body() assignCategoriesDto: AssignCategoriesDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.productsService.assignCategories(
      id,
      assignCategoriesDto,
      request.user,
    );
  }

  // Remove a category from a product
  @Delete(':id/categories/:categoryId')
  removeCategory(
    @Param('id', ParseIntPipe) id: number,
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.productsService.removeCategory(
      id,
      categoryId,
      request.user,
    );
  }
}