import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { InputTypeController } from './input-type.controller';
import { InputTypeRepository } from './input-type.repository';
import { InputTypeService } from './input-type.service';

@Module({
  imports: [PrismaModule],
  controllers: [InputTypeController],
  providers: [InputTypeService, InputTypeRepository],
  exports: [InputTypeService],
})
export class InputTypeModule {}
