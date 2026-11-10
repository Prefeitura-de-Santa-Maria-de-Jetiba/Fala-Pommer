import { IsNotEmpty, IsString } from 'class-validator';

import { CriarUsuarioDto } from './criar-usuario.dto';

export class CriarUsuarioComRecaptchaDto extends CriarUsuarioDto {
  @IsString()
  @IsNotEmpty({
    message: 'A verificação de segurança é obrigatória.',
  })
  recaptchaToken!: string;
}
