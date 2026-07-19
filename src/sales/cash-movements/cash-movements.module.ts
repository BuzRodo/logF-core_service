import { Module } from '@nestjs/common';
import { CashMovementsController } from './cash-movements.controller';
import { CashMovementsService } from './cash-movements.service';
import { CashSessionsModule } from '../cash-sessions/cash-sessions.module';

@Module({
  imports: [CashSessionsModule],
  controllers: [CashMovementsController],
  providers: [CashMovementsService],
  exports: [CashMovementsService],
})
export class CashMovementsModule {}
