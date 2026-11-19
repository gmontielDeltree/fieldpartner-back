import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { COUNTRY_SELECT } from './dto/country.dto';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';

@Injectable()
export class CountryRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateCountryDto) {
    return this.prisma.country.create({ select: COUNTRY_SELECT, data: dto });
  }

  findAll() {
    return this.prisma.country.findMany({ select: COUNTRY_SELECT, orderBy: { descriptionES: 'asc' } });
  }

  findOne(id: string) {
    return this.prisma.country.findUnique({ select: COUNTRY_SELECT, where: { id } });
  }

  findByCode(code: string) {
    return this.prisma.country.findUnique({ select: COUNTRY_SELECT, where: { code } });
  }

  update(id: string, dto: UpdateCountryDto) {
    return this.prisma.country.update({ select: COUNTRY_SELECT, where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.country.delete({ select: COUNTRY_SELECT, where: { id } });
  }
}
