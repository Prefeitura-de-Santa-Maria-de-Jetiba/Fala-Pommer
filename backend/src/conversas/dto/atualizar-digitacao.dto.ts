// Valida o estado de digitação enviado pela conversa.
import { IsBoolean } from "class-validator";

export class AtualizarDigitacaoDto {
    @IsBoolean()
    digitando: boolean;
}
