import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CognitoModule } from '../cognito/cognito.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [PrismaModule, AuthModule, CognitoModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
