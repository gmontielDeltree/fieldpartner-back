import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CATEGORY_SELECT } from './dto/category.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateCategoryDto) {
    return this.prisma.category.create({ select: CATEGORY_SELECT, data: dto });
  }

  findAll() {
    return this.prisma.category.findMany({ select: CATEGORY_SELECT, orderBy: { descriptionES: 'asc' } });
  }

  findOne(id: string) {
    return this.prisma.category.findUnique({ select: CATEGORY_SELECT, where: { id } });
  }

  update(id: string, dto: UpdateCategoryDto) {
    return this.prisma.category.update({ select: CATEGORY_SELECT, where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.category.delete({ select: CATEGORY_SELECT, where: { id } });
  }
}
