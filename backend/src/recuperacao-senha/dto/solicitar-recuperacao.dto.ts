// Valida o e-mail informado na solicitação de recuperação.
import { Transform } from "class-transformer";
import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class SolicitarRecuperacaoDto {
    @Transform(({ value }) =>
        typeof value === "string"
            ? value.trim().toLowerCase()
            : value
    )
    @IsString({
        message: "O e-mail precisa ser um texto."
    })
    @IsNotEmpty({
        message: "Informe seu e-mail."
    })
    @IsEmail({}, {
        message: "Informe um e-mail válido."
    })
    email!: string;

    @IsString()
    @IsNotEmpty({
        message: "A verificação de segurança é obrigatória."
    })
    recaptchaToken!: string;
}
