import {
  IsString, IsNotEmpty, IsOptional, IsEnum, IsBoolean,
  IsInt, Min, IsEmail, IsDateString, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AccountCategory, AccountStatus, UserRole } from '@prisma/client';

export class CreateCompanyDto {
  @IsString() @IsNotEmpty() fantasyName: string;
  @IsString() @IsNotEmpty() socialReason: string;
  @IsString() @IsNotEmpty() tributaryCode: string;
  @IsString() @IsNotEmpty() address: string;
  @IsString() @IsNotEmpty() phone: string;
  @IsEmail() @IsNotEmpty() email: string;
  @IsOptional() @IsString() locality?: string;
  @IsOptional() @IsString() province?: string;
  @IsOptional() @IsString() zipCode?: string;
  @IsOptional() @IsString() website?: string;
  @IsOptional() @IsString() observation?: string;
  @IsOptional() @IsString() secondaryContact?: string;
  @IsOptional() @IsString() companyLogo?: string;
  @IsOptional() @IsString() fiscalSituation?: string;
}

export class CreateLicenceForAccountDto {
  @IsString() @IsNotEmpty() licenceTypeId: string;
  @IsDateString() startDate: string;
  @IsDateString() endDate: string;
  @IsInt() @Min(1) activeUsersAllowed: number;
  @IsOptional() @IsInt() @Min(0) amountLicencesAllowed?: number;
}

export class CreateAdminUserDto {
  @IsEmail() @IsNotEmpty()
  email: string;

  @IsString() @IsNotEmpty()
  username: string;

  @IsString() @IsNotEmpty()
  password: string;

  @IsString() @IsNotEmpty()
  language: string;

  @IsOptional() @IsEnum(UserRole)
  role?: UserRole;

  // URL of the user's profile photo — stored in Cognito `picture` attribute
  @IsOptional() @IsString()
  photoUrl?: string;
}

export class CreateAccountDto {
  @IsEnum(AccountCategory)
  category: AccountCategory;

  @IsString() @IsNotEmpty()
  denomination: string;

  @IsString() @IsNotEmpty()
  countryCode: string;

  // currency is derived from country — not accepted from client

  @IsOptional() @IsEnum(AccountStatus)
  status?: AccountStatus;

  @IsOptional() @IsString()
  accountReference?: string;

  @IsOptional() @IsString()
  licenceNumber?: string;

  @IsOptional() @IsBoolean()
  isLicenceMultipleCountry?: boolean;

  @IsOptional() @IsInt() @Min(0)
  maxHectares?: number;

  @IsOptional() @IsInt() @Min(0)
  maxFields?: number;

  // Required for Category A — validated in business logic
  @IsOptional() @ValidateNested() @Type(() => CreateCompanyDto)
  company?: CreateCompanyDto;

  @IsOptional() @ValidateNested() @Type(() => CreateLicenceForAccountDto)
  licence?: CreateLicenceForAccountDto;

  @IsOptional() @ValidateNested() @Type(() => CreateAdminUserDto)
  user?: CreateAdminUserDto;
}
