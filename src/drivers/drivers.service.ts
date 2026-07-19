import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDriverDto, UpdateDriverDto } from './dto/driver.dto';

@Injectable()
export class DriversService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.deliveryDriver.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const driver = await this.prisma.deliveryDriver.findUnique({ where: { id } });
    if (!driver) throw new NotFoundException('Repartidor no encontrado');
    return driver;
  }

  async create(dto: CreateDriverDto) {
    const exists = await this.prisma.deliveryDriver.findUnique({ where: { name: dto.name } });
    if (exists) throw new ConflictException('Ya existe un repartidor con ese nombre');
    return this.prisma.deliveryDriver.create({ data: dto });
  }

  async update(id: string, dto: UpdateDriverDto) {
    await this.findOne(id);
    return this.prisma.deliveryDriver.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.deliveryDriver.update({ where: { id }, data: { active: false } });
  }
}
