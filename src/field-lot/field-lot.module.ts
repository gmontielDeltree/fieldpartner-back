import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FieldLotController } from './field-lot.controller';
import { FieldLotRepository } from './field-lot.repository';
import { FieldLotService } from './field-lot.service';

@Module({
  imports: [PrismaModule],
  controllers: [FieldLotController],
  providers: [FieldLotService, FieldLotRepository],
  exports: [FieldLotService],
})
export class FieldLotModule {}
