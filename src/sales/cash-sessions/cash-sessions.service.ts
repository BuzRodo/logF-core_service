import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OpenCashSessionDto, CloseCashSessionDto } from './dto/cash-session.dto';

@Injectable()
export class CashSessionsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.cashSession.findMany({
      include: { openedByUser: { select: { id: true, displayName: true } } },
      orderBy: { openedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const session = await this.prisma.cashSession.findUnique({
      where: { id },
      include: { openedByUser: { select: { id: true, displayName: true } } },
    });
    if (!session) throw new NotFoundException('Sesión de caja no encontrada');
    return session;
  }

  async findActiveByRegister(registerId: string) {
    return this.prisma.cashSession.findFirst({
      where: { registerId, status: 'OPEN' },
    });
  }

  async open(dto: OpenCashSessionDto, userId: string) {
    const existing = await this.findActiveByRegister(dto.registerId);
    if (existing) {
      throw new ConflictException(`La caja ${dto.registerId} ya tiene una sesión abierta`);
    }
    return this.prisma.cashSession.create({
      data: {
        registerId: dto.registerId,
        openedBy: userId,
        openingAmount: dto.openingAmount,
      },
      include: { openedByUser: { select: { id: true, displayName: true } } },
    });
  }

  async close(id: string, dto: CloseCashSessionDto) {
    const session = await this.findOne(id);
    if (session.status === 'CLOSED') {
      throw new ConflictException('La sesión de caja ya está cerrada');
    }
    return this.prisma.cashSession.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        closingAmount: dto.closingAmount,
      },
    });
  }
}
