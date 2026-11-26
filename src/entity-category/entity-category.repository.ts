import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ENTITY_CATEGORY_SELECT } from './dto/entity-category.dto';
import { CreateEntityCategoryDto } from './dto/create-entity-category.dto';
import { UpdateEntityCategoryDto } from './dto/update-entity-category.dto';

@Injectable()
export class EntityCategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateEntityCategoryDto) {
    return this.prisma.entityCategory.create({ select: ENTITY_CATEGORY_SELECT, data: dto });
  }

  findAll() {
    return this.prisma.entityCategory.findMany({ select: ENTITY_CATEGORY_SELECT, orderBy: { descriptionES: 'asc' } });
  }

  findOne(id: string) {
    return this.prisma.entityCategory.findUnique({ select: ENTITY_CATEGORY_SELECT, where: { id } });
  }

  update(id: string, dto: UpdateEntityCategoryDto) {
    return this.prisma.entityCategory.update({ select: ENTITY_CATEGORY_SELECT, where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.entityCategory.delete({ select: ENTITY_CATEGORY_SELECT, where: { id } });
  }
}
