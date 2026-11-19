import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MOVEMENT_TYPE_SELECT } from './dto/movement-type.dto';
import { CreateMovementTypeDto } from './dto/create-movement-type.dto';
import { UpdateMovementTypeDto } from './dto/update-movement-type.dto';

@Injectable()
export class MovementTypeRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateMovementTypeDto) {
    return this.prisma.movementType.create({ select: MOVEMENT_TYPE_SELECT, data: dto });
  }

  findAll() {
    return this.prisma.movementType.findMany({ select: MOVEMENT_TYPE_SELECT, orderBy: { name: 'asc' } });
  }

  findOne(id: string) {
    return this.prisma.movementType.findUnique({ select: MOVEMENT_TYPE_SELECT, where: { id } });
  }

  update(id: string, dto: UpdateMovementTypeDto) {
    return this.prisma.movementType.update({ select: MOVEMENT_TYPE_SELECT, where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.movementType.delete({ select: MOVEMENT_TYPE_SELECT, where: { id } });
  }
}
