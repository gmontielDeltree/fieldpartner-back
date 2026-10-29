import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInputTypeDto } from './dto/create-input-type.dto';
import { UpdateInputTypeDto } from './dto/update-input-type.dto';

@Injectable()
export class InputTypeRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateInputTypeDto) {
    return this.prisma.inputType.create({ data: dto });
  }

  findAll() {
    return this.prisma.inputType.findMany({ orderBy: { descriptionES: 'asc' } });
  }

  findOne(id: number) {
    return this.prisma.inputType.findUnique({ where: { id } });
  }

  update(id: number, dto: UpdateInputTypeDto) {
    return this.prisma.inputType.update({ where: { id }, data: dto });
  }

  remove(id: number) {
    return this.prisma.inputType.delete({ where: { id } });
  }
}
