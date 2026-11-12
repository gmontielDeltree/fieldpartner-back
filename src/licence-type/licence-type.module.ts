import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LicenceTypeController } from './licence-type.controller';
import { LicenceTypeRepository } from './licence-type.repository';
import { LicenceTypeService } from './licence-type.service';

@Module({
  imports: [PrismaModule],
  controllers: [LicenceTypeController],
  providers: [LicenceTypeService, LicenceTypeRepository],
  exports: [LicenceTypeService],
})
export class LicenceTypeModule {}
