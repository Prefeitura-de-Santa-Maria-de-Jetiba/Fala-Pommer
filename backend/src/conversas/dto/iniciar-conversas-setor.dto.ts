// Valida os dados usados para iniciar uma conversa com um setor.
import { Type } from "class-transformer";
import { IsInt, Min } from "class-validator";

export class IniciarConversaSetorDto {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    setorId!: number;
}
