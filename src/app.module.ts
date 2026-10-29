import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CountryModule } from './country/country.module';
import { CropModule } from './crop/crop.module';
import { InputTypeModule } from './input-type/input-type.module';
import { CategoryModule } from './category/category.module';
import { MovementTypeModule } from './movement-type/movement-type.module';
import { AccountModule } from './account/account.module';
import { ZoneModule } from './zone/zone.module';
import { DepositModule } from './deposit/deposit.module';
import { FieldModule } from './field/field.module';
import { FieldLotModule } from './field-lot/field-lot.module';
import { CampaignModule } from './campaign/campaign.module';
import { InputModule } from './input/input.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [`.env.${process.env.NODE_ENV}`, '.env.development', '.env'],
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    CountryModule,
    CropModule,
    InputTypeModule,
    CategoryModule,
    MovementTypeModule,
    AccountModule,
    ZoneModule,
    DepositModule,
    FieldModule,
    FieldLotModule,
    CampaignModule,
    InputModule,
  ],
})
export class AppModule {}
