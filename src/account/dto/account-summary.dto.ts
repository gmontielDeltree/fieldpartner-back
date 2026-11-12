export class LicenceSummaryDto {
  id: string;
  status: string;
  licenceTypeId: string;
  licenceTypeLabel: string;
  startDate: string;
  endDate: string;
  amountLicencesAllowed: number | null;
}

export class AccountSummaryDto {
  id: string;
  denomination: string;
  countryCode: string;
  category: string;
  status: string;
  isLicenceMultipleCountry: boolean;
  countFields: number;
  countLicences: number;
  countHectares: number;
  licence: LicenceSummaryDto | null;
}
