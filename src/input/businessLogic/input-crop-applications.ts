import { InputCropApplicationInputDto } from '../dto/create-input.dto';

export interface CurrentCropApplication {
  id: string;
  cropId: string;
  minDose: number | null;
  maxDose: number | null;
  suggestedDose: number | null;
}

type Doses = Pick<CurrentCropApplication, 'minDose' | 'maxDose' | 'suggestedDose'>;
type WantedApplication = { cropId: string } & Doses;

export interface CropApplicationSyncPlan {
  /** Applications whose crop is no longer in the list. */
  removeIds: string[];
  /** Existing applications whose doses changed. */
  update: ({ id: string } & Doses)[];
  /** New crops. */
  create: WantedApplication[];
}

/** One entry per crop (the first wins), doses null when not sent. */
export const normalizeCropApplications = (wanted: InputCropApplicationInputDto[]): WantedApplication[] => {
  const seen = new Set<string>();
  const result: WantedApplication[] = [];
  for (const application of wanted) {
    const cropId = application.cropId?.trim();
    if (!cropId || seen.has(cropId)) continue;
    seen.add(cropId);
    result.push({
      cropId,
      minDose: application.minDose ?? null,
      maxDose: application.maxDose ?? null,
      suggestedDose: application.suggestedDose ?? null,
    });
  }
  return result;
};

const sameDoses = (a: Doses, b: Doses) =>
  a.minDose === b.minDose && a.maxDose === b.maxDose && a.suggestedDose === b.suggestedDose;

/** What to change so the input ends with exactly `wanted`, keeping ids by crop. */
export const planCropApplicationSync = (
  current: CurrentCropApplication[],
  wanted: InputCropApplicationInputDto[],
): CropApplicationSyncPlan => {
  const target = normalizeCropApplications(wanted);
  const byCrop = new Map(current.map((application) => [application.cropId, application]));
  const wantedCrops = new Set(target.map((application) => application.cropId));

  return {
    removeIds: current.filter((application) => !wantedCrops.has(application.cropId)).map((application) => application.id),
    update: target.flatMap(({ cropId, ...doses }) => {
      const existing = byCrop.get(cropId);
      return existing && !sameDoses(existing, doses) ? [{ id: existing.id, ...doses }] : [];
    }),
    create: target.filter((application) => !byCrop.has(application.cropId)),
  };
};
