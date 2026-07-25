import { Module } from '@nestjs/common';
import { CategoriesModule } from './categories/categories.module';
import { IngredientsModule } from './ingredients/ingredients.module';
import { ProductsModule } from './products/products.module';
import { StockEntriesModule } from './stock-entries/stock-entries.module';

@Module({
  imports: [CategoriesModule, IngredientsModule, ProductsModule, StockEntriesModule],
  exports: [CategoriesModule, IngredientsModule, ProductsModule, StockEntriesModule],
})
export class CatalogModule {}
