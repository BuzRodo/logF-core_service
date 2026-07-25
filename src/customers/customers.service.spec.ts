import { ConflictException } from '@nestjs/common';
import { CustomersService } from './customers.service';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPrisma = {
  customer: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  $queryRaw: jest.fn(),
} as any;

function buildService() {
  return new CustomersService(mockPrisma);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CustomersService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('crea el cliente si el teléfono no está en uso', async () => {
      const svc = buildService();
      mockPrisma.customer.findUnique.mockResolvedValue(null);
      mockPrisma.customer.create.mockResolvedValue({
        id: 'cust-1',
        phone: '099111222',
        name: 'Juan Pérez',
      });

      const dto = { phone: '099111222', name: 'Juan Pérez' };
      const result = await svc.create(dto as any);

      expect(result.id).toBe('cust-1');
      expect(mockPrisma.customer.create).toHaveBeenCalledWith({ data: dto });
    });

    it('rechaza teléfono duplicado con ConflictException', async () => {
      const svc = buildService();
      mockPrisma.customer.findUnique.mockResolvedValue({
        id: 'cust-existente',
        phone: '099111222',
      });

      const dto = { phone: '099111222', name: 'Juan Pérez' };
      await expect(svc.create(dto as any)).rejects.toThrow(ConflictException);
      expect(mockPrisma.customer.create).not.toHaveBeenCalled();
    });
  });

  describe('search', () => {
    it('devuelve null si no existe un cliente con ese teléfono', async () => {
      const svc = buildService();
      mockPrisma.customer.findFirst.mockResolvedValue(null);

      const result = await svc.search('000000000');

      expect(result).toBeNull();
      expect(mockPrisma.customer.findFirst).toHaveBeenCalledWith({ where: { phone: '000000000' } });
    });

    it('devuelve el cliente si existe', async () => {
      const svc = buildService();
      const customer = { id: 'cust-1', phone: '099111222', name: 'Juan Pérez' };
      mockPrisma.customer.findFirst.mockResolvedValue(customer);

      const result = await svc.search('099111222');

      expect(result).toEqual(customer);
    });
  });

  describe('findByPhoneDigits', () => {
    it('normaliza el teléfono buscado y consulta por dígitos', async () => {
      const svc = buildService();
      const customer = { id: 'cust-1', phone: '099 111 222', name: 'Juan Pérez' };
      mockPrisma.$queryRaw.mockResolvedValue([customer]);

      const result = await svc.findByPhoneDigits('099 111 222');

      expect(result).toEqual(customer);
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
      // El valor normalizado ('099111222') debe llegar como uno de los parámetros del tagged template
      const callArgs = mockPrisma.$queryRaw.mock.calls[0];
      expect(callArgs).toContain('099111222');
    });

    it('devuelve null si no hay match', async () => {
      const svc = buildService();
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await svc.findByPhoneDigits('000000000');

      expect(result).toBeNull();
    });

    it('devuelve null sin consultar si el teléfono normalizado queda vacío', async () => {
      const svc = buildService();

      const result = await svc.findByPhoneDigits('abc');

      expect(result).toBeNull();
      expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
    });
  });
});
