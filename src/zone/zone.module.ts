import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ZoneController } from './zone.controller';
import { ZoneRepository } from './zone.repository';
import { ZoneService } from './zone.service';

@Module({
  imports: [PrismaModule],
  controllers: [ZoneController],
  providers: [ZoneService, ZoneRepository],
  exports: [ZoneService],
})
export class ZoneModule {}
