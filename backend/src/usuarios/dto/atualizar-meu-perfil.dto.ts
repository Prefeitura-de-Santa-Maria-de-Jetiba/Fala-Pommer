// Valida os dados usados para atualizar o próprio perfil.
import {
  IsEmail,
  IsNotEmpty,
  IsString,
} from "class-validator";

export class AtualizarMeuPerfilDto {
  @IsString()
  @IsNotEmpty()
  nome!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  telefone!: string;
}
