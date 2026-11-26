import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepositDto } from './dto/create-deposit.dto';
import { UpdateDepositDto } from './dto/update-deposit.dto';
import { DEPOSIT_SELECT, DepositDto } from './dto/deposit.dto';
import { normalizeLocations, planLocationSync } from './businessLogic/deposit-locations';

@Injectable()
export class DepositRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(accountId: string, dto: CreateDepositDto): Promise<DepositDto> {
    const { locations, ...data } = dto;
    return this.prisma.deposit.create({
      data: {
        ...data,
        accountId,
        ...(locations && { locations: { create: normalizeLocations(locations) } }),
      },
      select: DEPOSIT_SELECT,
    });
  }

  findAll(accountId: string): Promise<DepositDto[]> {
    return this.prisma.deposit.findMany({
      where: { accountId },
      select: DEPOSIT_SELECT,
      orderBy: { description: 'asc' },
    });
  }

  /** `accountId` undefined = no account filter (GENERAL_ADMIN). */
  findOne(id: string, accountId?: string): Promise<DepositDto | null> {
    return this.prisma.deposit.findFirst({
      where: { id, ...(accountId && { accountId }) },
      select: DEPOSIT_SELECT,
    });
  }

  /** `locations`, when sent, replaces the list (see planLocationSync), in one transaction. */
  update(id: string, dto: UpdateDepositDto): Promise<DepositDto> {
    const { locations, ...data } = dto;
    if (!locations) return this.prisma.deposit.update({ where: { id }, data, select: DEPOSIT_SELECT });

    return this.prisma.$transaction(async (tx) => {
      const current = await tx.depositLocation.findMany({
        where: { depositId: id },
        select: { id: true, name: true, number: true },
      });
      const plan = planLocationSync(current, locations);
      if (plan.removeIds.length) await tx.depositLocation.deleteMany({ where: { id: { in: plan.removeIds } } });
      for (const { id: locationId, number } of plan.update) {
        await tx.depositLocation.update({ where: { id: locationId }, data: { number } });
      }
      if (plan.create.length) {
        await tx.depositLocation.createMany({ data: plan.create.map((location) => ({ ...location, depositId: id })) });
      }
      return tx.deposit.update({ where: { id }, data, select: DEPOSIT_SELECT });
    });
  }

  remove(id: string): Promise<DepositDto> {
    return this.prisma.deposit.delete({ where: { id }, select: DEPOSIT_SELECT });
  }
}
