import {
  Body,
  Controller,
  Post,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt.guard';
import { LoginRequestDto } from './dto/login.request.dto';
import { NewPasswordRequestDto } from './dto/new-password.request.dto';
import { RefreshTokenRequestDto } from './dto/refresh-token.request.dto';
import { ChangePasswordRequestDto } from './dto/change-password.request.dto';
import { ForgotPasswordRequestDto } from './dto/forgot-password.request.dto';
import { ConfirmForgotPasswordRequestDto } from './dto/confirm-forgot-password.request.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginRequestDto) {
    return this.authService.login(dto);
  }

  /** Step 2 of first login: set permanent password after FORCE_CHANGE_PASSWORD challenge. */
  @Post('complete-new-password')
  async completeNewPassword(@Body() dto: NewPasswordRequestDto) {
    return this.authService.completeNewPassword(dto);
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenRequestDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Request() req) {
    await this.authService.logout(req.user.email);
    return { message: 'Logout exitoso' };
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(@Request() req, @Body() dto: ChangePasswordRequestDto) {
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    if (!accessToken) throw new UnauthorizedException();
    await this.authService.changePassword(accessToken, dto);
    return { message: 'Contraseña actualizada exitosamente' };
  }

  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordRequestDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('confirm-forgot-password')
  async confirmForgotPassword(@Body() dto: ConfirmForgotPasswordRequestDto) {
    await this.authService.confirmForgotPassword(dto);
    return { message: 'Contraseña actualizada exitosamente' };
  }
}
