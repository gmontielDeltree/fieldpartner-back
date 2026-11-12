import { Injectable } from '@nestjs/common';
import { AccountCategory, AccountStatus, LicenceStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateAccountDto } from './dto/update-account.dto';
import { AccountSummaryDto, LicenceSummaryDto } from './dto/account-summary.dto';
import { ACCOUNT_DETAIL_SELECT, AccountDetailDto, toAccountDetail } from './dto/account-detail.dto';

const INCLUDE_DETAIL = {
  company: true,
  licences: { select: { id: true, status: true, startDate: true, endDate: true } },
} as const;

const SELECT_SUMMARY = {
  id: true,
  denomination: true,
  countryCode: true,
  category: true,
  status: true,
  isLicenceMultipleCountry: true,
  countFields: true,
  countLicences: true,
  countHectares: true,
  licences: {
    select: {
      id: true,
      status: true,
      startDate: true,
      endDate: true,
      amountLicencesAllowed: true,
      licenceType: { select: { id: true, label: true } },
    },
  },
} as const;

type AccountSummaryRaw = Prisma.AccountGetPayload<{ select: typeof SELECT_SUMMARY }>;

@Injectable()
export class AccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  private static toSummary(account: AccountSummaryRaw): AccountSummaryDto {
    const activeLicence =
      account.licences.find(l => l.status === LicenceStatus.ACTIVE) ??
      account.licences[0] ??
      null;

    const licence: LicenceSummaryDto | null = activeLicence
      ? {
          id: activeLicence.id,
          status: activeLicence.status,
          licenceTypeId: activeLicence.licenceType.id,
          licenceTypeLabel: activeLicence.licenceType.label,
          startDate: activeLicence.startDate.toISOString(),
          endDate: activeLicence.endDate.toISOString(),
          amountLicencesAllowed: activeLicence.amountLicencesAllowed,
        }
      : null;

    return {
      id: account.id,
      denomination: account.denomination,
      countryCode: account.countryCode,
      category: account.category,
      status: account.status,
      isLicenceMultipleCountry: account.isLicenceMultipleCountry,
      countFields: account.countFields,
      countLicences: account.countLicences,
      countHectares: account.countHectares,
      licence,
    };
  }

  // Used internally (e.g. from business logic outside a transaction)
  create(data: Prisma.AccountUncheckedCreateInput) {
    return this.prisma.account.create({ data, include: INCLUDE_DETAIL });
  }

  async findAll(filters?: { category?: AccountCategory; status?: AccountStatus }): Promise<AccountSummaryDto[]> {
    const accounts = await this.prisma.account.findMany({
      where: filters,
      select: SELECT_SUMMARY,
      orderBy: { denomination: 'asc' },
    });
    return accounts.map(AccountRepository.toSummary);
  }

  async findOne(id: string): Promise<AccountDetailDto | null> {
    const account = await this.prisma.account.findUnique({
      where: { id },
      select: ACCOUNT_DETAIL_SELECT,
    });
    return account ? toAccountDetail(account) : null;
  }

  async update(id: string, dto: UpdateAccountDto): Promise<AccountDetailDto> {
    const account = await this.prisma.account.update({
      where: { id },
      data: dto,
      select: ACCOUNT_DETAIL_SELECT,
    });
    return toAccountDetail(account);
  }

  remove(id: string) {
    return this.prisma.account.delete({ where: { id } });
  }
}
