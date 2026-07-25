import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { Unit } from '../../../generated/prisma/client';

// ─── Cálculo de costo ────────────────────────────────────────────────────────

export interface CostLineItem {
  ingredientId: string;
  ingredientName: string;
  unit: Unit;
  quantity: number;
  costPerUnit: number;
  cost: number; // centavos
}

export interface ProductCostBreakdown {
  productId: string;
  productName: string;
  price: number;
  totalCost: number;
  margin: number;
  marginPct: number;
  items: CostLineItem[];
}

/**
 * costPerUnit está en centavos por kg/litro (para GRAM/ML)
 * o centavos por unidad (para UNIT).
 * Para GRAM/ML: costo = quantity × (costPerUnit / 1000)
 * Para UNIT:   costo = quantity × costPerUnit
 */
export function calcItemCost(unit: Unit, quantity: number, costPerUnit: number): number {
  if (unit === Unit.UNIT) return Math.round(quantity * costPerUnit);
  return Math.round(quantity * (costPerUnit / 1000));
}

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.product.findMany({
      include: { category: true, recipeItems: { include: { ingredient: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const p = await this.prisma.product.findUnique({
      where: { id },
      include: { category: true, recipeItems: { include: { ingredient: true } } },
    });
    if (!p) throw new NotFoundException('Producto no encontrado');
    return p;
  }

  /** Catálogo liviano para el POS — solo productos activos */
  getCatalog() {
    return this.prisma.product.findMany({
      where: { active: true },
      select: {
        id: true, sku: true, name: true, price: true, imageUrl: true,
        category: { select: { id: true, name: true } },
      },
      orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
    });
  }

  async getCostBreakdown(id: string): Promise<ProductCostBreakdown> {
    const product = await this.findOne(id);
    const items: CostLineItem[] = product.recipeItems.map((ri) => ({
      ingredientId: ri.ingredientId,
      ingredientName: ri.ingredient.name,
      unit: ri.ingredient.unit,
      quantity: ri.quantity,
      costPerUnit: ri.ingredient.costPerUnit,
      cost: calcItemCost(ri.ingredient.unit, ri.quantity, ri.ingredient.costPerUnit),
    }));
    const totalCost = items.reduce((sum, i) => sum + i.cost, 0);
    const margin = product.price - totalCost;
    const marginPct = product.price > 0 ? margin / product.price : 0;
    return {
      productId: product.id,
      productName: product.name,
      price: product.price,
      totalCost,
      margin,
      marginPct: Math.round(marginPct * 10000) / 100, // porcentaje con 2 decimales
      items,
    };
  }

  async create(dto: CreateProductDto) {
    const exists = await this.prisma.product.findUnique({ where: { sku: dto.sku } });
    if (exists) throw new ConflictException('Ya existe un producto con ese SKU');

    const { recipeItems, ...productData } = dto;
    return this.prisma.product.create({
      data: {
        ...productData,
        recipeItems: recipeItems?.length
          ? { create: recipeItems.map(({ ingredientId, quantity }) => ({ ingredientId, quantity })) }
          : undefined,
      },
      include: { category: true, recipeItems: { include: { ingredient: true } } },
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);
    const { recipeItems, ...productData } = dto;

    return this.prisma.product.update({
      where: { id },
      data: {
        ...productData,
        // Si vienen recipeItems se reemplaza la receta completa
        ...(recipeItems !== undefined && {
          recipeItems: {
            deleteMany: {},
            create: recipeItems.map(({ ingredientId, quantity }) => ({ ingredientId, quantity })),
          },
        }),
      },
      include: { category: true, recipeItems: { include: { ingredient: true } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.product.update({ where: { id }, data: { active: false } });
  }
}
