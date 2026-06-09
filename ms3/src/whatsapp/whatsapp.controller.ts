import { Body, Controller, Get, Headers, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { EnviarWhatsappDto } from './dto';
import { WhatsappService } from './whatsapp.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';

type RawBodyRequest = Request & { rawBody?: Buffer };

@Controller(['api/whatsapp', 'whatsapp'])
export class WhatsappController {
  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly notificacionesService: NotificacionesService,
  ) {}

  @Get('webhook')
  verificar(
    @Query('hub.mode') mode?: string,
    @Query('hub.verify_token') token?: string,
    @Query('hub.challenge') challenge?: string,
  ) {
    return this.whatsappService.verificarWebhook(mode, token, challenge);
  }

  @Post('webhook')
  recibirMensaje(
    @Body() payload: any,
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Req() request: RawBodyRequest,
  ) {
    return this.whatsappService.procesarWebhook(payload, signature, request.rawBody);
  }

  @Post('enviar')
  enviar(@Body() dto: EnviarWhatsappDto) {
    return this.notificacionesService.enviarWhatsAppTexto(dto.to, dto.mensaje);
  }
}
