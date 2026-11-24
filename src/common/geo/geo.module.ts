import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { GeometryRepository } from './geometry.repository';

/** Spatial SQL (PostGIS) shared by the fields and lots modules. */
@Module({
  imports: [PrismaModule],
  providers: [GeometryRepository],
  exports: [GeometryRepository],
})
export class GeoModule {}
