import {
    ArrayMinSize,
    ArrayUnique,
    IsArray,
    IsInt,
    Min
} from "class-validator";

export class AdicionarParticipantesGrupoDto {
    @IsArray()
    @ArrayMinSize(1)
    @ArrayUnique()
    @IsInt({ each: true })
    @Min(1, { each: true })
    participanteIds!: number[];
}
