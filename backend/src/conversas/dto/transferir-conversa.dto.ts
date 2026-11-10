import { Transform, Type } from "class-transformer";
import {
    IsInt,
    IsNotEmpty,
    IsString,
    MaxLength,
    Min,
    MinLength
} from "class-validator";

export class TransferirConversaDto {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    setorDestinoId!: number;

    @Transform(({ value }) => //impede que seja enviado somente espaços
        typeof value === "string"
            ? value.trim()
            : value
    )
    @IsString()
    @IsNotEmpty()
    @MinLength(10)
    @MaxLength(500)
    motivo!: string;
}