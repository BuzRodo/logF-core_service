import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateIngredientDto, UpdateIngredientDto } from './dto/ingredient.dto';

@Injectable()
export class IngredientsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.ingredient.findMany({ orderBy: { name: 'asc' } });
  }

  /** Últimos cambios de costo de insumos (para el panel de análisis). */
  recentCostChanges(days = 30, take = 6) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    return this.prisma.ingredientCostHistory.findMany({
      where: { changedAt: { gte: since } },
      include: { ingredient: { select: { id: true, name: true, unit: true, supplier: true } } },
      orderBy: { changedAt: 'desc' },
      take,
    });
  }

  async findOne(id: string) {
    const ing = await this.prisma.ingredient.findUnique({
      where: { id },
      include: { costHistory: { orderBy: { changedAt: 'desc' }, take: 20 } },
    });
    if (!ing) throw new NotFoundException('Ingrediente no encontrado');
    return ing;
  }

  async create(dto: CreateIngredientDto) {
    const exists = await this.prisma.ingredient.findUnique({ where: { name: dto.name } });
    if (exists) throw new ConflictException('Ya existe un ingrediente con ese nombre');
    return this.prisma.ingredient.create({ data: dto });
  }

  async update(id: string, dto: UpdateIngredientDto, changedBy: string) {
    const current = await this.findOne(id);

    // Si cambió el costo, registrar en el historial
    if (dto.costPerUnit !== undefined && dto.costPerUnit !== current.costPerUnit) {
      await this.prisma.ingredientCostHistory.create({
        data: {
          ingredientId: id,
          oldCost: current.costPerUnit,
          newCost: dto.costPerUnit,
          changedBy,
        },
      });
    }

    return this.prisma.ingredient.update({ where: { id }, data: dto });
  }

  /**
   * Eliminación física del insumo. Solo procede si no hay datos históricos que dependan
   * de él (ver reglas abajo); en caso contrario responde 409 con un mensaje accionable
   * y el flujo esperado es que la UI ofrezca desactivar en su lugar.
   */
  async remove(id: string) {
    const ing = await this.prisma.ingredient.findUnique({
      where: { id },
      include: {
        _count: { select: { recipeItems: true, orderItems: true } },
        stockEntries: { select: { id: true, purchaseInvoiceId: true } },
      },
    });
    if (!ing) throw new NotFoundException('Ingrediente no encontrado');

    if (ing._count.recipeItems > 0) {
      throw new ConflictException(
        `Está usado en ${ing._count.recipeItems} receta(s); desactivalo o quitalo de las recetas primero`,
      );
    }

    const invoiceEntries = ing.stockEntries.filter((e) => e.purchaseInvoiceId != null);
    if (invoiceEntries.length > 0) {
      throw new ConflictException(
        'Tiene lotes cargados por facturas; eliminá primero esas facturas o desactivalo',
      );
    }

    if (ing._count.orderItems > 0) {
      throw new ConflictException(
        `Está referenciado en ${ing._count.orderItems} ítem(s) de orden de compra; desactivalo o quitalo de las órdenes primero`,
      );
    }

    // Sin recetas, sin lotes de factura y sin ítems de orden: lo único que puede quedar
    // colgando son el historial de costos y lotes manuales, que se borran junto al insumo.
    return this.prisma.$transaction(async (tx) => {
      await tx.ingredientCostHistory.deleteMany({ where: { ingredientId: id } });
      await tx.stockEntry.deleteMany({ where: { ingredientId: id } });
      await tx.ingredient.delete({ where: { id } });
      return { deleted: true };
    });
  }
}
