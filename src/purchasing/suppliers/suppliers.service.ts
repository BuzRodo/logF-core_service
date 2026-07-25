import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.supplier.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) throw new NotFoundException('Proveedor no encontrado');
    return supplier;
  }

  async create(dto: CreateSupplierDto) {
    const exists = await this.prisma.supplier.findUnique({ where: { name: dto.name } });
    if (exists) throw new ConflictException('Ya existe un proveedor con ese nombre');
    return this.prisma.supplier.create({ data: dto });
  }

  async update(id: string, dto: UpdateSupplierDto) {
    await this.findOne(id);
    return this.prisma.supplier.update({ where: { id }, data: dto });
  }

  /**
   * Eliminación física del proveedor. Solo procede si no hay facturas ni órdenes de
   * compra que dependan de él; en caso contrario responde 409 con un mensaje accionable
   * y el flujo esperado es que la UI ofrezca desactivar en su lugar (PATCH { active: false }).
   */
  async remove(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: { _count: { select: { invoices: true, orders: true } } },
    });
    if (!supplier) throw new NotFoundException('Proveedor no encontrado');

    if (supplier._count.invoices > 0) {
      throw new ConflictException(
        `Tiene ${supplier._count.invoices} factura(s) registradas; desactivalo para conservar el historial`,
      );
    }

    if (supplier._count.orders > 0) {
      throw new ConflictException(
        `Tiene ${supplier._count.orders} orden(es) de compra registradas; desactivalo para conservar el historial`,
      );
    }

    await this.prisma.supplier.delete({ where: { id } });
    return { deleted: true };
  }
}
