// Valida os dados usados para atualizar um usuário.
import {
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class AtualizarUsuarioDto {
  @IsString()
  @IsNotEmpty()
  telefone!: string;

  @IsEmail()
  email!: string;

  @IsIn(["user", "admin", "funcionario", "superAdmin"])
  tipo_usuario!: "user" | "admin" | "funcionario" | "superAdmin";

  @IsOptional()
  @IsInt()
  @Min(1)
  setor_id?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  secretaria_id?: number | null;
}
