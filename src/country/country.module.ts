import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CountryController } from './country.controller';
import { CountryRepository } from './country.repository';
import { CountryService } from './country.service';

@Module({
  imports: [PrismaModule],
  controllers: [CountryController],
  providers: [CountryService, CountryRepository],
  exports: [CountryService],
})
export class CountryModule {}
