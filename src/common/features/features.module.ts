import { Module } from '@nestjs/common';
import { FeaturesService } from './features.service';
import { FeaturesController } from './features.controller';
import { FeatureGuard } from './feature.guard';

/**
 * Siempre montado (no está gateado por ningún flag): expone `GET /api/features` (público) y
 * `FeatureGuard`/`FeaturesService`, que otros módulos importan para gatear endpoints puntuales
 * que no se pueden desmontar por completo (ver decisión por módulo en el reporte de la tarea).
 */
@Module({
  controllers: [FeaturesController],
  providers: [FeaturesService, FeatureGuard],
  exports: [FeaturesService, FeatureGuard],
})
export class FeaturesModule {}
