import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PosModule } from './pos/pos.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { SalesRootModule } from './sales/sales.module';
import { envValidationSchema } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: envValidationSchema,
      expandVariables: true,
    }),
    PrismaModule,
    AuthModule,
    CatalogModule,
    SalesRootModule,
    PosModule,
  ],
})
export class AppModule {}
