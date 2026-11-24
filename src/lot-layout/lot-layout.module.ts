import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LotLayoutController } from './lot-layout.controller';
import { LotLayoutRepository } from './lot-layout.repository';
import { LotLayoutService } from './lot-layout.service';
import { LotLayoutBusiness } from './businessLogic/lot-layout.business';

@Module({
  imports: [PrismaModule],
  controllers: [LotLayoutController],
  providers: [LotLayoutService, LotLayoutRepository, LotLayoutBusiness],
  exports: [LotLayoutRepository, LotLayoutBusiness],
})
export class LotLayoutModule {}
