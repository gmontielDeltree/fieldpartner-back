import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CropController } from './crop.controller';
import { CropRepository } from './crop.repository';
import { CropService } from './crop.service';

@Module({
  imports: [PrismaModule],
  controllers: [CropController],
  providers: [CropService, CropRepository],
  exports: [CropService],
})
export class CropModule {}
