// Contém as regras de autenticação dos usuários.
import {
    BadRequestException,
    Injectable,
    UnauthorizedException
} from "@nestjs/common";

import { JwtService } from "@nestjs/jwt";
import { UsuariosService } from "../usuarios/usuarios.service";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { TwoFactorEmailService } from "./two-factor-email.service";
import { createHash, randomBytes } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { ConcluirCadastroGoogleDto } from "./dto/concluir-cadastro-google.dto";
import { ClsService } from "nestjs-cls";
import { criarArquivoLogMonitorSeguranca } from "../security-log/security-log";

const NOMES_MESES = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro"
];

const googleClient = new OAuth2Client();

type CadastroGooglePayload = {
    finalidade?: string;
    google_sub?: string;
    email?: string;
    nome?: string;
    foto?: string;
};

const FORMATADOR_MES_SAO_PAULO = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    month: "numeric"
});

const DIFERENCA_UTC_SAO_PAULO_EM_MS = 3 * 60 * 60 * 1000;

function agoraEmSaoPaulo() {
    return new Date(Date.now() - DIFERENCA_UTC_SAO_PAULO_EM_MS);
}

function serializarDataDeSaoPaulo(data: Date | null) {
    if (!data) {
        return null;
    }

    return `${data.toISOString().slice(0, -1)}-03:00`;
}

@Injectable()
export class AuthService {
    constructor(
        private readonly usuariosService: UsuariosService,
        private readonly jwtService: JwtService,
        private readonly prisma: PrismaService,
        private readonly twoFactorEmailService: TwoFactorEmailService,
        private readonly cls: ClsService
    ) {}

    async signIn(email: string, senha: string) {
        const usuario =
            await this.usuariosService.buscarPorEmail(email);
            

        if (!usuario) {
            throw new UnauthorizedException(
                "E-mail inválido."
            );
        }

        const senhaCorreta = await bcrypt.compare(
            senha,
            usuario.senha
        );

        if (!senhaCorreta) {
            await this.registrarErroAutenticacao(
                usuario.id,
                "login"
            );

            criarArquivoLogMonitorSeguranca.call(
                this,
                "LOGIN_FAILED",
                "/auth/login",
                401
            );

            throw new UnauthorizedException(
                "Senha inválida."
            );
        }

        if (
            usuario.desativado_em &&
            usuario.tipo_usuario !== "user"
        ) {
            throw new UnauthorizedException(
                "Esta conta está desativada."
            );
        }

        if (usuario.dois_fatores_email_ativo) {
            const desafio =
                await this.twoFactorEmailService.iniciarLogin(
                    usuario.id
                );

            return {
                requer_segunda_etapa: true,
                ...desafio
            };
        }

        return this.concluirLogin(usuario);
    }

    async confirmarLoginDoisFatores(
        token: string,
        codigo: string
    ) {
        const desafio =
            await this.twoFactorEmailService.verificarCodigo(
                token,
                codigo,
                "login"
            );

        return this.concluirLoginAposSegundoFator(
            desafio.usuarioId
        );
    }

    async confirmarLoginComCodigoRecuperacao(
        token: string,
        codigoRecuperacao: string
    ) {
        const desafio =
            await this.twoFactorEmailService.verificarCodigoRecuperacao(
                token,
                codigoRecuperacao,
                "login"
            );

        return this.concluirLoginAposSegundoFator(
            desafio.usuarioId
        );
    }

    private async concluirLoginAposSegundoFator(
        usuarioId: number
    ) {
        const usuario = await this.prisma.cadastro.findFirst({
            where: {
                id: usuarioId,
                dois_fatores_email_ativo: true,
                OR: [
                    {
                        desativado_em: null
                    },
                    {
                        tipo_usuario: "user"
                    }
                ]
            },
            select: {
                id: true,
                nome: true,
                email: true,
                tipo_usuario: true,
                versao_token: true
            }
        });

        if (!usuario) {
            throw new UnauthorizedException(
                "Não foi possível concluir a autenticação."
            );
        }

        return this.concluirLogin(usuario);
    }

