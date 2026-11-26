import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NumeratorController } from './numerator.controller';
import { NumeratorRepository } from './numerator.repository';
import { NumeratorService } from './numerator.service';

@Module({
  imports: [PrismaModule],
  controllers: [NumeratorController],
  providers: [NumeratorService, NumeratorRepository],
  exports: [NumeratorService],
})
export class NumeratorModule {}
