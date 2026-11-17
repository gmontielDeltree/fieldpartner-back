import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LICENCE_TYPE_SELECT, LicenceTypeDto } from './dto/licence-type.dto';
import { CreateLicenceTypeDto } from './dto/create-licence-type.dto';
import { UpdateLicenceTypeDto } from './dto/update-licence-type.dto';

@Injectable()
export class LicenceTypeRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateLicenceTypeDto): Promise<LicenceTypeDto> {
    return this.prisma.licenceType.create({
      data: dto,
      select: LICENCE_TYPE_SELECT,
    });
  }

  findAll(): Promise<LicenceTypeDto[]> {
    return this.prisma.licenceType.findMany({
      select: LICENCE_TYPE_SELECT,
      orderBy: { label: 'asc' },
    });
  }

  findOne(id: string): Promise<LicenceTypeDto | null> {
    return this.prisma.licenceType.findUnique({
      where: { id },
      select: LICENCE_TYPE_SELECT,
    });
  }

  update(id: string, dto: UpdateLicenceTypeDto): Promise<LicenceTypeDto> {
    return this.prisma.licenceType.update({
      where: { id },
      data: dto,
      select: LICENCE_TYPE_SELECT,
    });
  }

  remove(id: string): Promise<LicenceTypeDto> {
    return this.prisma.licenceType.delete({
      where: { id },
      select: LICENCE_TYPE_SELECT,
    });
  }
}
