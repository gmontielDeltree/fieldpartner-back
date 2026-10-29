import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFieldLotDto } from './dto/create-field-lot.dto';
import { UpdateFieldLotDto } from './dto/update-field-lot.dto';

@Injectable()
export class FieldLotRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateFieldLotDto) {
    return this.prisma.fieldLot.create({ data: dto });
  }

  findAll(fieldId: string) {
    return this.prisma.fieldLot.findMany({
      where: { fieldId },
      orderBy: { name: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.fieldLot.findUnique({ where: { id } });
  }

  update(id: string, dto: UpdateFieldLotDto) {
    return this.prisma.fieldLot.update({ where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.fieldLot.delete({ where: { id } });
  }
}
