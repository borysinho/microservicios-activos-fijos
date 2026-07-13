import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { EnviarEmailDto, NotificacionDto, RegistrarTokenPushDto } from './dto';
import { NotificacionesService } from './notificaciones.service';

@Controller(['api/notificaciones', 'notificaciones'])
export class NotificacionesController {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  @Post('registrar-token')
  registrarToken(@Body() dto: RegistrarTokenPushDto) {
    this.notificacionesService.registrarToken(dto.usuarioId, dto.token);
    return { registrado: true };
  }

  @Post()
  crear(@Body() dto: NotificacionDto) {
    return this.notificacionesService.guardarNotificacion(dto);
  }

  @Post('email')
  enviarEmail(@Body() dto: Partial<EnviarEmailDto>, @Query() query: Partial<EnviarEmailDto>) {
    return this.notificacionesService.enviarEmail((query.to ? query : dto) as EnviarEmailDto);
  }

  @Get()
  listar(@Query('usuarioId') usuarioId: string) {
    return this.notificacionesService.listarNotificaciones(usuarioId);
  }

  @Patch(':id/leida')
  marcarLeida(@Param('id') id: string, @Query('usuarioId') usuarioId: string) {
    const notificacion = this.notificacionesService.marcarLeida(usuarioId, id);
    return { actualizada: !!notificacion, notificacion };
  }
}
