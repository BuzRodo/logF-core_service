import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { FeaturesService } from './features.service';
import { FeatureFlags } from '../../config/feature-flags';

@ApiTags('Features')
@Controller('api/features')
export class FeaturesController {
  constructor(private readonly features: FeaturesService) {}

  /**
   * Público (sin JWT): el frontend lo consulta al bootstrap, antes de saber si hay sesión,
   * para decidir qué rutas/menús mostrar. Solo expone los booleanos, nada más.
   */
  @Get()
  @ApiOperation({ summary: 'Feature flags habilitados (público, sin autenticación)' })
  get(): FeatureFlags {
    return this.features.toPublicDto();
  }
}
