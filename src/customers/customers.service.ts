import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { normalizePhoneDigits } from '../common/utils/phone.util';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.customer.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new NotFoundException('Cliente no encontrado');
    return customer;
  }

  search(phone: string) {
    return this.prisma.customer.findFirst({ where: { phone } });
  }

  /**
   * Busca un cliente comparando solo los dígitos del teléfono (ignora espacios, guiones,
   * +, etc. tanto del valor buscado como del guardado). La usa el módulo de llamadas
   * entrantes (`calls`) para matchear el caller ID sin duplicar la lógica de búsqueda.
   */
  async findByPhoneDigits(digits: string) {
    const normalized = normalizePhoneDigits(digits);
    if (!normalized) return null;
    const [customer] = await this.prisma.$queryRaw<
      Array<{
        id: string;
        phone: string;
        name: string;
        address: string | null;
        addressNotes: string | null;
        active: boolean;
      }>
    >`SELECT * FROM "Customer" WHERE regexp_replace(phone, '\D', '', 'g') = ${normalized} LIMIT 1`;
    return customer ?? null;
  }

  async create(dto: CreateCustomerDto) {
    const exists = await this.prisma.customer.findUnique({ where: { phone: dto.phone } });
    if (exists) throw new ConflictException('Ya existe un cliente con ese teléfono');
    return this.prisma.customer.create({ data: dto });
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.findOne(id);
    return this.prisma.customer.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.customer.update({ where: { id }, data: { active: false } });
  }
}
