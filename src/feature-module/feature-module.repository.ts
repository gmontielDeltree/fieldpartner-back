import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FEATURE_MODULE_SELECT, FeatureModuleDto } from './dto/feature-module.dto';
import { CreateFeatureModuleDto } from './dto/create-feature-module.dto';
import { UpdateFeatureModuleDto } from './dto/update-feature-module.dto';

@Injectable()
export class FeatureModuleRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateFeatureModuleDto): Promise<FeatureModuleDto> {
    return this.prisma.featureModule.create({ select: FEATURE_MODULE_SELECT, data: dto });
  }

  findAll(): Promise<FeatureModuleDto[]> {
    return this.prisma.featureModule.findMany({
      select: FEATURE_MODULE_SELECT,
      orderBy: [{ order: 'asc' }, { nameEs: 'asc' }],
    });
  }

  findOne(id: string): Promise<FeatureModuleDto | null> {
    return this.prisma.featureModule.findUnique({ select: FEATURE_MODULE_SELECT, where: { id } });
  }

  update(id: string, dto: UpdateFeatureModuleDto): Promise<FeatureModuleDto> {
    return this.prisma.featureModule.update({ select: FEATURE_MODULE_SELECT, where: { id }, data: dto });
  }

  remove(id: string): Promise<FeatureModuleDto> {
    return this.prisma.featureModule.delete({ select: FEATURE_MODULE_SELECT, where: { id } });
  }
}
