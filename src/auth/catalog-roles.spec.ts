import { GUARDS_METADATA } from '@nestjs/common/constants';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import { CountryController } from '../country/country.controller';
import { CategoryController } from '../category/category.controller';
import { CropController } from '../crop/crop.controller';
import { MovementTypeController } from '../movement-type/movement-type.controller';
import { InputTypeController } from '../input-type/input-type.controller';
import { LicenceTypeController } from '../licence-type/licence-type.controller';
import { TypeDeviceController } from '../type-device/type-device.controller';

// @nestjs/mapped-types ships ESM only and Jest runs CommonJS; the update DTOs are
// irrelevant to authorization metadata, so a pass-through PartialType is enough.
jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (base: new () => object) => class extends base {},
}));

/**
 * Global catalogs: any authenticated user may read them, but only a platform
 * GENERAL_ADMIN may create, update or delete entries.
 */
const CATALOG_CONTROLLERS = [
  CountryController,
  CategoryController,
  CropController,
  MovementTypeController,
  InputTypeController,
  LicenceTypeController,
  TypeDeviceController,
];

describe.each(CATALOG_CONTROLLERS)('%p authorization', (controller) => {
  const proto = controller.prototype as unknown as Record<string, object>;
  const rolesOf = (method: string) => Reflect.getMetadata(ROLES_KEY, proto[method]);

  it('is protected by RolesGuard', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, controller)).toContain(RolesGuard);
  });

  it.each(['create', 'update', 'remove'])('%s requires GENERAL_ADMIN', (method) => {
    expect(rolesOf(method)).toEqual([UserRole.GENERAL_ADMIN]);
  });

  it.each(['findAll', 'findOne'])('%s is open to any authenticated user', (method) => {
    expect(rolesOf(method)).toBeUndefined();
  });
});
