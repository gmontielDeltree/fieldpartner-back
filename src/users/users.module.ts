import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CognitoModule } from '../cognito/cognito.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { UsersBusiness } from './businessLogic/users.business';

@Module({
  imports: [PrismaModule, AuthModule, CognitoModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository, UsersBusiness],
})
export class UsersModule {}
