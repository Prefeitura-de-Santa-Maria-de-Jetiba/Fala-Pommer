import { Type } from "class-transformer";
import {
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min
} from "class-validator";

export class CriarAvaliacaoDto {
    @Type(() => Number)
    @IsNotEmpty()
    @IsInt()
    @Min(1)
    @Max(5)
    nota!: number;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    descricao?: string;
}
