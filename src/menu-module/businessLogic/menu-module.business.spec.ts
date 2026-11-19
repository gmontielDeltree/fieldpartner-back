import { NotFoundException } from '@nestjs/common';
import { MenuType } from '@prisma/client';
import { BusinessException } from '../../common/exceptions/business.exception';
import { MenuModuleBusiness } from './menu-module.business';
import { MenuModuleRepository } from '../menu-module.repository';
import { MenuModuleLink } from '../dto/menu-module.dto';
import { CreateMenuModuleDto } from '../dto/create-menu-module.dto';

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (base: new () => object) => class extends base {},
  OmitType: (base: new () => object) => class extends base {},
}));

const MOD_A = '11111111-1111-4111-8111-111111111111';
const MOD_B = '22222222-2222-4222-8222-222222222222';

describe('MenuModuleBusiness', () => {
  let menus: Map<number, MenuModuleLink>;
  let repo: jest.Mocked<Pick<MenuModuleRepository, 'findLink' | 'findChildren' | 'create' | 'update' | 'remove'>>;
  let business: MenuModuleBusiness;

  const link = (id: number, parentId: number | null = null, menuType: MenuType = MenuType.SIDEBAR, moduleId = MOD_A) =>
    menus.set(id, { id, parentId, menuType, moduleId });

  const dto = (over: Partial<CreateMenuModuleDto> = {}): CreateMenuModuleDto => ({
    id: 99,
    moduleId: MOD_A,
    menuType: MenuType.SIDEBAR,
    labelEs: 'Nuevo',
    ...over,
  });

  beforeEach(() => {
    menus = new Map();
    repo = {
      findLink: jest.fn(async (id: number) => menus.get(id) ?? null),
      findChildren: jest.fn(async (parentId: number) => [...menus.values()].filter((m) => m.parentId === parentId)),
      create: jest.fn(async (d) => d as never),
      update: jest.fn(async (_id, d) => d as never),
      remove: jest.fn(async (id) => ({ id }) as never),
    };
    business = new MenuModuleBusiness(repo as unknown as MenuModuleRepository);
  });

  describe('executeCreate', () => {
    it('creates a top-level menu, only checking the id is free', async () => {
      await business.executeCreate(dto());
      expect(repo.create).toHaveBeenCalled();
      expect(repo.findLink).toHaveBeenCalledTimes(1);
      expect(repo.findLink).toHaveBeenCalledWith(99);
    });

    it('rejects an id that already exists, naming it', async () => {
      link(99);
      await expect(business.executeCreate(dto())).rejects.toThrow('Ya existe un menú con id 99');
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('accepts a SIDEBAR parent of the same module', async () => {
      link(10);
      await business.executeCreate(dto({ parentId: 10 }));
      expect(repo.create).toHaveBeenCalled();
    });

    it.each([
      ['missing parent', () => undefined, 'no existe'],
      ['non-SIDEBAR parent', () => link(10, null, MenuType.NAVBAR), 'SIDEBAR'],
      ['parent of another module', () => link(10, null, MenuType.SIDEBAR, MOD_B), 'mismo módulo'],
    ])('rejects a %s', async (_case, arrange, message) => {
      arrange();
      await expect(business.executeCreate(dto({ parentId: 10 }))).rejects.toThrow(message);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('rejects being its own parent', async () => {
      await expect(business.executeCreate(dto({ id: 10, parentId: 10 }))).rejects.toBeInstanceOf(BusinessException);
    });
  });

  describe('executeUpdate', () => {
    it('404s for an unknown menu', async () => {
      await expect(business.executeUpdate(1, { labelEs: 'x' })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects a cycle (parent is one of its own descendants)', async () => {
      link(1);
      link(2, 1);
      link(3, 2);
      await expect(business.executeUpdate(1, { parentId: 3 })).rejects.toThrow('submenú de este menú');
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('allows detaching a submenu (parentId: null)', async () => {
      link(1);
      link(2, 1);
      await business.executeUpdate(2, { parentId: null });
      expect(repo.update).toHaveBeenCalledWith(2, { parentId: null });
    });

    it('keeps a container with children as SIDEBAR', async () => {
      link(1);
      link(2, 1);
      await expect(business.executeUpdate(1, { menuType: MenuType.MODAL })).rejects.toThrow('SIDEBAR');
    });

    it('treats an explicit null menuType as a change (container cannot become permission-only)', async () => {
      link(1);
      link(2, 1);
      await expect(business.executeUpdate(1, { menuType: null })).rejects.toThrow('SIDEBAR');
    });

    it('does not move a container with children to another module', async () => {
      link(1);
      link(2, 1);
      await expect(business.executeUpdate(1, { moduleId: MOD_B })).rejects.toThrow('cambiar de módulo');
    });

    it('re-validates the current parent when the module changes', async () => {
      link(1);
      link(2, 1);
      await expect(business.executeUpdate(2, { moduleId: MOD_B })).rejects.toThrow('mismo módulo');
    });
  });

  describe('executeRemove', () => {
    it('refuses to delete a menu that has submenus', async () => {
      link(1);
      link(2, 1);
      await expect(business.executeRemove(1)).rejects.toThrow('submenús');
      expect(repo.remove).not.toHaveBeenCalled();
    });

    it('deletes a leaf menu', async () => {
      link(1);
      link(2, 1);
      await business.executeRemove(2);
      expect(repo.remove).toHaveBeenCalledWith(2);
    });
  });
});
