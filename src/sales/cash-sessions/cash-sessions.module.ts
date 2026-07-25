import { Module } from '@nestjs/common';
import { CashSessionsController } from './cash-sessions.controller';
import { CashSessionsService } from './cash-sessions.service';
import { FeaturesModule } from '../../common/features/features.module';

@Module({
  // FeaturesModule: provee FeatureGuard/FeaturesService para el @RequireFeature('cash') del
  // controller (ver decisión en el reporte: no se puede desmontar este módulo por completo
  // porque SalesModule lo importa para validar la sesión de caja al crear una venta).
  imports: [FeaturesModule],
  controllers: [CashSessionsController],
  providers: [CashSessionsService],
  exports: [CashSessionsService],
})
export class CashSessionsModule {}
