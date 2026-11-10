// Valida um código e o token do desafio de verificação em duas etapas.
import { IsString, Matches } from 'class-validator';

export class CodigoDoisFatoresDto {
  @IsString()
  @Matches(/^[a-f0-9]{64}$/i, {
    message: 'Token do desafio inválido.',
  })
  token!: string;

  @IsString()
  @Matches(/^\d{6}$/, {
    message: 'Informe um código com 6 dígitos.',
  })
  codigo!: string;
}
