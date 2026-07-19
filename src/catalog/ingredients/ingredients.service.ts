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

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.ingredient.update({ where: { id }, data: { active: false } });
  }
}
