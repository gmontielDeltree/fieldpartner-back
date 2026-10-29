import { Injectable, NotFoundException } from '@nestjs/common';
import { CountryRepository } from './country.repository';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';

@Injectable()
export class CountryService {
  constructor(private readonly countryRepository: CountryRepository) {}

  create(dto: CreateCountryDto) {
    return this.countryRepository.create(dto);
  }

  findAll() {
    return this.countryRepository.findAll();
  }

  async findOne(id: string) {
    const country = await this.countryRepository.findOne(id);
    if (!country) throw new NotFoundException(`Country ${id} not found`);
    return country;
  }

  findByCode(code: string) {
    return this.countryRepository.findByCode(code);
  }

  async update(id: string, dto: UpdateCountryDto) {
    await this.findOne(id);
    return this.countryRepository.update(id, dto);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.countryRepository.remove(id);
  }
}
