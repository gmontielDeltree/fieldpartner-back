import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInputDto } from './dto/create-input.dto';
import { UpdateInputDto } from './dto/update-input.dto';
import { INPUT_SELECT, InputDto } from './dto/input.dto';

/**
 * Inputs visible to an account: its own plus the platform ones (accountId null).
 * `accountId` undefined = no filter (GENERAL_ADMIN sees everything).
 */
const visibleTo = (accountId?: string): Prisma.InputWhereInput =>
  accountId ? { OR: [{ accountId }, { accountId: null }] } : {};

@Injectable()
export class InputRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** `accountId` null = platform input. */
  create(accountId: string | null, dto: CreateInputDto): Promise<InputDto> {
    return this.prisma.input.create({ data: { ...dto, accountId }, select: INPUT_SELECT });
  }

  /** One account's own inputs, or the platform catalog when `accountId` is null. */
  findAll(accountId: string | null): Promise<InputDto[]> {
    return this.prisma.input.findMany({
      where: { accountId },
      select: INPUT_SELECT,
      orderBy: { name: 'asc' },
    });
  }

  /** An account's own inputs plus the platform defaults. */
  findAllByAccount(accountId: string): Promise<InputDto[]> {
    return this.prisma.input.findMany({
      where: { OR: [{ accountId }, { accountId: null, isDefault: true }] },
      select: INPUT_SELECT,
      orderBy: { name: 'asc' },
    });
  }

  findOne(id: string, accountId?: string): Promise<InputDto | null> {
    return this.prisma.input.findFirst({
      where: { id, ...visibleTo(accountId) },
      select: INPUT_SELECT,
    });
  }

  /** Whether `id` exists and an input owned by `ownerAccountId` may reference it. */
  async isVisibleTo(id: string, ownerAccountId: string | null): Promise<boolean> {
    const where: Prisma.InputWhereInput = ownerAccountId
      ? { id, ...visibleTo(ownerAccountId) }
      : { id, accountId: null };
    return (await this.prisma.input.count({ where })) > 0;
  }

  update(id: string, dto: UpdateInputDto): Promise<InputDto> {
    return this.prisma.input.update({ where: { id }, data: dto, select: INPUT_SELECT });
  }

  remove(id: string): Promise<InputDto> {
    return this.prisma.input.delete({ where: { id }, select: INPUT_SELECT });
  }
}
