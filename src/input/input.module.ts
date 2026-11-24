import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { InputController } from './input.controller';
import { InputRepository } from './input.repository';
import { InputService } from './input.service';
import { InputBusiness } from './businessLogic/input.business';

@Module({
  imports: [PrismaModule],
  controllers: [InputController],
  providers: [InputService, InputRepository, InputBusiness],
  exports: [InputService],
})
export class InputModule {}
