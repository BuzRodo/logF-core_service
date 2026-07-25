import { Module } from '@nestjs/common';
import { IngredientsController } from './ingredients.controller';
import { IngredientsService } from './ingredients.service';
import { FeaturesModule } from '../../common/features/features.module';

@Module({
  // FeaturesModule: provee FeatureGuard/FeaturesService para el @RequireFeature('recipes')
  // de GET /cost-changes en IngredientsController.
  imports: [FeaturesModule],
  controllers: [IngredientsController],
  providers: [IngredientsService],
  exports: [IngredientsService],
})
export class IngredientsModule {}
