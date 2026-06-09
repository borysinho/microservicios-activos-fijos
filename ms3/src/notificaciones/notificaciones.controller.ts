import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { NotificacionDto, RegistrarTokenPushDto } from './dto';
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

  @Get()
  listar(@Query('usuarioId') usuarioId: string) {
    return this.notificacionesService.listarNotificaciones(usuarioId);
  }
}
