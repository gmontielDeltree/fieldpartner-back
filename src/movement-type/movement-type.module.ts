import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MovementTypeController } from './movement-type.controller';
import { MovementTypeRepository } from './movement-type.repository';
import { MovementTypeService } from './movement-type.service';

@Module({
  imports: [PrismaModule],
  controllers: [MovementTypeController],
  providers: [MovementTypeService, MovementTypeRepository],
  exports: [MovementTypeService],
})
export class MovementTypeModule {}
