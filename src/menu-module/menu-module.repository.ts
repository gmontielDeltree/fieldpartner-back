import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  MENU_MODULE_LINK_SELECT,
  MENU_MODULE_SELECT,
  MenuModuleDto,
  MenuModuleLink,
} from './dto/menu-module.dto';
import { CreateMenuModuleDto } from './dto/create-menu-module.dto';
import { UpdateMenuModuleDto } from './dto/update-menu-module.dto';

@Injectable()
export class MenuModuleRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateMenuModuleDto): Promise<MenuModuleDto> {
    return this.prisma.menuModule.create({ select: MENU_MODULE_SELECT, data: dto });
  }

  findAll(): Promise<MenuModuleDto[]> {
    return this.prisma.menuModule.findMany({
      select: MENU_MODULE_SELECT,
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
    });
  }

  findOne(id: number): Promise<MenuModuleDto | null> {
    return this.prisma.menuModule.findUnique({ select: MENU_MODULE_SELECT, where: { id } });
  }

  findLink(id: number): Promise<MenuModuleLink | null> {
    return this.prisma.menuModule.findUnique({ select: MENU_MODULE_LINK_SELECT, where: { id } });
  }

  findChildren(parentId: number): Promise<MenuModuleLink[]> {
    return this.prisma.menuModule.findMany({ select: MENU_MODULE_LINK_SELECT, where: { parentId } });
  }

  update(id: number, dto: UpdateMenuModuleDto): Promise<MenuModuleDto> {
    return this.prisma.menuModule.update({ select: MENU_MODULE_SELECT, where: { id }, data: dto });
  }

  remove(id: number): Promise<MenuModuleDto> {
    return this.prisma.menuModule.delete({ select: MENU_MODULE_SELECT, where: { id } });
  }
}
