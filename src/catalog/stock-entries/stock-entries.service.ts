import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStockEntryDto, StockEntryFilterDto } from './dto/stock-entry.dto';

const INGREDIENT_SELECT = { select: { id: true, name: true, unit: true } };

@Injectable()
export class StockEntriesService {
  constructor(private prisma: PrismaService) {}

  findAll(filters: StockEntryFilterDto = {}) {
    return this.prisma.stockEntry.findMany({
      where: { ...(filters.ingredientId && { ingredientId: filters.ingredientId }) },
      include: { ingredient: INGREDIENT_SELECT },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Lotes vencidos o que vencen dentro de `days` días. */
  expiring(days = 7) {
    const limit = new Date();
    limit.setDate(limit.getDate() + days);
    return this.prisma.stockEntry.findMany({
      where: { expiryDate: { not: null, lte: limit } },
      include: { ingredient: INGREDIENT_SELECT },
      orderBy: { expiryDate: 'asc' },
    });
  }

  /** Registra la entrada y suma el stock del ingrediente en la misma transacción. */
  async create(dto: CreateStockEntryDto, createdBy: string) {
    const ingredient = await this.prisma.ingredient.findUnique({ where: { id: dto.ingredientId } });
    if (!ingredient) throw new NotFoundException('Ingrediente no encontrado');
    if (!ingredient.active) throw new BadRequestException('El ingrediente está inactivo');

    return this.prisma.$transaction(async (tx) => {
      const entry = await tx.stockEntry.create({
        data: {
          ingredientId: dto.ingredientId,
          quantity: dto.quantity,
          expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
          note: dto.note,
          createdBy,
        },
        include: { ingredient: INGREDIENT_SELECT },
      });
      await tx.ingredient.update({
        where: { id: dto.ingredientId },
        data: { stockGrams: { increment: dto.quantity } },
      });
      return entry;
    });
  }

  /** Elimina la entrada (carga errónea) y descuenta lo que había sumado. */
  async remove(id: string) {
    const entry = await this.prisma.stockEntry.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException('Entrada de stock no encontrada');

    return this.prisma.$transaction(async (tx) => {
      await tx.stockEntry.delete({ where: { id } });
      await tx.ingredient.update({
        where: { id: entry.ingredientId },
        data: { stockGrams: { decrement: entry.quantity } },
      });
      return entry;
    });
  }
}
