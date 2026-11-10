// Valida os dados usados para criar ou atualizar um setor.
import { Type } from "class-transformer";
import {
    IsString,
    IsNotEmpty,
    IsInt,
    IsOptional,
    Min
} from "class-validator";

export class CriarSetorDTO {
    @IsString()
    @IsNotEmpty()
    setor!: string;

    @IsString()
    @IsNotEmpty()
    sigla_setor!: string;

    @Type(() => Number)
    @IsOptional()
    @IsInt()
    @Min(1)
    secretaria_id?: number | null;
}
