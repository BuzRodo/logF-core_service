import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { CashSessionsModule } from '../cash-sessions/cash-sessions.module';

@Module({
  imports: [CashSessionsModule],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
