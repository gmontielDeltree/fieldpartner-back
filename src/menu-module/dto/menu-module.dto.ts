import { Prisma } from '@prisma/client';
import { SYSTEM_REF_SELECT } from '../../system/dto/system.dto';

/** Controlled response shape for menu entries, with their module and system references. */
export const MENU_MODULE_SELECT = {
  id: true,
  parentId: true,
  menuType: true,
  order: true,
  labelEs: true,
  labelEn: true,
  labelPt: true,
  details: true,
  icon: true,
  route: true,
  full: true,
  light: true,
  module: { select: { id: true, nameEs: true, icon: true } },
  system: { select: SYSTEM_REF_SELECT },
} as const;

export type MenuModuleDto = Prisma.MenuModuleGetPayload<{ select: typeof MENU_MODULE_SELECT }>;

/** Just the columns the hierarchy rules need. */
export const MENU_MODULE_LINK_SELECT = {
  id: true,
  moduleId: true,
  parentId: true,
  menuType: true,
} as const;

export type MenuModuleLink = Prisma.MenuModuleGetPayload<{ select: typeof MENU_MODULE_LINK_SELECT }>;
