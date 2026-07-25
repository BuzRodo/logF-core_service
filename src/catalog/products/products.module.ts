import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { CatalogController } from './catalog.controller';
import { ProductsService } from './products.service';
import { FeaturesModule } from '../../common/features/features.module';

@Module({
  // FeaturesModule: provee FeatureGuard/FeaturesService para el @RequireFeature('recipes')
  // de GET /:id/cost en ProductsController.
  imports: [FeaturesModule],
  controllers: [ProductsController, CatalogController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
