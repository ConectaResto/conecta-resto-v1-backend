import {
    Controller,
    Get,
    Param,
    ParseIntPipe,
} from '@nestjs/common';
import { MenuService } from './menu.service.js';

@Controller('menu')
export class MenuController {
    constructor(private readonly menuService: MenuService) { }

    @Get('restaurant/:restaurantId/table/:tableId')
    getMenu(
        @Param('restaurantId', ParseIntPipe) restaurantId: number,
        @Param('tableId', ParseIntPipe) tableId: number,
    ) {
        return this.menuService.getMenu(restaurantId, tableId);
    }
}
