import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class EnviarWhatsappDto {
  @IsString()
  @IsNotEmpty()
  to!: string;

  @IsString()
  @IsNotEmpty()
  mensaje!: string;
}

export type WhatsappMensajeEntrante = {
  from: string;
  text: string;
  timestamp?: string;
};

export type ResultadoSolicitudRevision = {
  recibido: boolean;
  codigoActivo?: string;
  ticketId?: string;
  documentosEncontrados?: number;
  intencion?: string;
  mensaje: string;
};
