import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { INPUT_TYPE_SELECT } from './dto/input-type.dto';
import { CreateInputTypeDto } from './dto/create-input-type.dto';
import { UpdateInputTypeDto } from './dto/update-input-type.dto';

@Injectable()
export class InputTypeRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateInputTypeDto) {
    return this.prisma.inputType.create({ select: INPUT_TYPE_SELECT, data: dto });
  }

  findAll() {
    return this.prisma.inputType.findMany({ select: INPUT_TYPE_SELECT, orderBy: { descriptionES: 'asc' } });
  }

  findOne(id: number) {
    return this.prisma.inputType.findUnique({ select: INPUT_TYPE_SELECT, where: { id } });
  }

  update(id: number, dto: UpdateInputTypeDto) {
    return this.prisma.inputType.update({ select: INPUT_TYPE_SELECT, where: { id }, data: dto });
  }

  remove(id: number) {
    return this.prisma.inputType.delete({ select: INPUT_TYPE_SELECT, where: { id } });
  }
}
