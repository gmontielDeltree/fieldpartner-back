import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInputDto } from './dto/create-input.dto';
import { UpdateInputDto } from './dto/update-input.dto';
import { INPUT_SELECT, InputDto } from './dto/input.dto';
import { normalizeCropApplications, planCropApplicationSync } from './businessLogic/input-crop-applications';

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
    const { cropApplications, ...data } = dto;
    return this.prisma.input.create({
      data: {
        ...data,
        accountId,
        ...(cropApplications && { cropApplications: { create: normalizeCropApplications(cropApplications) } }),
      },
      select: INPUT_SELECT,
    });
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

  /** `cropApplications`, when sent, replaces the list (see planCropApplicationSync), in one transaction. */
  update(id: string, dto: UpdateInputDto): Promise<InputDto> {
    const { cropApplications, ...data } = dto;
    if (!cropApplications) return this.prisma.input.update({ where: { id }, data, select: INPUT_SELECT });

    return this.prisma.$transaction(async (tx) => {
      const current = await tx.inputCropApplication.findMany({
        where: { inputId: id },
        select: { id: true, cropId: true, minDose: true, maxDose: true, suggestedDose: true },
      });
      const plan = planCropApplicationSync(current, cropApplications);
      if (plan.removeIds.length) await tx.inputCropApplication.deleteMany({ where: { id: { in: plan.removeIds } } });
      for (const { id: applicationId, ...doses } of plan.update) {
        await tx.inputCropApplication.update({ where: { id: applicationId }, data: doses });
      }
      if (plan.create.length) {
        await tx.inputCropApplication.createMany({ data: plan.create.map((application) => ({ ...application, inputId: id })) });
      }
      return tx.input.update({ where: { id }, data, select: INPUT_SELECT });
    });
  }

  remove(id: string): Promise<InputDto> {
    return this.prisma.input.delete({ where: { id }, select: INPUT_SELECT });
  }
}
