import { NumeratorType, Prisma } from '@prisma/client';
import { IsEnum } from 'class-validator';

/** Controlled response shape for an account's numerators. */
export const NUMERATOR_SELECT = {
  id: true,
  accountId: true,
  numeratorType: true,
  lastNumerator: true,
  updatedAt: true,
} as const;

export type NumeratorDto = Prisma.NumeratorGetPayload<{ select: typeof NUMERATOR_SELECT }>;

/** `:type` path param of /numerators/:type/... */
export class NumeratorTypeParamDto {
  @IsEnum(NumeratorType)
  type!: NumeratorType;
}

/** A number of the sequence: reserved (`take`) or only previewed (`peek`). */
export interface NumeratorNumberDto {
  numeratorType: NumeratorType;
  number: number;
}
