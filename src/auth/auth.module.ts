import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { CognitoModule } from '../cognito/cognito.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { AuthBusiness } from './businessLogic/auth.business';
import { JwtStrategy } from './jwt.strategy';
import { RolesGuard } from './roles.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    CognitoModule,
    PrismaModule,
  ],
  controllers: [AuthController],
  providers:   [AuthService, AuthBusiness, AuthRepository, JwtStrategy, RolesGuard],
  exports:     [JwtStrategy, PassportModule, RolesGuard],
})
export class AuthModule {}
