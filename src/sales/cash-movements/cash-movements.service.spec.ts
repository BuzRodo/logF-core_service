import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CashMovementsService } from './cash-movements.service';
import { CashMovementType } from '../../../generated/prisma/client';

const mockPrisma = {
  cashMovement: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
} as any;

const mockCashSessions = {
  findOne: jest.fn(),
} as any;

function buildService() {
  return new CashMovementsService(mockPrisma, mockCashSessions);
}

describe('CashMovementsService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('create', () => {
    const dto = {
      cashSessionId: 'session-1',
      type: CashMovementType.INGRESO,
      concept: 'Cambio',
      amount: 50000,
    };

    it('crea el movimiento cuando la sesión está OPEN', async () => {
      mockCashSessions.findOne.mockResolvedValue({ id: 'session-1', status: 'OPEN' });
      mockPrisma.cashMovement.create.mockResolvedValue({ id: 'mov-1', ...dto, createdBy: 'user-1' });

      const svc = buildService();
      const result = await svc.create(dto as any, 'user-1');

      expect(mockPrisma.cashMovement.create).toHaveBeenCalledWith({
        data: {
          cashSessionId: 'session-1',
          type: CashMovementType.INGRESO,
          concept: 'Cambio',
          amount: 50000,
          createdBy: 'user-1',
        },
      });
      expect(result).toEqual({ id: 'mov-1', ...dto, createdBy: 'user-1' });
    });

    it('rechaza si la sesión está CLOSED', async () => {
      mockCashSessions.findOne.mockResolvedValue({ id: 'session-1', status: 'CLOSED' });
      const svc = buildService();

      await expect(svc.create(dto as any, 'user-1')).rejects.toThrow(BadRequestException);
      expect(mockPrisma.cashMovement.create).not.toHaveBeenCalled();
    });

    it('rechaza si la sesión no existe', async () => {
      mockCashSessions.findOne.mockRejectedValue(new NotFoundException('Sesión de caja no encontrada'));
      const svc = buildService();

      await expect(svc.create(dto as any, 'user-1')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.cashMovement.create).not.toHaveBeenCalled();
    });
  });
});
