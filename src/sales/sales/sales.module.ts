import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { CashSessionsModule } from '../cash-sessions/cash-sessions.module';
import { FeaturesModule } from '../../common/features/features.module';

@Module({
  imports: [CashSessionsModule, FeaturesModule],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
