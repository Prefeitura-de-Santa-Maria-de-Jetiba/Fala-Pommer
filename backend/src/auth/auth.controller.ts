// Define as rotas usadas para autenticar os usuários.
import {
    Body,
    Controller,
    BadRequestException,
    HttpCode,
    HttpStatus,
    Post,
    Get,
    Req,
    Res,
    Query,
    UnauthorizedException,
    UseGuards
} from "@nestjs/common";
import type { Request, Response } from "express";

import { AuthGuard } from "./auth.guard";

import type {
    RequisicaoAutenticada
} from "./auth.guard";

import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { Perfis } from "./decorators/perfis.decorator";
import { PerfisGuard } from "./guards/perfis.guard";
import { TwoFactorEmailService } from "./two-factor-email.service";
import { SenhaDoisFatoresDto } from "./dto/senha-2fa.dto";
import { CodigoDoisFatoresDto } from "./dto/codigo-2fa.dto";
import { GoogleLoginDto } from "./dto/google-login-dto";
import { ReenviarDoisFatoresDto } from "./dto/reenviar-2fa.dto";
import { CodigoRecuperacaoDoisFatoresDto } from "./dto/codigo-recuperacao-2fa.dto";
import { TokenDesafioDoisFatoresDto } from "./dto/token-desafio-2fa.dto";
import { DesativarComCodigoRecuperacaoDto } from "./dto/desativar-recuperacao-2fa.dto";
import { RenovarSessaoDto } from "./dto/renovar-sessao.dto";
import { ConcluirCadastroGoogleDto } from "./dto/concluir-cadastro-google.dto";
import { RecaptchaService } from "../recaptcha/recaptcha.service";

const COOKIE_REFRESH_TOKEN = "fala_pommer_refresh_token";
const DURACAO_COOKIE_REFRESH_MS = 400 * 24 * 60 * 60 * 1000;
const CABECALHO_CLIENTE = "x-fala-pommer-cliente";
const CLIENTE_CAPACITOR = "capacitor";

