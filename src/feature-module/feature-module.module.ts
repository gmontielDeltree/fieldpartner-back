import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FeatureModuleController } from './feature-module.controller';
import { FeatureModuleRepository } from './feature-module.repository';
import { FeatureModuleService } from './feature-module.service';

@Module({
  imports: [PrismaModule],
  controllers: [FeatureModuleController],
  providers: [FeatureModuleService, FeatureModuleRepository],
  exports: [FeatureModuleService],
})
export class FeatureModuleModule {}
