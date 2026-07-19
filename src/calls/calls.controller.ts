import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { CallsService } from './calls.service';
import { CreateIncomingCallDto, ListIncomingCallsQueryDto } from './dto/incoming-call.dto';
import { AgentApiKeyGuard } from './guards/agent-api-key.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Llamadas entrantes (Caller ID)')
@Controller('api/incoming-calls')
export class CallsController {
  constructor(private readonly svc: CallsService) {}

  @Post()
  @UseGuards(AgentApiKeyGuard)
  @ApiSecurity('agent-key')
  @ApiOperation({
    summary: 'Registra una llamada entrante',
    description:
      'Lo invoca el capturador local (o el simulador de dev), autenticado con el header X-Agent-Key. No requiere JWT.',
  })
  create(@Body() dto: CreateIncomingCallDto) {
    return this.svc.registerCall(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Últimas llamadas entrantes (para el panel del POS)' })
  findRecent(@Query() query: ListIncomingCallsQueryDto) {
    return this.svc.findRecent(query.limit ?? 20);
  }
}
