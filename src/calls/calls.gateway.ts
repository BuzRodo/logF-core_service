import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

/** Mismo origen que habilita el resto de la API HTTP (ver main.ts). */
const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173,http://localhost:5174';

export interface IncomingCallCustomerSummary {
  id: string;
  name: string;
  address: string | null;
  phone: string;
}

export interface IncomingCallPayload {
  id: string;
  phone: string;
  receivedAt: Date;
  customer: IncomingCallCustomerSummary | null;
}

/**
 * Gateway websocket del módulo de llamadas entrantes (caller ID).
 * Namespace por defecto, mismo path que usa socket.io-client en la UI (/socket.io).
 * El handshake se autentica con el JWT del proyecto (mismo secret que la API HTTP);
 * si el token falta o es inválido, se desconecta al cliente.
 */
@WebSocketGateway({
  path: '/socket.io',
  cors: {
    origin: corsOrigin.split(',').map((s) => s.trim()),
    credentials: true,
  },
})
export class CallsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(CallsGateway.name);

  constructor(private readonly jwt: JwtService) {}

  handleConnection(client: Socket) {
    const token = client.handshake.auth?.token as string | undefined;

    if (!token) {
      this.logger.warn(`Conexión rechazada (sin token): ${client.id}`);
      client.disconnect(true);
      return;
    }

    try {
      const payload = this.jwt.verify(token);
      client.data.user = payload;
      this.logger.log(
        `Cliente conectado: ${client.id} (usuario: ${payload?.username ?? payload?.sub ?? 'desconocido'})`,
      );
    } catch {
      this.logger.warn(`Conexión rechazada (token inválido): ${client.id}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Cliente desconectado: ${client.id}`);
  }

  /** Emite `incoming-call` a todos los clientes conectados (broadcast). */
  emitIncomingCall(call: {
    id: string;
    phone: string;
    receivedAt: Date;
    customer: IncomingCallCustomerSummary | null;
  }) {
    const payload: IncomingCallPayload = {
      id: call.id,
      phone: call.phone,
      receivedAt: call.receivedAt,
      customer: call.customer
        ? {
            id: call.customer.id,
            name: call.customer.name,
            address: call.customer.address,
            phone: call.customer.phone,
          }
        : null,
    };
    this.server.emit('incoming-call', payload);
    this.logger.log(`Evento incoming-call emitido para ${payload.phone}`);
  }
}
