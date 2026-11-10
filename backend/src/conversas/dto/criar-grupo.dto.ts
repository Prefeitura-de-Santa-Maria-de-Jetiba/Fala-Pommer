import {
    ArrayMinSize,
    ArrayUnique,
    IsArray,
    IsInt,
    IsString,
    MaxLength,
    Min,
    MinLength
} from "class-validator";

export class CriarGrupoDto {
    @IsString()
    @MinLength(3)
    @MaxLength(120)
    nome!: string;

    @IsArray()
    @ArrayMinSize(2)
    @ArrayUnique()
    @IsInt({ each: true })
    @Min(1, { each: true })
    participanteIds!: number[];
}
