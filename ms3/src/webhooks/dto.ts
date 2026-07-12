import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class EventoActivoDto {
  @IsOptional()
  @IsIn(['ASIGNACION', 'TRASLADO', 'BAJA', 'MANTENIMIENTO', 'GARANTIA'])
  tipoEvento?: string;

  @IsOptional()
  @IsIn(['ASIGNACION', 'TRASLADO', 'BAJA', 'MANTENIMIENTO', 'GARANTIA'])
  tipo?: string;

  @IsUUID()
  activoId!: string;

  @IsOptional()
  @IsString()
  codigoActivo?: string;

  @IsOptional()
  @IsEmail()
  responsableEmail?: string;

  @IsOptional()
  @IsString()
  responsablePhone?: string;
}

export class VencimientoGarantiaDto {
  @IsUUID()
  activoId!: string;

  @IsString()
  @IsNotEmpty()
  codigo!: string;

  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsString()
  @IsNotEmpty()
  fechaVencimientoGarantia!: string;

  @IsEmail()
  responsableEmail!: string;

  @IsOptional()
  @IsString()
  responsablePhone?: string;

  @IsOptional()
  @IsString()
  responsableUsuarioId?: string;
}

export class MantenimientoProgramadoDto {
  @IsUUID()
  activoId!: string;

  @IsString()
  @IsNotEmpty()
  codigo!: string;

  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsString()
  @IsNotEmpty()
  fechaMantenimiento!: string;

  @IsEmail()
  responsableEmail!: string;

  @IsString()
  @IsNotEmpty()
  responsablePhone!: string;

  @IsOptional()
  @IsString()
  responsableUsuarioId?: string;
}

export class DiagnosticoCriticoDto {
  @IsUUID()
  activoId!: string;

  @IsString()
  @IsNotEmpty()
  codigo!: string;

  @IsString()
  @IsNotEmpty()
  estadoDiagnostico!: string;

  @IsString()
  @IsNotEmpty()
  confianza!: string;

  @IsOptional()
  @IsEmail()
  responsableEmail?: string;
}

export class ReportarProblemaDto {
  @IsUUID()
  activoId!: string;

  @IsString()
  @IsNotEmpty()
  activoCodigo!: string;

  @IsString()
  @IsNotEmpty()
  descripcion!: string;

  @IsOptional()
  @IsString()
  origen?: string;

  @IsOptional()
  latitud?: number;

  @IsOptional()
  longitud?: number;
}
