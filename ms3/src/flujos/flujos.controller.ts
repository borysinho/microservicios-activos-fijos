import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { FlujosService } from './flujos.service';

@Controller(['api/flujos', 'flujos'])
export class FlujosController {
  constructor(private readonly flujosService: FlujosService) {}

  @Get()
  listar() {
    return this.flujosService.listar();
  }

  @Get(':id')
  obtener(@Param('id') id: string) {
    const flujo = this.flujosService.obtener(id);
    if (!flujo) {
      throw new NotFoundException(`Flujo ${id} no encontrado`);
    }
    return flujo;
  }
}
