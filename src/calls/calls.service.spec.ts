import { BadRequestException } from '@nestjs/common';
import { CallsService } from './calls.service';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPrisma = {
  incomingCall: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
} as any;

const mockCustomersService = {
  findByPhoneDigits: jest.fn(),
} as any;

const mockGateway = {
  emitIncomingCall: jest.fn(),
} as any;

function buildService() {
  return new CallsService(mockPrisma, mockCustomersService, mockGateway);
}

describe('CallsService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('registerCall', () => {
    it('normaliza el teléfono, matchea cliente, persiste y emite el evento por websocket', async () => {
      const svc = buildService();
      const customer = {
        id: 'cust-1',
        name: 'Juan Pérez',
        address: 'Av. Rivera 1234',
        phone: '099 111 222',
      };
      mockCustomersService.findByPhoneDigits.mockResolvedValue(customer);
      const created = {
        id: 'call-1',
        phone: '099111222',
        rawPhone: '099 111 222',
        receivedAt: new Date(),
        customer,
      };
      mockPrisma.incomingCall.create.mockResolvedValue(created);

      const result = await svc.registerCall({ phone: '099 111 222' });

      expect(mockCustomersService.findByPhoneDigits).toHaveBeenCalledWith('099111222');
      expect(mockPrisma.incomingCall.create).toHaveBeenCalledWith({
        data: { phone: '099111222', rawPhone: '099 111 222', customerId: 'cust-1' },
        include: { customer: { select: { id: true, name: true, address: true, phone: true } } },
      });
      expect(mockGateway.emitIncomingCall).toHaveBeenCalledWith(created);
      expect(result).toEqual(created);
    });

    it('persiste sin customerId si no hay cliente matcheado', async () => {
      const svc = buildService();
      mockCustomersService.findByPhoneDigits.mockResolvedValue(null);
      const created = {
        id: 'call-2',
        phone: '099999999',
        rawPhone: '099999999',
        receivedAt: new Date(),
        customer: null,
      };
      mockPrisma.incomingCall.create.mockResolvedValue(created);

      await svc.registerCall({ phone: '099999999' });

      expect(mockPrisma.incomingCall.create).toHaveBeenCalledWith({
        data: { phone: '099999999', rawPhone: '099999999' },
        include: { customer: { select: { id: true, name: true, address: true, phone: true } } },
      });
    });

    it('rechaza teléfono vacío', async () => {
      const svc = buildService();
      await expect(svc.registerCall({ phone: '' })).rejects.toThrow(BadRequestException);
      expect(mockPrisma.incomingCall.create).not.toHaveBeenCalled();
    });

    it('rechaza teléfono sin dígitos (no numérico)', async () => {
      const svc = buildService();
      await expect(svc.registerCall({ phone: 'abc-def' })).rejects.toThrow(BadRequestException);
      expect(mockPrisma.incomingCall.create).not.toHaveBeenCalled();
    });

    it('rechaza teléfono con menos de 6 dígitos', async () => {
      const svc = buildService();
      await expect(svc.registerCall({ phone: '123' })).rejects.toThrow(BadRequestException);
    });

    it('rechaza teléfono con más de 15 dígitos', async () => {
      const svc = buildService();
      await expect(svc.registerCall({ phone: '1'.repeat(16) })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('acepta y normaliza un teléfono con formato (espacios, guiones, +)', async () => {
      const svc = buildService();
      mockCustomersService.findByPhoneDigits.mockResolvedValue(null);
      mockPrisma.incomingCall.create.mockResolvedValue({
        id: 'call-3',
        phone: '59899111222',
        customer: null,
      });

      await svc.registerCall({ phone: '+598 99-111 222' });

      expect(mockCustomersService.findByPhoneDigits).toHaveBeenCalledWith('59899111222');
    });
  });

  describe('findRecent', () => {
    it('devuelve las últimas llamadas ordenadas por receivedAt desc con el límite pedido', async () => {
      const svc = buildService();
      mockPrisma.incomingCall.findMany.mockResolvedValue([]);

      await svc.findRecent(10);

      expect(mockPrisma.incomingCall.findMany).toHaveBeenCalledWith({
        take: 10,
        orderBy: { receivedAt: 'desc' },
        include: { customer: { select: { id: true, name: true, address: true, phone: true } } },
      });
    });
  });
});
