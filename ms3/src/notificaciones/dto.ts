import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RegistrarTokenPushDto {
  @IsString()
  @IsNotEmpty()
  usuarioId!: string;

  @IsString()
  @IsNotEmpty()
  token!: string;
}

export class NotificacionDto {
  @IsString()
  @IsNotEmpty()
  usuarioId!: string;

  @IsIn(['mantenimiento', 'alerta', 'info', 'baja'])
  tipo!: 'mantenimiento' | 'alerta' | 'info' | 'baja';

  @IsString()
  @IsNotEmpty()
  titulo!: string;

  @IsString()
  @IsNotEmpty()
  mensaje!: string;

  @IsOptional()
  @IsString()
  activoId?: string;
}

export class EnviarEmailDto {
  @IsString()
  @IsNotEmpty()
  to!: string;

  @IsString()
  @IsNotEmpty()
  subject!: string;

  @IsString()
  @IsNotEmpty()
  text!: string;
}
