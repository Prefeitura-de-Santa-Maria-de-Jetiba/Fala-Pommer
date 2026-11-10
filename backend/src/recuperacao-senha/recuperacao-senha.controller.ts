// Define as rotas usadas para recuperar e redefinir senhas.
import {
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    Post
} from "@nestjs/common";

import { RecuperacaoSenhaService } from "./recuperacao-senha.service";
import { SolicitarRecuperacaoDto } from "./dto/solicitar-recuperacao.dto";
import { RedefinirSenhaDto } from "./dto/redefinir-senha.dto";
import { RecaptchaService } from "../recaptcha/recaptcha.service";

@Controller("recuperacao-senha")
export class RecuperacaoSenhaController {
    constructor(
        private readonly recuperacaoSenhaService: RecuperacaoSenhaService,
        private readonly recaptchaService: RecaptchaService
    ) {}

    @Post("solicitar")
    @HttpCode(HttpStatus.OK)
    async solicitarRecuperacao(
        @Body() dados: SolicitarRecuperacaoDto
    ) {
        await this.recaptchaService.validar(
            dados.recaptchaToken,
            "recuperar_senha"
        );

        return this.recuperacaoSenhaService.solicitarRecuperacao(
            dados.email
        );
    }

    @Post("redefinir")
    @HttpCode(HttpStatus.OK)
    redefinirSenha(
        @Body() dados: RedefinirSenhaDto
    ) {
        return this.recuperacaoSenhaService.redefinirSenha(dados);
    }
}
