import { Module } from '@nestjs/common';
import { CashMovementsController } from './cash-movements.controller';
import { CashMovementsService } from './cash-movements.service';
import { CashSessionsModule } from '../cash-sessions/cash-sessions.module';
import { FeaturesModule } from '../../common/features/features.module';

@Module({
  imports: [CashSessionsModule, FeaturesModule],
  controllers: [CashMovementsController],
  providers: [CashMovementsService],
  exports: [CashMovementsService],
})
export class CashMovementsModule {}
