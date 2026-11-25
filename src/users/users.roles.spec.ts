import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../auth/roles.decorator';
import { UsersController } from './users.controller';

/** Who may call each /users route (KAN-57). The RolesGuard reads this metadata. */
describe('UsersController roles', () => {
  const rolesOf = (method: keyof UsersController) =>
    Reflect.getMetadata(ROLES_KEY, UsersController.prototype[method]) ??
    Reflect.getMetadata(ROLES_KEY, UsersController);

  it.each(['findMe', 'updateMe'] as const)('%s is open to every role (own profile and menu)', (method) => {
    expect(rolesOf(method)).toEqual([UserRole.GENERAL_ADMIN, UserRole.ADMIN, UserRole.USER]);
  });

  it.each(['findAll', 'findOne', 'create', 'update', 'replacePermissions', 'findByEmail'] as const)(
    '%s stays for administrators only',
    (method) => {
      expect(rolesOf(method)).toEqual([UserRole.GENERAL_ADMIN, UserRole.ADMIN]);
    },
  );
});