    private async concluirLogin(usuario: {
        id: number;
        nome: string;
        email: string;
        tipo_usuario: "user" | "admin" | "funcionario" | "superAdmin";
        versao_token: number;
    }) {

        await this.prisma.login_evento.create({
            data: {
                usuario_id: usuario.id,
                criado_em: agoraEmSaoPaulo()
            }
        });

        const refreshToken = this.gerarRefreshToken();
        const refreshTokenHash = this.gerarHashToken(refreshToken);

        const sessao = await this.prisma.sessao.create({
            data: {
                usuario_id: usuario.id,
                versao_token: usuario.versao_token,
                refresh_token_hash: refreshTokenHash,
                ultimo_uso_em: agoraEmSaoPaulo(),
                criado_em: agoraEmSaoPaulo()
            },
            select: {
                id: true
            }
        });

        const payload = {
            sub: usuario.id,
            tipo: usuario.tipo_usuario,
            ver: usuario.versao_token,
            sid: sessao.id
        };

        const accessToken =
            await this.jwtService.signAsync(payload);

        return {
            requer_segunda_etapa: false,
            access_token: accessToken,
            refresh_token: refreshToken,

            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                tipo: usuario.tipo_usuario
            }
        };
    }

    async renovarSessao(refreshTokenAtual: string) {
        const refreshTokenHashAtual =
            this.gerarHashToken(refreshTokenAtual);

        const sessao = await this.prisma.sessao.findUnique({
            where: {
                refresh_token_hash: refreshTokenHashAtual
            },
            select: {
                id: true,
                usuario_id: true,
                versao_token: true,
                revogada_em: true,
                usuario: {
                    select: {
                        id: true,
                        nome: true,
                        email: true,
                        tipo_usuario: true,
                        versao_token: true,
                        desativado_em: true
                    }
                }
            }
        });

        if (
            !sessao ||
            sessao.revogada_em ||
            sessao.versao_token !== sessao.usuario.versao_token ||
            (
                sessao.usuario.desativado_em &&
                sessao.usuario.tipo_usuario !== "user"
            )
        ) {
            throw new UnauthorizedException(
                "Sessão inválida ou revogada."
            );
        }

        const novoRefreshToken = this.gerarRefreshToken();
        const novoRefreshTokenHash =
            this.gerarHashToken(novoRefreshToken);

        const accessToken = await this.jwtService.signAsync({
            sub: sessao.usuario.id,
            tipo: sessao.usuario.tipo_usuario,
            ver: sessao.usuario.versao_token,
            sid: sessao.id
        });

        const sessaoAtualizada = await this.prisma.sessao.updateMany({
            where: {
                id: sessao.id,
                usuario_id: sessao.usuario_id,
                refresh_token_hash: refreshTokenHashAtual,
                revogada_em: null
            },
            data: {
                refresh_token_hash: novoRefreshTokenHash,
                ultimo_uso_em: agoraEmSaoPaulo()
            }
        });

        if (sessaoAtualizada.count !== 1) {
            throw new UnauthorizedException(
                "Sessão inválida ou revogada."
            );
        }

        return {
            access_token: accessToken,
            refresh_token: novoRefreshToken
        };
    }

    private gerarRefreshToken() {
        return randomBytes(64).toString("base64url");
    }

    private gerarHashToken(token: string) {
        return createHash("sha256")
            .update(token)
            .digest("hex");
    }

    async obterQuantUsuarios() {
        const total = await this.prisma.cadastro.count();
        return total;
    }

    async obterQuantUsuarioCategoria() {
        const resultado = await this.prisma.cadastro.groupBy({
            by: ['tipo_usuario'],
            _count: {
                id: true,
            },
        });

        return resultado;
    }

    async registrarSaida(usuarioId: number, sessaoId: string) {
        const agora = agoraEmSaoPaulo();
        const sessaoRevogada = await this.prisma.sessao.updateMany({
            where: {
                id: sessaoId,
                usuario_id: usuarioId,
                revogada_em: null
            },
            data: {
                revogada_em: agora
            }
        });

        if (sessaoRevogada.count !== 1) {
            throw new UnauthorizedException(
                "Sessão inválida ou revogada."
            );
        }

        const acessoAberto = await this.prisma.login_evento.findFirst({
            where: {
                usuario_id: usuarioId,
                saiu_em: null
            },
            orderBy: {
                criado_em: "desc"
            },
            select: {
                id: true
            }
        });

        if (!acessoAberto) {
            return {
                mensagem: "Saída realizada com sucesso."
            };
        }

        await this.prisma.login_evento.update({
            where: {
                id: acessoAberto.id
            },
            data: {
                saiu_em: agora
            }
        });

        return {
            mensagem: "Saída registrada com sucesso."
        };
    }

    async obterRelatoriosLogs() {
        const acessos = await this.prisma.login_evento.findMany({
            orderBy: {
                criado_em: "desc"
            },
            select: {
                id: true,
                criado_em: true,
                saiu_em: true,
                cadastro: {
                    select: {
                        nome: true,
                        tipo_usuario: true
                    }
                }
            }
        });

        return acessos.map((acesso) => ({
            id: acesso.id,
            usuario: acesso.cadastro.nome,
            tipoUsuario: acesso.cadastro.tipo_usuario,
            entrada: serializarDataDeSaoPaulo(acesso.criado_em),
            saida: serializarDataDeSaoPaulo(acesso.saiu_em)
        }));
    }

    async obterRelatoriosErros() {
        const erros = await this.prisma.erro_autenticacao.findMany({
            orderBy: {
                criado_em: "desc"
            },
            select: {
                id: true,
                tipo: true,
                criado_em: true,
                cadastro: {
                    select: {
                        nome: true,
                        tipo_usuario: true
                    }
                }
            }
        });

        return erros.map((erro) => ({
            id: erro.id,
            usuario: erro.cadastro.nome,
            tipoUsuario: erro.cadastro.tipo_usuario,
            erro: erro.tipo,
            horario: serializarDataDeSaoPaulo(erro.criado_em)
        }));
    }

    private registrarErroAutenticacao(
        usuarioId: number,
        tipo: "login" | "verificacao"
    ) {
        return this.prisma.erro_autenticacao.create({
            data: {
                usuario_id: usuarioId,
                tipo,
                criado_em: agoraEmSaoPaulo()
            }
        });
    }

    async obterLoginsPorMes(ano: number) {
        const inicio = new Date(`${ano}-01-01T00:00:00-03:00`);
        const fim = new Date(`${ano + 1}-01-01T00:00:00-03:00`);

        const logins = await this.prisma.login_evento.findMany({
            where: {
                criado_em: {
                    gte: inicio,
                    lt: fim
                }
            },
            select: {
                criado_em: true
            }
        });

        const quantidades = Array<number>(12).fill(0);

        for (const login of logins) {
            const mesEmSaoPaulo = Number(
                FORMATADOR_MES_SAO_PAULO.format(login.criado_em)
            );

            quantidades[mesEmSaoPaulo - 1] += 1;
        }

        return {
            ano,
            meses: NOMES_MESES.map((nome, indice) => ({
                mes: indice + 1,
                nome,
                quantidade: quantidades[indice]
            }))
        };
    }

    async signInGoogle(credential: string) {
        let payload;

        try {
            const ticket = await googleClient.verifyIdToken({
                idToken: credential,
                audience: process.env.GOOGLE_CLIENT_ID
            });

            payload = ticket.getPayload();
        } catch {
            throw new UnauthorizedException(
                "Credencial do Google inválida."
            );
        }

        if (!payload?.sub || !payload.email || !payload.email_verified) {
            throw new UnauthorizedException(
                "A conta Google não forneceu um e-mail verificado."
            );
        }

        const email = payload.email.trim().toLowerCase();
        const usuario = await this.usuariosService.buscarPorEmail(email);

        if (!usuario) {
            // Este token não autentica o usuário. Ele preserva por quinze
            // minutos a identidade Google para a futura conclusão do cadastro.
            const cadastroToken = await this.jwtService.signAsync(
                {
                    finalidade: "cadastro_google",
                    google_sub: payload.sub,
                    email,
                    nome: payload.name ?? email.split("@")[0],
                    foto: payload.picture
                },
                {
                    expiresIn: "15m"
                }
            );

            return {
                requer_complemento_cadastro: true,
                cadastro_token: cadastroToken,
                perfil_google: {
                    nome: payload.name ?? email.split("@")[0],
                    email,
                    foto: payload.picture
                }
            };
        }

        if (usuario.dois_fatores_email_ativo) {
            const desafio =
                await this.twoFactorEmailService.iniciarLogin(usuario.id);

            return {
                requer_segunda_etapa: true,
                ...desafio
            };
        }

        return this.concluirLogin(usuario);
    }

    async concluirCadastroGoogle(dados: ConcluirCadastroGoogleDto) {
        let payload: CadastroGooglePayload;

        try {
            payload = await this.jwtService.verifyAsync<CadastroGooglePayload>(
                dados.cadastroToken
            );
        } catch {
            throw new UnauthorizedException(
                "A autorização do cadastro com Google expirou. Entre com o Google novamente."
            );
        }

        if (
            payload.finalidade !== "cadastro_google" ||
            !payload.google_sub ||
            !payload.email
        ) {
            throw new UnauthorizedException(
                "Autorização de cadastro com Google inválida."
            );
        }

        const emailGoogle = payload.email.trim().toLowerCase();

        if (dados.email.trim().toLowerCase() !== emailGoogle) {
            throw new BadRequestException(
                "O e-mail informado deve ser o mesmo da conta Google."
            );
        }

        await this.usuariosService.cadastrar(
            {
                nome: dados.nome,
                dataNascimento: dados.dataNascimento,
                cpf: dados.cpf,
                numeroTelefone: dados.numeroTelefone,
                email: emailGoogle,
                senha: dados.senha,
                confirmarSenha: dados.confirmarSenha
            },
            typeof payload.foto === "string" && payload.foto.length <= 500
                ? payload.foto
                : undefined
        );

        const usuario = await this.usuariosService.buscarPorEmail(emailGoogle);

        if (!usuario) {
            throw new UnauthorizedException(
                "Não foi possível iniciar a sessão após o cadastro."
            );
        }

        return this.concluirLogin(usuario);
    }
}
