import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Unit, IvaRate } from '../../../generated/prisma/client';
import {
  CreatePurchaseInvoiceDto,
  UpdatePurchaseInvoiceDto,
  PurchaseInvoiceFilterDto,
} from './dto/purchase-invoice.dto';

/** Costo por kg/litro/unidad (centavos) a partir del importe de la línea. */
export function unitCostFromLine(unit: Unit, quantity: number, lineTotal: number): number {
  return unit === Unit.UNIT
    ? Math.round(lineTotal / quantity)
    : Math.round((lineTotal / quantity) * 1000);
}

@Injectable()
export class PurchaseInvoicesService {
  constructor(private prisma: PrismaService) {}

  findAll(filters: PurchaseInvoiceFilterDto = {}) {
    const { supplierId, from, to } = filters;
    return this.prisma.purchaseInvoice.findMany({
      where: {
        ...(supplierId && { supplierId }),
        ...((from || to) && {
          entryDate: {
            ...(from && { gte: new Date(from) }),
            ...(to && { lte: new Date(to) }),
          },
        }),
      },
      include: {
        supplier: { select: { id: true, name: true } },
        _count: { select: { stockEntries: true } },
      },
      orderBy: { entryDate: 'desc' },
    });
  }

  async findOne(id: string) {
    const invoice = await this.prisma.purchaseInvoice.findUnique({
      where: { id },
      include: {
        supplier: { select: { id: true, name: true } },
        purchaseOrder: { select: { id: true, code: true, status: true } },
        stockEntries: {
          include: { ingredient: { select: { id: true, name: true, unit: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!invoice) throw new NotFoundException('Factura no encontrada');
    return invoice;
  }

  async create(dto: CreatePurchaseInvoiceDto, createdBy: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id: dto.supplierId } });
    if (!supplier) throw new NotFoundException('Proveedor no encontrado');
    if (!supplier.active) throw new BadRequestException('El proveedor está inactivo');

    const duplicate = await this.prisma.purchaseInvoice.findUnique({
      where: {
        supplierId_series_number: {
          supplierId: dto.supplierId,
          series: dto.series,
          number: dto.number,
        },
      },
    });
    if (duplicate) {
      throw new ConflictException('Ya existe una factura con esa serie y número para este proveedor');
    }

    // Validar estructura de los ítems
    const items = dto.items ?? [];
    for (const [i, item] of items.entries()) {
      const hasExisting = !!item.ingredientId;
      const hasNew = !!item.newIngredient;
      if (hasExisting === hasNew) {
        throw new BadRequestException(
          `Ítem ${i + 1}: indicá un ingrediente existente o los datos de uno nuevo (no ambos ni ninguno)`,
        );
      }
      if (hasNew && !item.lineTotal) {
        throw new BadRequestException(
          `Ítem ${i + 1}: el insumo nuevo necesita el importe de la línea para calcular su costo`,
        );
      }
    }

    // Ingredientes existentes: deben estar activos
    const ids = [...new Set(items.filter((i) => i.ingredientId).map((i) => i.ingredientId!))];
    const existing = ids.length
      ? await this.prisma.ingredient.findMany({ where: { id: { in: ids }, active: true } })
      : [];
    if (existing.length !== ids.length) {
      const found = new Set(existing.map((i) => i.id));
      const missing = ids.filter((id) => !found.has(id));
      throw new BadRequestException(`Ingredientes no encontrados o inactivos: ${missing.join(', ')}`);
    }
    const byId = new Map(existing.map((i) => [i.id, i]));

    // Orden de compra a cerrar: debe existir, estar pendiente y ser del mismo proveedor
    if (dto.purchaseOrderId) {
      const order = await this.prisma.purchaseOrder.findUnique({ where: { id: dto.purchaseOrderId } });
      if (!order) throw new NotFoundException('Orden de compra no encontrada');
      if (order.status !== 'PENDIENTE') {
        throw new ConflictException(`La orden ${order.code} ya está ${order.status.toLowerCase()}`);
      }
      if (order.supplierId !== dto.supplierId) {
        throw new BadRequestException('La orden de compra pertenece a otro proveedor');
      }
    }

    // Ingredientes nuevos: nombres sin colisión (entre sí ni con los ya cargados)
    const newNames = items.filter((i) => i.newIngredient).map((i) => i.newIngredient!.name.trim());
    if (new Set(newNames.map((n) => n.toLowerCase())).size !== newNames.length) {
      throw new BadRequestException('Hay insumos nuevos repetidos en la factura');
    }
    if (newNames.length > 0) {
      const collisions = await this.prisma.ingredient.findMany({
        where: { name: { in: newNames } },
        select: { name: true },
      });
      if (collisions.length > 0) {
        throw new ConflictException(
          `Ya existen insumos con ese nombre: ${collisions.map((c) => c.name).join(', ')}. Seleccionalos de la lista.`,
        );
      }
    }

    // La factura, los ingredientes nuevos y el stock entran juntos o no entra nada
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.purchaseInvoice.create({
        data: {
          supplierId: dto.supplierId,
          voucherType: dto.voucherType,
          series: dto.series,
          number: dto.number,
          deliveryDate: new Date(dto.deliveryDate),
          entryDate: new Date(dto.entryDate),
          totalAmount: dto.totalAmount,
          purchaseOrderId: dto.purchaseOrderId ?? null,
          createdBy,
        },
        include: { supplier: { select: { id: true, name: true } } },
      });

      // La factura recibida cierra la orden de compra
      if (dto.purchaseOrderId) {
        await tx.purchaseOrder.update({
          where: { id: dto.purchaseOrderId },
          data: { status: 'RECIBIDA' },
        });
      }

      for (const item of items) {
        let ingredientId: string;
        let entryIvaRate: IvaRate | null;

        if (item.newIngredient) {
          // Alta del ingrediente con el costo derivado de la factura
          const created = await tx.ingredient.create({
            data: {
              name: item.newIngredient.name.trim(),
              unit: item.newIngredient.unit,
              costPerUnit: unitCostFromLine(item.newIngredient.unit, item.quantity, item.lineTotal!),
              ivaRate: item.ivaRate ?? null,
              supplier: supplier.name,
              stockGrams: 0, // el lote de abajo lo incrementa
            },
          });
          ingredientId = created.id;
          entryIvaRate = created.ivaRate;
        } else {
          ingredientId = item.ingredientId!;
          const ing = byId.get(ingredientId)!;
          // Si la línea trae importe, actualizar el costo del insumo con historial
          if (item.lineTotal) {
            const newCost = unitCostFromLine(ing.unit, item.quantity, item.lineTotal);
            if (newCost !== ing.costPerUnit) {
              await tx.ingredientCostHistory.create({
                data: { ingredientId, oldCost: ing.costPerUnit, newCost, changedBy: createdBy },
              });
              await tx.ingredient.update({ where: { id: ingredientId }, data: { costPerUnit: newCost } });
            }
          }
          // Snapshot de la línea: el ivaRate del ítem si vino, si no el del insumo, si no null
          entryIvaRate = item.ivaRate ?? ing.ivaRate ?? null;
        }

        await tx.stockEntry.create({
          data: {
            ingredientId,
            quantity: item.quantity,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
            lineTotal: item.lineTotal ?? null,
            ivaRate: entryIvaRate,
            note: `Factura ${dto.series}-${dto.number}`,
            purchaseInvoiceId: invoice.id,
            createdBy,
          },
        });
        await tx.ingredient.update({
          where: { id: ingredientId },
          data: { stockGrams: { increment: item.quantity } },
        });
      }

      return invoice;
    });
  }

  async update(id: string, dto: UpdatePurchaseInvoiceDto) {
    await this.findOne(id);
    const { deliveryDate, entryDate, ...rest } = dto;
    return this.prisma.purchaseInvoice.update({
      where: { id },
      data: {
        ...rest,
        ...(deliveryDate && { deliveryDate: new Date(deliveryDate) }),
        ...(entryDate && { entryDate: new Date(entryDate) }),
      },
      include: { supplier: { select: { id: true, name: true } } },
    });
  }

  async remove(id: string) {
    const invoice = await this.prisma.purchaseInvoice.findUnique({
      where: { id },
      include: { stockEntries: true },
    });
    if (!invoice) throw new NotFoundException('Factura no encontrada');

    // Revertir el stock que trajo la factura antes de borrarla
    return this.prisma.$transaction(async (tx) => {
      for (const entry of invoice.stockEntries) {
        await tx.ingredient.update({
          where: { id: entry.ingredientId },
          data: { stockGrams: { decrement: entry.quantity } },
        });
      }
      await tx.stockEntry.deleteMany({ where: { purchaseInvoiceId: id } });
      // Si esta factura cerraba una OC, la orden vuelve a quedar pendiente
      if (invoice.purchaseOrderId) {
        await tx.purchaseOrder.update({
          where: { id: invoice.purchaseOrderId },
          data: { status: 'PENDIENTE' },
        });
      }
      return tx.purchaseInvoice.delete({ where: { id } });
    });
  }
}
