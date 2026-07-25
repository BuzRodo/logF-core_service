import { Module } from '@nestjs/common';
import { FiservITDClient } from './fiserv/itd.client';
import { TransactionsService } from './transactions/transactions.service';
import { TransactionsController } from './transactions/transactions.controller';
import { HealthController } from './health/health.controller';

@Module({
  controllers: [TransactionsController, HealthController],
  providers: [FiservITDClient, TransactionsService],
  exports: [TransactionsService],
})
export class PosModule {}
