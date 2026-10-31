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

import { TablesService } from './tables.service.js';
import { CreateTableDto } from './dto/create-table.dto.js';
import { UpdateTableDto } from './dto/update-table.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { UserRole } from '../../generated/prisma/enums.js';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface.js';


@Controller('tables')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class TablesController {
  constructor(private readonly tablesService: TablesService) { }

  // Create a table
  @Post()
  create(
    @Body() createTableDto: CreateTableDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.tablesService.create(
      createTableDto,
      request.user,
    );
  }

  // Get all tables
  @Get()
  findAll(@Req() request: AuthenticatedRequest) {
    return this.tablesService.findAll(request.user);
  }

  // Get a table by ID
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.tablesService.findOne(id, request.user);
  }

  // Update a table
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTableDto: UpdateTableDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.tablesService.update(
      id,
      updateTableDto,
      request.user,
    );
  }

  // Delete a table
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.tablesService.remove(id, request.user);
  }
}