@Controller("auth")
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly twoFactorEmailService: TwoFactorEmailService,
        private readonly recaptchaService: RecaptchaService
    ) {}

    @Post("2fa/login/confirm")
    @HttpCode(HttpStatus.OK)
    async confirmarLoginDoisFatores(
        @Body() dados: CodigoDoisFatoresDto,
        @Req() requisicao: Request,
        @Res({ passthrough: true }) resposta: Response
    ) {
        const resultado = await this.authService.confirmarLoginDoisFatores(
            dados.token,
            dados.codigo
        );

        return this.entregarAutenticacao(resultado, requisicao, resposta);
    }

    @Post("2fa/login/recovery")
    @HttpCode(HttpStatus.OK)
    async confirmarLoginComCodigoRecuperacao(
        @Body() dados: CodigoRecuperacaoDoisFatoresDto,
        @Req() requisicao: Request,
        @Res({ passthrough: true }) resposta: Response
    ) {
        const resultado =
            await this.authService.confirmarLoginComCodigoRecuperacao(
            dados.token,
            dados.codigoRecuperacao
        );

        return this.entregarAutenticacao(resultado, requisicao, resposta);
    }

    @Post("2fa/login/resend")
    @HttpCode(HttpStatus.OK)
    reenviarCodigoLoginDoisFatores(
        @Body() dados: TokenDesafioDoisFatoresDto
    ) {
        return this.twoFactorEmailService.reenviarCodigoLogin(
            dados.token
        );
    }

    @Get("2fa/status")
    @UseGuards(AuthGuard)
    statusDoisFatores(
        @Req() requisicao: RequisicaoAutenticada
    ) {
        return this.twoFactorEmailService.obterStatus(
            requisicao.usuario!.sub
        );
    }

    @Post("2fa/setup")
    @HttpCode(HttpStatus.OK)
    @UseGuards(AuthGuard)
    configurarDoisFatores(
        @Req() requisicao: RequisicaoAutenticada,
        @Body() dados: SenhaDoisFatoresDto
    ) {
        return this.twoFactorEmailService.iniciarAtivacao(
            requisicao.usuario!.sub,
            dados.senha
        );
    }

    @Post("2fa/confirm")
    @HttpCode(HttpStatus.OK)
    @UseGuards(AuthGuard)
    confirmarDoisFatores(
        @Req() requisicao: RequisicaoAutenticada,
        @Body() dados: CodigoDoisFatoresDto
    ) {
        return this.twoFactorEmailService.confirmarAtivacao(
            requisicao.usuario!.sub,
            dados.token,
            dados.codigo
        );
    }

    @Post("2fa/disable/request")
    @HttpCode(HttpStatus.OK)
    @UseGuards(AuthGuard)
    solicitarDesativacaoDoisFatores(
        @Req() requisicao: RequisicaoAutenticada,
        @Body() dados: SenhaDoisFatoresDto
    ) {
        return this.twoFactorEmailService.solicitarDesativacao(
            requisicao.usuario!.sub,
            dados.senha
        );
    }

    @Post("2fa/disable")
    @HttpCode(HttpStatus.OK)
    @UseGuards(AuthGuard)
    desativarDoisFatores(
        @Req() requisicao: RequisicaoAutenticada,
        @Body() dados: CodigoDoisFatoresDto
    ) {
        return this.twoFactorEmailService.confirmarDesativacao(
            requisicao.usuario!.sub,
            dados.token,
            dados.codigo
        );
    }

    @Post("2fa/disable/recovery")
    @HttpCode(HttpStatus.OK)
    @UseGuards(AuthGuard)
    desativarDoisFatoresComCodigoRecuperacao(
        @Req() requisicao: RequisicaoAutenticada,
        @Body() dados: DesativarComCodigoRecuperacaoDto
    ) {
        return this.twoFactorEmailService.confirmarDesativacaoComCodigoRecuperacao(
            requisicao.usuario!.sub,
            dados.senha,
            dados.codigoRecuperacao
        );
    }

    @Post("2fa/resend")
    @HttpCode(HttpStatus.OK)
    @UseGuards(AuthGuard)
    reenviarCodigoDoisFatores(
        @Req() requisicao: RequisicaoAutenticada,
        @Body() dados: ReenviarDoisFatoresDto
    ) {
        return this.twoFactorEmailService.reenviarCodigoConfiguracao(
            requisicao.usuario!.sub,
            dados.token,
            dados.finalidade
        );
    }

    @Get("perfil")
    @UseGuards(AuthGuard)
    perfil(
        @Req() requisicao: RequisicaoAutenticada
    ) {
        return requisicao.usuario;
    }

    @Get("area-administrativa")
    @UseGuards(AuthGuard, PerfisGuard)
    @Perfis("superAdmin")
    areaAdministrativa() {
        return {
            mensagem: "Bem-vindo à área administrativa."
        };
    }

    @Get("area-prefeitura")
    @UseGuards(AuthGuard, PerfisGuard)
    @Perfis("admin", "funcionario", "superAdmin")
    areaPrefeitura() {
        return{
            mensagem: "Bem-vindo à área da prefeitura"
        };
    }

    @Get("logins-por-mes")
    @UseGuards(AuthGuard, PerfisGuard)
    @Perfis("admin", "funcionario", "superAdmin")
    loginsPorMes(@Query("ano") ano?: string) {
        const anoAtual = Number(
            new Intl.DateTimeFormat("pt-BR", {
                timeZone: "America/Sao_Paulo",
                year: "numeric"
            }).format(new Date())
        );
        const anoInformado = ano === undefined
            ? anoAtual
            : Number(ano);

        if (
            !Number.isInteger(anoInformado) ||
            anoInformado < 2000 ||
            anoInformado > anoAtual + 1
        ) {
            throw new BadRequestException("Ano inválido.");
        }

        return this.authService.obterLoginsPorMes(anoInformado);
    }

    @Get("quantidade-usuarios")
    @UseGuards(AuthGuard, PerfisGuard)
    @Perfis("admin", "funcionario", "superAdmin")
    obterQuantUsuarios() {
        return this.authService.obterQuantUsuarios();
    }

    @Get("quantidade-usuarios-categoria")
    @UseGuards(AuthGuard, PerfisGuard)
    @Perfis("admin", "funcionario", "superAdmin")
    obterQuantUsuarioCategoria() {
        return this.authService.obterQuantUsuarioCategoria();
    }

    @Get("relatorios-logs")
    @UseGuards(AuthGuard, PerfisGuard)
    @Perfis("admin", "funcionario", "superAdmin")
    obterRelatoriosLogs() {
        return this.authService.obterRelatoriosLogs();
    }

    @Get("relatorios-erros")
    @UseGuards(AuthGuard, PerfisGuard)
    @Perfis("superAdmin")
    obterRelatoriosErros() {
        return this.authService.obterRelatoriosErros();
    }

    @Post("logout")
    @HttpCode(HttpStatus.OK)
    @UseGuards(AuthGuard)
    logout(
        @Req() requisicao: RequisicaoAutenticada,
        @Res({ passthrough: true }) resposta: Response
    ) {
        this.removerCookieRefresh(resposta);

        return this.authService.registrarSaida(
            requisicao.usuario!.sub,
            requisicao.usuario!.sid
        );
    }

    @Post("refresh")
    @HttpCode(HttpStatus.OK)
    async renovarSessao(
        @Body() dados: RenovarSessaoDto,
        @Req() requisicao: Request,
        @Res({ passthrough: true }) resposta: Response
    ) {
        const clienteCapacitor = this.ehClienteCapacitor(requisicao);
        const refreshToken = clienteCapacitor
            ? dados.refreshToken
            : this.extrairCookieRefresh(requisicao);

        if (!refreshToken) {
            this.removerCookieRefresh(resposta);
            throw new UnauthorizedException(
                "Refresh token não informado."
            );
        }

        try {
            const resultado =
                await this.authService.renovarSessao(refreshToken);

            return this.entregarAutenticacao(
                resultado,
                requisicao,
                resposta
            );
        } catch (erro) {
            this.removerCookieRefresh(resposta);
            throw erro;
        }
    }

    @Get("area-municipe")
    @UseGuards(AuthGuard, PerfisGuard)
    @Perfis("user")
    areaMunicipe() {
        return {
            mensagem: "Bem-vindo à área do municipe"
        }
    }

    @Post("login")
    @HttpCode(HttpStatus.OK)
    async login(
        @Body() dados: LoginDto,
        @Req() requisicao: Request,
        @Res({ passthrough: true }) resposta: Response
    ) {
        await this.recaptchaService.validar(
            dados.recaptchaToken,
            "login"
        );

        const resultado = await this.authService.signIn(
            dados.email,
            dados.senha
        );

        return this.entregarAutenticacao(resultado, requisicao, resposta);
    }

    private entregarAutenticacao<T extends object>(
        resultado: T,
        requisicao: Request,
        resposta: Response
    ) {
        // O APK recebe o token para guardá-lo no Keystore; a web recebe cookie.
        const refreshToken =
            "refresh_token" in resultado &&
            typeof resultado.refresh_token === "string"
                ? resultado.refresh_token
                : undefined;

        if (
            !refreshToken ||
            this.ehClienteCapacitor(requisicao)
        ) {
            return resultado;
        }

        this.definirCookieRefresh(resposta, refreshToken);

        const resultadoSemRefresh = {
            ...resultado
        } as T & { refresh_token?: string };
        delete resultadoSemRefresh.refresh_token;

        return resultadoSemRefresh;
    }

    private ehClienteCapacitor(requisicao: Request) {
        return requisicao.headers[CABECALHO_CLIENTE] === CLIENTE_CAPACITOR;
    }

    private extrairCookieRefresh(requisicao: Request) {
        // Lê somente o cookie de sessão sem expô-lo ao JavaScript do navegador.
        const cookies = requisicao.headers.cookie?.split(";") ?? [];
        const prefixo = `${COOKIE_REFRESH_TOKEN}=`;
        const cookie = cookies
            .map((item) => item.trim())
            .find((item) => item.startsWith(prefixo));

        if (!cookie) {
            return undefined;
        }

        try {
            return decodeURIComponent(cookie.slice(prefixo.length));
        } catch {
            return undefined;
        }
    }

    private definirCookieRefresh(resposta: Response, refreshToken: string) {
        // A renovação atualiza a validade do cookie persistente e HttpOnly.
        resposta.cookie(COOKIE_REFRESH_TOKEN, refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/auth",
            maxAge: DURACAO_COOKIE_REFRESH_MS
        });
    }

    private removerCookieRefresh(resposta: Response) {
        resposta.clearCookie(COOKIE_REFRESH_TOKEN, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/auth"
        });
    }

    @Post("google")
    @HttpCode(HttpStatus.OK)
    async loginGoogle(
        @Body() dados: GoogleLoginDto,
        @Req() requisicao: Request,
        @Res({ passthrough: true }) resposta: Response
    ) {
        const resultado = await this.authService.signInGoogle(
            dados.credential
        );

        return this.entregarAutenticacao(
            resultado,
            requisicao,
            resposta
        );
    }

    @Post("google/cadastro")
    @HttpCode(HttpStatus.OK)
    async concluirCadastroGoogle(
        @Body() dados: ConcluirCadastroGoogleDto,
        @Req() requisicao: Request,
        @Res({ passthrough: true }) resposta: Response
    ) {
        const resultado = await this.authService.concluirCadastroGoogle(dados);

        return this.entregarAutenticacao(
            resultado,
            requisicao,
            resposta
        );
    }
}
