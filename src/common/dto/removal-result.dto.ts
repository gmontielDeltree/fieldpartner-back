/**
 * Outcome of deleting a record that may be referenced elsewhere (fields, lots): with
 * references it is archived (`archivedAt`) so history keeps resolving; without, deleted.
 */
export type RemovalResult = 'ARCHIVED' | 'DELETED';

export interface RemovalResultDto {
  id: string;
  result: RemovalResult;
}
