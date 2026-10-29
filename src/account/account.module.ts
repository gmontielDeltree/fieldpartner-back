import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CognitoModule } from '../cognito/cognito.module';
import { AccountController } from './account.controller';
import { AccountRepository } from './account.repository';
import { AccountService } from './account.service';
import { AccountBusiness } from './businessLogic/account.business';

@Module({
  imports: [PrismaModule, CognitoModule],
  controllers: [AccountController],
  providers: [AccountService, AccountRepository, AccountBusiness],
  exports: [AccountService],
})
export class AccountModule {}
