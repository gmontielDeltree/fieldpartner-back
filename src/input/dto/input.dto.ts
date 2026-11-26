import { Prisma } from '@prisma/client';
import { INPUT_TYPE_SELECT } from '../../input-type/dto/input-type.dto';
import { CATEGORY_SELECT } from '../../category/dto/category.dto';
import { CROP_SELECT } from '../../crop/dto/crop.dto';

/** Controlled response shape for inputs (supplies). `accountId` null = platform input. */
export const INPUT_SELECT = {
  id: true,
  accountId: true,
  countryId: true,
  replacementId: true,
  barCode: true,
  name: true,
  description: true,
  brand: true,
  unitMeasurement: true,
  stockByLot: true,
  activePrincipal: true,
  mermaVolatile: true,
  minimumDose: true,
  maximumDose: true,
  recommendedDose: true,
  replenishmentPoint: true,
  labors: true,
  isDefault: true,
  chemicalComposition: true,
  toxicityClass: true,
  formulationDenomination: true,
  productUrl: true,
  eiqValue: true,
  senasaId: true,
  documentFile: true,
  documentFileName: true,
  inputTypeId: true,
  categoryId: true,
  cropId: true,
  createdAt: true,
  updatedAt: true,
  inputType: { select: INPUT_TYPE_SELECT },
  category: { select: CATEGORY_SELECT },
  crop: { select: CROP_SELECT },
  cropApplications: {
    select: { id: true, cropId: true, minDose: true, maxDose: true, suggestedDose: true },
    orderBy: { cropId: 'asc' },
  },
} as const;

export type InputDto = Prisma.InputGetPayload<{ select: typeof INPUT_SELECT }>;
