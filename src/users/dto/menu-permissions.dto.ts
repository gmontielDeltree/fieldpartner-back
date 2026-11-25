import { ArrayMaxSize, IsArray, IsInt, Min } from 'class-validator';

/** Upper bound for a permission set: the platform has under a hundred menus. */
export const MAX_MENU_PERMISSIONS = 500;

/** PUT /users/:id/permissions — replaces the whole set of menus the user may open. */
export class ReplaceMenuPermissionsDto {
  @IsArray()
  @ArrayMaxSize(MAX_MENU_PERMISSIONS)
  @IsInt({ each: true })
  @Min(0, { each: true })
  menuIds: number[];
}
