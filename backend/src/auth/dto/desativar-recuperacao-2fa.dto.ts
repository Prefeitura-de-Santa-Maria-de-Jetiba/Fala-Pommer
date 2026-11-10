// Valida a senha e o código de recuperação usados para desativar o segundo fator.
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class DesativarComCodigoRecuperacaoDto {
  @IsString()
  @IsNotEmpty({
    message: 'Informe sua senha.',
  })
  senha!: string;

  @IsString()
  @Matches(/^[A-HJ-KM-NP-Z2-9]{4}-[A-HJ-KM-NP-Z2-9]{4}$/i, {
    message: 'Código de recuperação inválido.',
  })
  codigoRecuperacao!: string;
}
