// Valida um código de recuperação e o token do desafio em andamento.
import { IsString, Matches } from 'class-validator';

export class CodigoRecuperacaoDoisFatoresDto {
  @IsString()
  @Matches(/^[a-f0-9]{64}$/i, {
    message: 'Token do desafio inválido.',
  })
  token!: string;

  @IsString()
  @Matches(/^[A-HJ-KM-NP-Z2-9]{4}-[A-HJ-KM-NP-Z2-9]{4}$/i, {
    message: 'Código de recuperação inválido.',
  })
  codigoRecuperacao!: string;
}
