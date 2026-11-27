import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CropBalanceController, StockController, StockMovementController } from './stock.controller';
import { StockRepository } from './stock.repository';
import { StockService } from './stock.service';
import { StockBusiness } from './businessLogic/stock.business';

/** Stock balances, movements and grain commitments (KAN-71). */
@Module({
  imports: [PrismaModule],
  controllers: [StockController, StockMovementController, CropBalanceController],
  providers: [StockService, StockRepository, StockBusiness],
})
export class StockModule {}
