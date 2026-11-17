import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TypeDeviceController } from './type-device.controller';
import { TypeDeviceRepository } from './type-device.repository';
import { TypeDeviceService } from './type-device.service';

@Module({
  imports: [PrismaModule],
  controllers: [TypeDeviceController],
  providers: [TypeDeviceService, TypeDeviceRepository],
  exports: [TypeDeviceService],
})
export class TypeDeviceModule {}
