import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { BusinessErrorCode, BusinessException } from '../../common/exceptions/business.exception';
import { AccountCategory, AccountStatus, CurrencyCode, LicenceStatus, UserRole, UserState } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CognitoService } from '../../cognito/cognito.service';
import { CreateAccountDto } from '../dto/create-account.dto';
import { UpdateCountersDto } from '../dto/update-counters.dto';
import { ACCOUNT_DETAIL_SELECT, toAccountDetail } from '../dto/account-detail.dto';

@Injectable()
export class AccountBusiness {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cognito: CognitoService,
  ) {}

  async executeCreate(dto: CreateAccountDto) {
    const country = await this.prisma.country.findUnique({
      where: { code: dto.countryCode },
    });
    if (!country) {
      throw new BusinessException(
        BusinessErrorCode.INVALID_COUNTRY_CODE,
        `El código de país "${dto.countryCode}" no es válido`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (dto.category === AccountCategory.A) {
      if (!dto.company) throw new BadRequestException('company is required for Category A accounts');
      if (!dto.licence) throw new BadRequestException('licence is required for Category A accounts');
      if (!dto.user)    throw new BadRequestException('user is required for Category A accounts');
    }

    if (dto.category === AccountCategory.B || dto.category === AccountCategory.C) {
      if (!dto.licence) throw new BadRequestException('licence is required for Category B/C accounts');
      if (!dto.user)    throw new BadRequestException('user is required for Category B/C accounts');
      if (!dto.maxHectares || dto.maxHectares <= 0)
        throw new BadRequestException('maxHectares is required and must be > 0 for Category B/C accounts');
    }

    // Pre-check: fail fast if the email already exists in the DB.
    // This avoids an unnecessary Cognito API call when the email is already taken locally,
    // and provides a clear 409 instead of a constraint error from Prisma.
    if (dto.user?.email) {
      const existing = await this.prisma.user.findUnique({
        where:  { email: dto.user.email.toLowerCase() },
        select: { id: true },
      });
      if (existing) {
        throw new BusinessException(
          BusinessErrorCode.EMAIL_ALREADY_REGISTERED,
          `El email ${dto.user.email} ya tiene una cuenta registrada`,
          HttpStatus.CONFLICT,
        );
      }
    }

    // Register in Cognito BEFORE the DB transaction.
    // If Cognito fails (email duplicado, password inválida, etc.) the transaction never starts.
    // If the DB fails after Cognito succeeds, we delete the Cognito user as compensating action.
    let cognitoId: string | undefined;
    if (dto.user) {
      const cognitoResult = await this.cognito.registerAdminUser({
        email:    dto.user.email,
        username: dto.user.username,
        password: dto.user.password,
        language: dto.user.language,
        photoUrl: dto.user.photoUrl,
      });
      cognitoId = cognitoResult.cognitoId;
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const account = await tx.account.create({
          data: {
            category: dto.category,
            denomination: dto.denomination,
            countryCode: dto.countryCode,
            currency: country.currency as CurrencyCode,
            status: dto.status ?? AccountStatus.ACTIVE,
            licenceNumber: dto.licenceNumber,
            isLicenceMultipleCountry: dto.isLicenceMultipleCountry ?? false,
            maxHectares: dto.maxHectares ?? 0,
            maxFields: dto.maxFields ?? 0,
            countFields: 0,
            countHectares: 0,
            countLicences: dto.category === AccountCategory.A ? 1 : 0,
          },
        });

        if (dto.category === AccountCategory.B || dto.category === AccountCategory.C) {
          const licence = await tx.licence.create({
            data: {
              accountId:             account.id,
              licenceTypeId:         dto.licence.licenceTypeId,
              startDate:             new Date(dto.licence.startDate),
              endDate:               new Date(dto.licence.endDate),
              activeUsersAllowed:    dto.licence.activeUsersAllowed,
              amountLicencesAllowed: dto.licence.amountLicencesAllowed,
              countryCode:           dto.countryCode,
              status:                LicenceStatus.ACTIVE,
            },
          });

          await tx.user.create({
            data: {
              licenceId:  licence.id,
              cognitoId:  cognitoId,
              email:      dto.user.email,
              username:   dto.user.username,
              language:   dto.user.language,
              role:       UserRole.ADMIN,
              isAdmin:    true,
              currency:   country.currency as CurrencyCode,
              photoName:  dto.user.photoUrl ?? '',
              state:      UserState.PENDING,
            },
          });
        }

        if (dto.category === AccountCategory.A) {
          const licence = await tx.licence.create({
            data: {
              accountId: account.id,
              licenceTypeId: dto.licence.licenceTypeId,
              startDate: new Date(dto.licence.startDate),
              endDate: new Date(dto.licence.endDate),
              activeUsersAllowed: dto.licence.activeUsersAllowed,
              amountLicencesAllowed: dto.licence.amountLicencesAllowed,
              countryCode: dto.countryCode,
              status: LicenceStatus.ACTIVE,
            },
          });

          const company = await tx.company.create({
            data: {
              accountId: account.id,
              fantasyName: dto.company.fantasyName,
              socialReason: dto.company.socialReason,
              tributaryCode: dto.company.tributaryCode,
              address: dto.company.address,
              phone: dto.company.phone,
              email: dto.company.email,
              locality: dto.company.locality,
              province: dto.company.province,
              zipCode: dto.company.zipCode,
              website: dto.company.website,
              observation: dto.company.observation,
              secondaryContact: dto.company.secondaryContact,
              companyLogo: dto.company.companyLogo,
              countryCode: dto.countryCode,
              fiscalSituation: dto.company.fiscalSituation,
            },
          });

          const contract = await tx.contractCorporate.create({
            data: {
              accountId: account.id,
              description: dto.denomination,
              status: 'ACTIVE',
            },
          });

          await tx.companyContract.create({
            data: {
              companyId: company.id,
              contractId: contract.id,
              participationPercentage: 100,
            },
          });

          await tx.user.create({
            data: {
              licenceId: licence.id,
              cognitoId: cognitoId,
              email: dto.user.email,
              username: dto.user.username,
              language: dto.user.language,
              role: UserRole.ADMIN,
              isAdmin: true,
              currency: country.currency as CurrencyCode,
              photoName: dto.user.photoUrl ?? '',
              state: UserState.PENDING,
            },
          });
        }

        const created = await tx.account.findUnique({
          where: { id: account.id },
          select: ACCOUNT_DETAIL_SELECT,
        });
        return toAccountDetail(created!);
      });
    } catch (error) {
      // DB failed — delete the Cognito user to avoid orphaned registrations
      if (cognitoId && dto.user?.email) {
        await this.cognito.deleteUser(dto.user.email);
      }
      throw error;
    }
  }

  async getLimits(accountId: string) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: {
        maxFields: true,
        maxHectares: true,
        countFields: true,
        countHectares: true,
        countLicences: true,
      },
    });
    if (!account) throw new NotFoundException(`Account ${accountId} not found`);
    return account;
  }

  async updateCounters(accountId: string, dto: UpdateCountersDto) {
    const exists = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException(`Account ${accountId} not found`);

    return this.prisma.account.update({
      where: { id: accountId },
      data: {
        ...(dto.fields !== undefined && {
          countFields: dto.fields > 0
            ? { increment: dto.fields }
            : { decrement: Math.abs(dto.fields) },
        }),
        ...(dto.hectares !== undefined && {
          countHectares: dto.hectares > 0
            ? { increment: dto.hectares }
            : { decrement: Math.abs(dto.hectares) },
        }),
        ...(dto.licences !== undefined && {
          countLicences: dto.licences > 0
            ? { increment: dto.licences }
            : { decrement: Math.abs(dto.licences) },
        }),
      },
      select: {
        id: true,
        countFields: true,
        countHectares: true,
        countLicences: true,
        maxFields: true,
        maxHectares: true,
      },
    });
  }
}
