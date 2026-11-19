import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MenuModuleController } from './menu-module.controller';
import { MenuModuleRepository } from './menu-module.repository';
import { MenuModuleService } from './menu-module.service';
import { MenuModuleBusiness } from './businessLogic/menu-module.business';

@Module({
  imports: [PrismaModule],
  controllers: [MenuModuleController],
  providers: [MenuModuleService, MenuModuleRepository, MenuModuleBusiness],
  exports: [MenuModuleService],
})
export class MenuModuleModule {}
