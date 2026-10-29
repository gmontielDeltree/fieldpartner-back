import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepositDto } from './dto/create-deposit.dto';
import { UpdateDepositDto } from './dto/update-deposit.dto';

@Injectable()
export class DepositRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateDepositDto) {
    return this.prisma.deposit.create({
      data: dto,
      include: { locations: true },
    });
  }

  findAll(accountId: string) {
    return this.prisma.deposit.findMany({
      where: { accountId },
      include: { locations: true },
      orderBy: { description: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.deposit.findUnique({
      where: { id },
      include: { locations: true },
    });
  }

  update(id: string, dto: UpdateDepositDto) {
    return this.prisma.deposit.update({
      where: { id },
      data: dto,
      include: { locations: true },
    });
  }

  remove(id: string) {
    return this.prisma.deposit.delete({ where: { id } });
  }
}
