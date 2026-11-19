import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SystemController } from './system.controller';
import { SystemRepository } from './system.repository';
import { SystemService } from './system.service';

@Module({
  imports: [PrismaModule],
  controllers: [SystemController],
  providers: [SystemService, SystemRepository],
  exports: [SystemService],
})
export class SystemModule {}
