// Valida os dados usados para enviar uma mensagem.
import { Transform } from "class-transformer";
import {
    IsInt,
    IsOptional,
    IsString,
    MaxLength,
    Min
} from "class-validator";

export class CriarMensagemDto {
    @Transform(({ value }) =>
        typeof value === "string"
        ? value.trim()
        : value
    )
    @IsOptional()
    @IsString()
    @MaxLength(4000)
    conteudo?: string;

    @Transform(({ value }) => {
        if (typeof value === "string") {
            const valor = value.trim();
            return valor === "" ? undefined : Number(valor);
        }

        return value;
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    mensagemRespondidaId?: number;
}
