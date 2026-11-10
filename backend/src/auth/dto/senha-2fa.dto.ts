// Valida a confirmação de senha nas configurações do segundo fator.
import { IsNotEmpty, IsString } from 'class-validator';

export class SenhaDoisFatoresDto {
  @IsString()
  @IsNotEmpty({
    message: 'Informe sua senha.',
  })
  senha!: string;
}
