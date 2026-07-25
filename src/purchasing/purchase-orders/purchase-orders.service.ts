import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePurchaseOrderDto, PurchaseOrderFilterDto } from './dto/purchase-order.dto';

const ORDER_INCLUDE = {
  supplier: { select: { id: true, name: true } },
  items: { include: { ingredient: { select: { id: true, name: true, unit: true } } } },
  invoice: { select: { id: true, series: true, number: true, totalAmount: true, entryDate: true } },
} as const;

@Injectable()
export class PurchaseOrdersService {
  constructor(private prisma: PrismaService) {}

  private async nextCode(): Promise<string> {
    const count = await this.prisma.purchaseOrder.count();
    return `OC-${String(count + 1).padStart(6, '0')}`;
  }

  findAll(filters: PurchaseOrderFilterDto = {}) {
    return this.prisma.purchaseOrder.findMany({
      where: {
        ...(filters.supplierId && { supplierId: filters.supplierId }),
        ...(filters.status && { status: filters.status }),
      },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: ORDER_INCLUDE,
    });
    if (!order) throw new NotFoundException('Orden de compra no encontrada');
    return order;
  }

  async create(dto: CreatePurchaseOrderDto, createdBy: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id: dto.supplierId } });
    if (!supplier) throw new NotFoundException('Proveedor no encontrado');
    if (!supplier.active) throw new BadRequestException('El proveedor está inactivo');

    // Cada ítem: insumo existente O nombre libre
    for (const [i, item] of dto.items.entries()) {
      if (!!item.ingredientId === !!item.freeName) {
        throw new BadRequestException(
          `Ítem ${i + 1}: indicá un insumo existente o un nombre libre (no ambos ni ninguno)`,
        );
      }
    }
    const ids = [...new Set(dto.items.filter((i) => i.ingredientId).map((i) => i.ingredientId!))];
    if (ids.length > 0) {
      const found = await this.prisma.ingredient.findMany({
        where: { id: { in: ids }, active: true },
        select: { id: true },
      });
      if (found.length !== ids.length) {
        throw new BadRequestException('Hay insumos inexistentes o inactivos en el pedido');
      }
    }

    const code = await this.nextCode();
    return this.prisma.purchaseOrder.create({
      data: {
        code,
        supplierId: dto.supplierId,
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : null,
        notes: dto.notes,
        createdBy,
        items: {
          create: dto.items.map((item) => ({
            ingredientId: item.ingredientId ?? null,
            freeName: item.freeName?.trim() ?? null,
            unit: item.unit,
            quantity: item.quantity,
          })),
        },
      },
      include: ORDER_INCLUDE,
    });
  }

  /** Cancela una orden que no se va a recibir. */
  async cancel(id: string) {
    const order = await this.findOne(id);
    if (order.status !== 'PENDIENTE') {
      throw new ConflictException(`La orden ${order.code} ya está ${order.status.toLowerCase()}`);
    }
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'CANCELADA' },
      include: ORDER_INCLUDE,
    });
  }
}
