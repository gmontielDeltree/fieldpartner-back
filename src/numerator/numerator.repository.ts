import { Injectable } from '@nestjs/common';
import { NumeratorType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NUMERATOR_SELECT, NumeratorDto } from './dto/numerator.dto';

@Injectable()
export class NumeratorRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(accountId: string): Promise<NumeratorDto[]> {
    return this.prisma.numerator.findMany({
      where: { accountId },
      select: NUMERATOR_SELECT,
      orderBy: { numeratorType: 'asc' },
    });
  }

  async findLast(accountId: string, numeratorType: NumeratorType): Promise<number> {
    const numerator = await this.prisma.numerator.findUnique({
      where: { accountId_numeratorType: { accountId, numeratorType } },
      select: { lastNumerator: true },
    });
    return numerator?.lastNumerator ?? 0;
  }

  /**
   * Reserves the next number in one statement: the first call creates the numerator with 1,
   * the next ones increment it. Postgres serializes concurrent calls on the unique
   * (accountId, numeratorType) row, so two callers never get the same number.
   */
  async takeNext(accountId: string, numeratorType: NumeratorType): Promise<number> {
    const rows = await this.prisma.$queryRaw<{ lastNumerator: number }[]>(Prisma.sql`
      INSERT INTO numerators (id, "accountId", "numeratorType", "lastNumerator", "createdAt", "updatedAt")
      VALUES (gen_random_uuid()::text, ${accountId}, ${numeratorType}::"NumeratorType", 1, NOW(), NOW())
      ON CONFLICT ("accountId", "numeratorType")
      DO UPDATE SET "lastNumerator" = numerators."lastNumerator" + 1, "updatedAt" = NOW()
      RETURNING "lastNumerator"
    `);
    return rows[0].lastNumerator;
  }
}
