import { Module } from '@nestjs/common';
import { CashSessionsModule } from './cash-sessions/cash-sessions.module';
import { SalesModule } from './sales/sales.module';

@Module({
  imports: [CashSessionsModule, SalesModule],
  exports: [CashSessionsModule, SalesModule],
})
export class SalesRootModule {}
