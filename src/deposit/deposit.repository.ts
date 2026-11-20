import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepositDto } from './dto/create-deposit.dto';
import { UpdateDepositDto } from './dto/update-deposit.dto';
import { DEPOSIT_SELECT, DepositDto } from './dto/deposit.dto';

@Injectable()
export class DepositRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(accountId: string, dto: CreateDepositDto): Promise<DepositDto> {
    return this.prisma.deposit.create({ data: { ...dto, accountId }, select: DEPOSIT_SELECT });
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

  update(id: string, dto: UpdateDepositDto): Promise<DepositDto> {
    return this.prisma.deposit.update({ where: { id }, data: dto, select: DEPOSIT_SELECT });
  }

  remove(id: string): Promise<DepositDto> {
    return this.prisma.deposit.delete({ where: { id }, select: DEPOSIT_SELECT });
  }
}
