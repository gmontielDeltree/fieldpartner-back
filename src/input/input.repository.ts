import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInputDto } from './dto/create-input.dto';
import { UpdateInputDto } from './dto/update-input.dto';

const INCLUDE_DETAIL = {
  inputType: true,
  category: true,
  crop: true,
} as const;

@Injectable()
export class InputRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateInputDto) {
    return this.prisma.input.create({ data: dto, include: INCLUDE_DETAIL });
  }

  findAll(accountId?: string) {
    return this.prisma.input.findMany({
      where: accountId ? { accountId } : { accountId: null },
      include: INCLUDE_DETAIL,
      orderBy: { name: 'asc' },
    });
  }

  findAllByAccount(accountId: string) {
    return this.prisma.input.findMany({
      where: { OR: [{ accountId }, { accountId: null, isDefault: true }] },
      include: INCLUDE_DETAIL,
      orderBy: { name: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.input.findUnique({ where: { id }, include: INCLUDE_DETAIL });
  }

  update(id: string, dto: UpdateInputDto) {
    return this.prisma.input.update({ where: { id }, data: dto, include: INCLUDE_DETAIL });
  }

  remove(id: string) {
    return this.prisma.input.delete({ where: { id } });
  }
}
