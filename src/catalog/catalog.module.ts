import { Module } from '@nestjs/common';
import { CategoriesModule } from './categories/categories.module';
import { IngredientsModule } from './ingredients/ingredients.module';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [CategoriesModule, IngredientsModule, ProductsModule],
  exports: [CategoriesModule, IngredientsModule, ProductsModule],
})
export class CatalogModule {}
