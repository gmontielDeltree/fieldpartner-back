import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GeoModule } from '../common/geo/geo.module';
import { FieldController } from './field.controller';
import { FieldRepository } from './field.repository';
import { FieldService } from './field.service';
import { FieldBusiness } from './businessLogic/field.business';

@Module({
  imports: [PrismaModule, GeoModule],
  controllers: [FieldController],
  providers: [FieldService, FieldRepository, FieldBusiness],
  exports: [FieldRepository],
})
export class FieldModule {}
