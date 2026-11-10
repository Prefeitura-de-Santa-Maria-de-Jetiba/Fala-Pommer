import { Transform } from "class-transformer";
import { IsBoolean, IsEnum, IsNotEmpty, IsString, MaxLength } from "class-validator";

export enum Categorias {
    GERAL = 'geral',
    SAUDE = 'saude',
    LAZER = 'lazer',
    ESPORTES = 'esportes',
    EDUCACAO = 'educacao',
    MEIO_AMBIENTE = 'meio_ambiente',
    SEGURANCA = 'seguranca',
    OBRAS = 'obras'
}

export class CriarComunidadeDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(150)
    nome_comunidade!: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(400)
    descricao_comunidade!: string;

    @Transform(({ value }) => {
        const valor = value as unknown;

        if (valor === true || valor === "true") return true;
        if (valor === false || valor === "false" || valor === undefined) {
            return false;
        }

        return valor;
    })
    @IsBoolean()
    ocultar_municipes: boolean = false;
    

    @IsEnum(Categorias)
    @IsNotEmpty({ message: 'A categoria é obrigatória e não pode ser vazia' })
    categorias!: Categorias;
}
