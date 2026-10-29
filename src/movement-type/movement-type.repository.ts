import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMovementTypeDto } from './dto/create-movement-type.dto';
import { UpdateMovementTypeDto } from './dto/update-movement-type.dto';

@Injectable()
export class MovementTypeRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateMovementTypeDto) {
    return this.prisma.movementType.create({ data: dto });
  }

  findAll() {
    return this.prisma.movementType.findMany({ orderBy: { name: 'asc' } });
  }

  findOne(id: string) {
    return this.prisma.movementType.findUnique({ where: { id } });
  }

  update(id: string, dto: UpdateMovementTypeDto) {
    return this.prisma.movementType.update({ where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.movementType.delete({ where: { id } });
  }
}
