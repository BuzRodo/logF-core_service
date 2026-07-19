import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CustomersService } from '../customers/customers.service';
import { CallsGateway } from './calls.gateway';
import { CreateIncomingCallDto } from './dto/incoming-call.dto';
import { normalizePhoneDigits, isValidPhoneDigits } from '../common/utils/phone.util';

/** Selección de cliente que viaja tanto en la respuesta HTTP como en el evento websocket. */
const CUSTOMER_SUMMARY_SELECT = { id: true, name: true, address: true, phone: true } as const;

@Injectable()
export class CallsService {
  private readonly logger = new Logger(CallsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly customersService: CustomersService,
    private readonly gateway: CallsGateway,
  ) {}

  /**
   * Registra una llamada entrante: normaliza el teléfono, intenta matchear un cliente
   * existente (reutilizando `CustomersService.findByPhoneDigits`, sin duplicar lógica),
   * persiste el registro y notifica a los clientes conectados por websocket.
   */
  async registerCall(dto: CreateIncomingCallDto) {
    const digits = normalizePhoneDigits(dto.phone);
    if (!isValidPhoneDigits(digits)) {
      throw new BadRequestException('El teléfono debe tener entre 6 y 15 dígitos');
    }

    const customer = await this.customersService.findByPhoneDigits(digits);

    const call = await this.prisma.incomingCall.create({
      data: {
        phone: digits,
        rawPhone: dto.phone,
        ...(customer && { customerId: customer.id }),
      },
      include: { customer: { select: CUSTOMER_SUMMARY_SELECT } },
    });

    this.logger.log(
      `Llamada entrante registrada: ${digits}${customer ? ` (cliente: ${customer.name})` : ' (sin cliente)'}`,
    );
    this.gateway.emitIncomingCall(call);

    return call;
  }

  /** Últimas `limit` llamadas, con el cliente matcheado incluido. */
  findRecent(limit: number) {
    return this.prisma.incomingCall.findMany({
      take: limit,
      orderBy: { receivedAt: 'desc' },
      include: { customer: { select: CUSTOMER_SUMMARY_SELECT } },
    });
  }
}
