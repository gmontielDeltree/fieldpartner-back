import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';

@Injectable()
export class CountryRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateCountryDto) {
    return this.prisma.country.create({ data: dto });
  }

  findAll() {
    return this.prisma.country.findMany({ orderBy: { descriptionES: 'asc' } });
  }

  findOne(id: string) {
    return this.prisma.country.findUnique({ where: { id } });
  }

  findByCode(code: string) {
    return this.prisma.country.findUnique({ where: { code } });
  }

  update(id: string, dto: UpdateCountryDto) {
    return this.prisma.country.update({ where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.country.delete({ where: { id } });
  }
}
