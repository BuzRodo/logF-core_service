import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PosModule } from './pos/pos.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      // Validar variables críticas al arrancar
      expandVariables: true,
    }),
    PosModule,
  ],
})
export class AppModule {}
