import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/requests/login.dto.js';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Req() request: AuthenticatedRequest) {
    return this.authService.getMe(request.user.sub);
  }

}
