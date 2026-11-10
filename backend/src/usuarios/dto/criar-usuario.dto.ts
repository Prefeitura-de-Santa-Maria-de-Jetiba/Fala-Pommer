// Valida os dados usados para criar um usuário.
import {
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";
import { IsCPF } from 'cpf-cnpj-validator/class-validator'

export class CriarUsuarioDto {
  @IsString()
  @IsNotEmpty()
  nome!: string;

  @IsDateString()
  dataNascimento!: string;

  @IsCPF()
  cpf!: string;

  @IsOptional()
  @IsString()
  numeroTelefone!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  senha!: string;

  @IsString()
  @MinLength(8)
  confirmarSenha!: string;
}
