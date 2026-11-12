import {
  Body,
  Controller,
  Headers,
  Post,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { LoginRequestDto } from './dto/login.request.dto';
import { NewPasswordRequestDto } from './dto/new-password.request.dto';
import { RefreshTokenRequestDto } from './dto/refresh-token.request.dto';
import { ChangePasswordRequestDto } from './dto/change-password.request.dto';
import { ForgotPasswordRequestDto } from './dto/forgot-password.request.dto';
import { ConfirmForgotPasswordRequestDto } from './dto/confirm-forgot-password.request.dto';
import { CheckEmailDto } from './dto/check-email.dto';

// Tighter rate limit on auth: 10 requests / 60s per IP — curbs credential
// stuffing / brute-force on login, forgot-password, etc.
@Throttle({ default: { limit: 10, ttl: 60_000 } })
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  async login(@Headers('channel') channel: string, @Body() dto: LoginRequestDto) {
    return this.authService.login(dto, channel);
  }

  /** Step 2 of first login: set permanent password after FORCE_CHANGE_PASSWORD challenge. */
  @Public()
  @Post('complete-new-password')
  async completeNewPassword(@Headers('channel') channel: string, @Body() dto: NewPasswordRequestDto) {
    return this.authService.completeNewPassword(dto, channel);
  }

  @Public()
  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenRequestDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  // Protected by the global JwtAuthGuard (no @Public()).
  @Post('logout')
  async logout(@Request() req) {
    await this.authService.logout(req.user.email);
    return { message: 'Logout exitoso' };
  }

  // Protected by the global JwtAuthGuard (no @Public()).
  @Post('change-password')
  async changePassword(@Request() req, @Body() dto: ChangePasswordRequestDto) {
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    if (!accessToken) throw new UnauthorizedException();
    await this.authService.changePassword(accessToken, dto);
    return { message: 'Contraseña actualizada exitosamente' };
  }

  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordRequestDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post('confirm-forgot-password')
  async confirmForgotPassword(@Body() dto: ConfirmForgotPasswordRequestDto) {
    await this.authService.confirmForgotPassword(dto);
    return { message: 'Contraseña actualizada exitosamente' };
  }

  // Protected by the global JwtAuthGuard (no @Public()).
  @Post('check-email')
  async checkEmail(@Body() dto: CheckEmailDto) {
    const exists = await this.authService.checkEmailExists(dto.email);
    return { exists };
  }
}
