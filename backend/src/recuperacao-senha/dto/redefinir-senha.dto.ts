// Valida os dados usados para definir uma nova senha.
import {
    IsNotEmpty,
    IsString,
    MinLength
} from "class-validator";

export class RedefinirSenhaDto {
    @IsString()
    @IsNotEmpty({
        message: "Token não informado."
    })
    token!: string;

    @IsString()
    @MinLength(8, {
        message: "A nova senha deve possuir pelo menos 8 caracteres."
    })
    novaSenha!: string;

    @IsString()
    @MinLength(8, {
        message: "A confirmação deve possuir pelo menos 8 caracteres."
    })
    confirmarNovaSenha!: string;
}
