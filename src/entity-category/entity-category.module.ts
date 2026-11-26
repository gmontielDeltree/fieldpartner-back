import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EntityCategoryController } from './entity-category.controller';
import { EntityCategoryRepository } from './entity-category.repository';
import { EntityCategoryService } from './entity-category.service';

@Module({
  imports: [PrismaModule],
  controllers: [EntityCategoryController],
  providers: [EntityCategoryService, EntityCategoryRepository],
  exports: [EntityCategoryService],
})
export class EntityCategoryModule {}
