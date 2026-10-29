import { Injectable } from '@nestjs/common';
import { AccountCategory, AccountStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateAccountDto } from './dto/update-account.dto';

const INCLUDE_SUMMARY = {
  company: true,
  licences: { select: { id: true, status: true, startDate: true, endDate: true } },
} as const;

@Injectable()
export class AccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Used internally (e.g. from business logic outside a transaction)
  create(data: Prisma.AccountUncheckedCreateInput) {
    return this.prisma.account.create({ data, include: INCLUDE_SUMMARY });
  }

  findAll(filters?: { category?: AccountCategory; status?: AccountStatus }) {
    return this.prisma.account.findMany({
      where: filters,
      include: INCLUDE_SUMMARY,
      orderBy: { denomination: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.account.findUnique({
      where: { id },
      include: {
        company: true,
        contractCorporate: true,
        licences: { include: { licenceType: true, users: true } },
      },
    });
  }

  update(id: string, dto: UpdateAccountDto) {
    return this.prisma.account.update({
      where: { id },
      data: dto,
      include: INCLUDE_SUMMARY,
    });
  }

  remove(id: string) {
    return this.prisma.account.delete({ where: { id } });
  }
}
