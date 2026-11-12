/** Controlled response shape for the licence-type catalog (no raw entity / timestamps). */
export interface LicenceTypeDto {
  id: string;
  label: string;
  description: string | null;
  systemType: string | null;
  maximumUnitAllowed: number | null;
  allowedUsersCount: number | null;
}

export const LICENCE_TYPE_SELECT = {
  id: true,
  label: true,
  description: true,
  systemType: true,
  maximumUnitAllowed: true,
  allowedUsersCount: true,
} as const;
