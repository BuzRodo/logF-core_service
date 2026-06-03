import { Module } from '@nestjs/common';
import { CatalogModule } from './modules/catalog/catalog.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { PurchasesModule } from './modules/purchases/purchases.module';
import { RecipesModule } from './modules/recipes/recipes.module';
import { SalesModule } from './modules/sales/sales.module';
import { CashRegisterModule } from './modules/cash-register/cash-register.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ReportsModule } from './modules/reports/reports.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { WasteModule } from './modules/waste/waste.module';

@Module({
  imports: [
    CatalogModule,
    InventoryModule,
    SuppliersModule,
    PurchasesModule,
    RecipesModule,
    SalesModule,
    CashRegisterModule,
    PaymentsModule,
    ReportsModule,
    DashboardModule,
    WasteModule
  ]
})
export class AppModule {}
