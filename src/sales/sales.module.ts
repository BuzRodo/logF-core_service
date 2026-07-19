import { Module } from '@nestjs/common';
import { CashSessionsModule } from './cash-sessions/cash-sessions.module';
import { SalesModule } from './sales/sales.module';
import { CashMovementsModule } from './cash-movements/cash-movements.module';

@Module({
  imports: [CashSessionsModule, SalesModule, CashMovementsModule],
  exports: [CashSessionsModule, SalesModule, CashMovementsModule],
})
export class SalesRootModule {}
