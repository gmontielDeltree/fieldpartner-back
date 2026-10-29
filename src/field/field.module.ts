import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FieldController } from './field.controller';
import { FieldRepository } from './field.repository';
import { FieldService } from './field.service';

@Module({
  imports: [PrismaModule],
  controllers: [FieldController],
  providers: [FieldService, FieldRepository],
  exports: [FieldService],
})
export class FieldModule {}
