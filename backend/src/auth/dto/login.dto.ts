// Valida os dados enviados no login.
import { Transform } from "class-transformer";
import {
    IsEmail,
    IsNotEmpty,
    IsString
} from "class-validator";

export class LoginDto {
    @Transform(({ value }) =>
        typeof value === "string"
            ? value.trim().toLowerCase()
            : value
    )
    @IsString()
    @IsNotEmpty({
        message: "Informe seu e-mail."
    })
    @IsEmail({}, {
        message: "Informe um e-mail válido."
    })
    email!: string;

    @IsString()
    @IsNotEmpty({
        message: "Informe sua senha."
    })
    senha!: string;

    @IsString()
    @IsNotEmpty({
        message: "A verificação de segurança é obrigatória."
    })
    recaptchaToken!: string;
}
