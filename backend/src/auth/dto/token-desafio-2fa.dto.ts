// Valida o token usado para reenviar um desafio de login.
import { IsString, Matches } from 'class-validator';

export class TokenDesafioDoisFatoresDto {
  @IsString()
  @Matches(/^[a-f0-9]{64}$/i, {
    message: 'Token do desafio inválido.',
  })
  token!: string;
}
