import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { MenuType } from '@prisma/client';
import { BusinessErrorCode, BusinessException } from '../../common/exceptions/business.exception';
import { MenuModuleRepository } from '../menu-module.repository';
import { CreateMenuModuleDto } from '../dto/create-menu-module.dto';
import { UpdateMenuModuleDto } from '../dto/update-menu-module.dto';
import { MenuModuleDto } from '../dto/menu-module.dto';

/** Upper bound when walking ancestors, so corrupt data can never loop forever. */
const MAX_DEPTH = 20;

/**
 * Menu hierarchy rules (submenus):
 * - a parent must exist, be a SIDEBAR menu and belong to the same module;
 * - a menu cannot be its own ancestor (no cycles);
 * - a menu with children must stay SIDEBAR and cannot move to another module;
 * - a menu with children cannot be deleted (move or delete the children first).
 */
@Injectable()
export class MenuModuleBusiness {
  constructor(private readonly menuModuleRepository: MenuModuleRepository) {}

  async executeCreate(dto: CreateMenuModuleDto): Promise<MenuModuleDto> {
    await this.assertValidParent(dto.id, dto.parentId ?? null, dto.moduleId);
    return this.menuModuleRepository.create(dto);
  }

  async executeUpdate(id: number, dto: UpdateMenuModuleDto): Promise<MenuModuleDto> {
    const current = await this.menuModuleRepository.findLink(id);
    if (!current) throw new NotFoundException(`MenuModule ${id} not found`);

    const moduleId = dto.moduleId ?? current.moduleId;
    const menuType = dto.menuType ?? current.menuType;
    const parentId = dto.parentId !== undefined ? dto.parentId : current.parentId;

    if (dto.parentId !== undefined || moduleId !== current.moduleId) {
      await this.assertValidParent(id, parentId, moduleId);
    }

    const children = await this.menuModuleRepository.findChildren(id);
    if (children.length > 0) {
      if (menuType !== MenuType.SIDEBAR) {
        throw this.invalid('Un menú con submenús tiene que ser de tipo SIDEBAR');
      }
      if (moduleId !== current.moduleId) {
        throw this.invalid('Un menú con submenús no puede cambiar de módulo');
      }
    }

    return this.menuModuleRepository.update(id, dto);
  }

  async executeRemove(id: number): Promise<MenuModuleDto> {
    const current = await this.menuModuleRepository.findLink(id);
    if (!current) throw new NotFoundException(`MenuModule ${id} not found`);

    const children = await this.menuModuleRepository.findChildren(id);
    if (children.length > 0) {
      throw new BusinessException(
        BusinessErrorCode.INVALID_REFERENCE,
        `El menú tiene submenús (${children.map((c) => c.id).join(', ')}); movelos o eliminalos primero`,
        HttpStatus.CONFLICT,
      );
    }
    return this.menuModuleRepository.remove(id);
  }

  private async assertValidParent(selfId: number, parentId: number | null, moduleId: string) {
    if (parentId === null) return;
    if (parentId === selfId) throw this.invalid('Un menú no puede ser su propio padre');

    const parent = await this.menuModuleRepository.findLink(parentId);
    if (!parent) {
      throw new BusinessException(
        BusinessErrorCode.INVALID_REFERENCE,
        `El menú padre ${parentId} no existe`,
        HttpStatus.BAD_REQUEST,
      );
    }
    if (parent.menuType !== MenuType.SIDEBAR) throw this.invalid('El menú padre tiene que ser de tipo SIDEBAR');
    if (parent.moduleId !== moduleId) throw this.invalid('El menú padre tiene que ser del mismo módulo');

    // Walk up from the parent: reaching selfId means the new link would close a cycle.
    let ancestorId = parent.parentId;
    for (let depth = 0; ancestorId !== null && depth < MAX_DEPTH; depth++) {
      if (ancestorId === selfId) throw this.invalid('El menú padre elegido es un submenú de este menú');
      const ancestor = await this.menuModuleRepository.findLink(ancestorId);
      ancestorId = ancestor?.parentId ?? null;
    }
  }

  private invalid(message: string) {
    return new BusinessException(BusinessErrorCode.VALIDATION_ERROR, message, HttpStatus.BAD_REQUEST);
  }
}
