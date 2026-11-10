// Valida o reenvio de um desafio de configuração do segundo fator.
import { IsIn, IsString, Matches } from 'class-validator';

import type { desafio_2fa_finalidade } from '../../generated/prisma/enums';

export class ReenviarDoisFatoresDto {
  @IsString()
  @Matches(/^[a-f0-9]{64}$/i, {
    message: 'Token do desafio inválido.',
  })
  token!: string;

  @IsIn(['ativacao', 'desativacao'], {
    message: 'Finalidade do desafio inválida.',
  })
  finalidade!: desafio_2fa_finalidade;
}
