import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CashSessionsService } from '../cash-sessions/cash-sessions.service';
import { CreateCashMovementDto, CashMovementFilterDto } from './dto/cash-movement.dto';

@Injectable()
export class CashMovementsService {
  constructor(
    private prisma: PrismaService,
    private cashSessions: CashSessionsService,
  ) {}

  async create(dto: CreateCashMovementDto, createdBy: string) {
    const session = await this.cashSessions.findOne(dto.cashSessionId);
    if (session.status !== 'OPEN') {
      throw new BadRequestException('La sesión de caja no está abierta');
    }

    return this.prisma.cashMovement.create({
      data: {
        cashSessionId: dto.cashSessionId,
        type: dto.type,
        concept: dto.concept,
        amount: dto.amount,
        createdBy,
      },
    });
  }

  async findAll(filters: CashMovementFilterDto) {
    return this.prisma.cashMovement.findMany({
      where: {
        ...(filters.cashSessionId && { cashSessionId: filters.cashSessionId }),
        // gte y lte combinados en un solo objeto para que no se pisen
        ...((filters.from || filters.to) && {
          createdAt: {
            ...(filters.from && { gte: new Date(filters.from) }),
            ...(filters.to && { lte: new Date(filters.to + 'T23:59:59') }),
          },
        }),
      },
      include: {
        cashSession: { select: { id: true, registerId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
