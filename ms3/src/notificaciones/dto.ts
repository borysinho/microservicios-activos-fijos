import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RegistrarTokenPushDto {
  @IsString()
  @IsNotEmpty()
  usuarioId!: string;

  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsOptional()
  @IsIn(['android', 'ios', 'web'])
  plataforma?: 'android' | 'ios' | 'web';
}

export class NotificacionDto {
  @IsOptional()
  @IsString()
  usuarioId?: string;

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
