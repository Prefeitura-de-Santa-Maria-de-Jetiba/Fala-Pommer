import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class AtualizarDadosComunidade {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(150)
    nome_comunidade!: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(400)
    descricao_comunidade!: string;
}