import {
    Body,
    Controller,
    Delete,
    HttpCode,
    HttpStatus,
    Post,
    Req,
    UseGuards
} from "@nestjs/common";

import {
    AuthGuard,
    type RequisicaoAutenticada
} from "../auth/auth.guard";
import { RegistrarTokenPushDto } from "./dto/registrar-token-push.dto";
import { NotificacoesService } from "./notificacoes.service";

@Controller("notificacoes")
@UseGuards(AuthGuard)
export class NotificacoesController {
    constructor(
        private readonly notificacoesService: NotificacoesService
    ) {}

    @Post("tokens")
    @HttpCode(HttpStatus.NO_CONTENT)
    async registrarToken(
        @Req() requisicao: RequisicaoAutenticada,
        @Body() dados: RegistrarTokenPushDto
    ) {
        await this.notificacoesService.registrarToken(
            requisicao.usuario!.sub,
            requisicao.usuario!.sid,
            dados
        );
    }

    @Delete("tokens/sessao")
    @HttpCode(HttpStatus.NO_CONTENT)
    async removerTokensDaSessao(
        @Req() requisicao: RequisicaoAutenticada
    ) {
        await this.notificacoesService.removerTokensDaSessao(
            requisicao.usuario!.sub,
            requisicao.usuario!.sid
        );
    }
}
