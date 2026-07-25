import { Module } from '@nestjs/common';
import { CallsController } from './calls.controller';
import { CallsService } from './calls.service';
import { CallsGateway } from './calls.gateway';
import { AgentApiKeyGuard } from './guards/agent-api-key.guard';
import { CustomersModule } from '../customers/customers.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    CustomersModule, // reutiliza CustomersService.findByPhoneDigits (matching de caller ID)
    AuthModule, // expone JwtModule/JwtService (mismo secret que la API HTTP) para el gateway
  ],
  controllers: [CallsController],
  providers: [CallsService, CallsGateway, AgentApiKeyGuard],
  exports: [CallsService],
})
export class CallsModule {}
