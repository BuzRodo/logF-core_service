import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Catálogo POS')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/catalog')
export class CatalogController {
  constructor(private svc: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Catálogo de productos activos para el POS (cajero)' })
  getCatalog() {
    return this.svc.getCatalog();
  }
}
