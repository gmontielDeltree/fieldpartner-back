import { Injectable, NotFoundException } from '@nestjs/common';
import { MenuModuleRepository } from './menu-module.repository';
import { MenuModuleBusiness } from './businessLogic/menu-module.business';
import { CreateMenuModuleDto } from './dto/create-menu-module.dto';
import { UpdateMenuModuleDto } from './dto/update-menu-module.dto';

@Injectable()
export class MenuModuleService {
  constructor(
    private readonly menuModuleRepository: MenuModuleRepository,
    private readonly menuModuleBusiness: MenuModuleBusiness,
  ) {}

  /** Duplicate id → P2002 → 409; unknown module/system → P2003 (GlobalExceptionFilter). */
  create(dto: CreateMenuModuleDto) {
    return this.menuModuleBusiness.executeCreate(dto);
  }

  findAll() {
    return this.menuModuleRepository.findAll();
  }

  async findOne(id: number) {
    const menuModule = await this.menuModuleRepository.findOne(id);
    if (!menuModule) throw new NotFoundException(`MenuModule ${id} not found`);
    return menuModule;
  }

  update(id: number, dto: UpdateMenuModuleDto) {
    return this.menuModuleBusiness.executeUpdate(id, dto);
  }

  remove(id: number) {
    return this.menuModuleBusiness.executeRemove(id);
  }
}
