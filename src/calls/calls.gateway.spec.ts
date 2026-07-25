import { CallsGateway } from './calls.gateway';

// ─── Mocks ────────────────────────────────────────────────────────────────────

function buildSocket(auth: Record<string, unknown> = {}) {
  return {
    id: 'socket-1',
    handshake: { auth },
    data: {} as Record<string, unknown>,
    disconnect: jest.fn(),
  } as any;
}

function buildJwtService(overrides: { verify?: jest.Mock } = {}) {
  return {
    verify: overrides.verify ?? jest.fn().mockReturnValue({ sub: 'user-1', username: 'cajero1' }),
  } as any;
}

describe('CallsGateway', () => {
  describe('handleConnection', () => {
    it('desconecta al cliente si no envía token en el handshake', () => {
      const jwt = buildJwtService();
      const gateway = new CallsGateway(jwt);
      const socket = buildSocket({}); // sin token

      gateway.handleConnection(socket);

      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(jwt.verify).not.toHaveBeenCalled();
    });

    it('desconecta al cliente si el token es inválido', () => {
      const verify = jest.fn().mockImplementation(() => {
        throw new Error('invalid token');
      });
      const jwt = buildJwtService({ verify });
      const gateway = new CallsGateway(jwt);
      const socket = buildSocket({ token: 'token-invalido' });

      gateway.handleConnection(socket);

      expect(verify).toHaveBeenCalledWith('token-invalido');
      expect(socket.disconnect).toHaveBeenCalledWith(true);
    });

    it('acepta la conexión y guarda el usuario si el token es válido', () => {
      const jwt = buildJwtService();
      const gateway = new CallsGateway(jwt);
      const socket = buildSocket({ token: 'token-valido' });

      gateway.handleConnection(socket);

      expect(socket.disconnect).not.toHaveBeenCalled();
      expect(socket.data.user).toEqual({ sub: 'user-1', username: 'cajero1' });
    });
  });

  describe('emitIncomingCall', () => {
    it('hace broadcast del evento incoming-call a todos los clientes conectados', () => {
      const gateway = new CallsGateway(buildJwtService());
      const emit = jest.fn();
      (gateway as any).server = { emit };

      const call = {
        id: 'call-1',
        phone: '099111222',
        receivedAt: new Date('2026-07-19T10:00:00Z'),
        customer: {
          id: 'cust-1',
          name: 'Juan Pérez',
          address: 'Av. Rivera 1234',
          phone: '099 111 222',
        },
      };

      gateway.emitIncomingCall(call);

      expect(emit).toHaveBeenCalledWith('incoming-call', {
        id: 'call-1',
        phone: '099111222',
        receivedAt: call.receivedAt,
        customer: {
          id: 'cust-1',
          name: 'Juan Pérez',
          address: 'Av. Rivera 1234',
          phone: '099 111 222',
        },
      });
    });

    it('emite customer: null cuando no hay cliente matcheado', () => {
      const gateway = new CallsGateway(buildJwtService());
      const emit = jest.fn();
      (gateway as any).server = { emit };

      gateway.emitIncomingCall({
        id: 'call-2',
        phone: '099999999',
        receivedAt: new Date(),
        customer: null,
      });

      expect(emit).toHaveBeenCalledWith(
        'incoming-call',
        expect.objectContaining({ customer: null }),
      );
    });
  });
});
