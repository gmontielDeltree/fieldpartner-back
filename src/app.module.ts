import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt.guard';
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
import { LicenceTypeModule } from './licence-type/licence-type.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [`.env.${process.env.NODE_ENV}`, '.env.development', '.env'],
      isGlobal: true,
    }),
    // Global rate limit: 100 requests / 60s per IP. Sensitive endpoints tighten
    // this further with @Throttle() (see AuthController).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
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
    LicenceTypeModule,
    UsersModule,
  ],
  providers: [
    // Rate limiting runs first, before authentication, so floods on public
    // endpoints (e.g. login) are throttled too.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Authenticated by default across every controller.
    // Public endpoints must opt out explicitly with @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
