import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LICENCE_TYPE_SELECT, LicenceTypeDto } from './dto/licence-type.dto';

@Injectable()
export class LicenceTypeRepository {
  constructor(private readonly prisma: PrismaService) {}

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
}
