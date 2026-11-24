import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GeoModule } from '../common/geo/geo.module';
import { FieldModule } from '../field/field.module';
import { LotLayoutModule } from '../lot-layout/lot-layout.module';
import { LotController } from './lot.controller';
import { LotRepository } from './lot.repository';
import { LotService } from './lot.service';
import { LotBusiness } from './businessLogic/lot.business';

@Module({
  imports: [PrismaModule, GeoModule, FieldModule, LotLayoutModule],
  controllers: [LotController],
  providers: [LotService, LotRepository, LotBusiness],
})
export class LotModule {}
