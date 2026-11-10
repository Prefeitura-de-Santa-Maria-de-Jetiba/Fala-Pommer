// Valida os dados usados para criar ou atualizar uma secretaria.
import {
    IsString,
    IsNotEmpty,
} from "class-validator";

export class CriarsecretariaDTO {
    @IsString()
    @IsNotEmpty()
    secretaria!: string;

    @IsString()
    @IsNotEmpty()
    sigla_secretaria!: string;
}