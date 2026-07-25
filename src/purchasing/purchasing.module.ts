import { Module } from '@nestjs/common';
import { SuppliersModule } from './suppliers/suppliers.module';
import { PurchaseInvoicesModule } from './purchase-invoices/purchase-invoices.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';

@Module({
  imports: [SuppliersModule, PurchaseInvoicesModule, PurchaseOrdersModule],
  exports: [SuppliersModule, PurchaseInvoicesModule, PurchaseOrdersModule],
})
export class PurchasingModule {}
