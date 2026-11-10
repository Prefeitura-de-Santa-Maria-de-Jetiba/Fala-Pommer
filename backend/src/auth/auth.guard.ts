// Verifica o token de acesso das rotas protegidas.
import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException
} from "@nestjs/common";

import { JwtService } from "@nestjs/jwt";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import { Request } from "express";
import { PrismaService } from "../prisma/prisma.service";
import { criarArquivoLogMonitorSeguranca } from "src/security-log/security-log";
import { ClsService } from "nestjs-cls";

export type JwtPayload = {
    sub: number;
    tipo: "user" | "admin" | "funcionario" | "superAdmin";
    ver: number;
    sid: string;
    iat: number;
    exp: number;
};

export type RequisicaoAutenticada = Request & {
    usuario?: JwtPayload;
};

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(
        private readonly jwtService: JwtService,
        private readonly prisma: PrismaService,
        private readonly cls: ClsService
    ) {}

    async canActivate(
        contexto: ExecutionContext
    ): Promise<boolean> {
        const requisicao =
            contexto.switchToHttp().getRequest<RequisicaoAutenticada>();

        const token = this.extrairToken(requisicao);

        if (!token) {
            throw new UnauthorizedException(
                "Token de autenticação não informado."
            );
        }

        const payload = await this.verificarToken(token, requisicao);

        if (!payload.sid) {
            throw new UnauthorizedException("Token inválido.");
        }

        const sessao = await this.prisma.sessao.findUnique({
            where: {
                id: payload.sid
            },
            select: {
                usuario_id: true,
                revogada_em: true,
                usuario: {
                    select: {
                        desativado_em: true,
                        versao_token: true,
                        tipo_usuario: true
                    }
                }
            }
        });

        const usuario = sessao?.usuario;

        if (!sessao || !usuario) {
            throw new UnauthorizedException("Sessão não encontrada.");
        }

        if (sessao.revogada_em) {
            throw new UnauthorizedException("Sessão encerrada.");
        }

        if (
            sessao.usuario_id !== payload.sub ||
            payload.ver !== usuario.versao_token ||
            payload.tipo !== usuario.tipo_usuario
        ) {
            throw new UnauthorizedException("Token inválido.");
        }

        if (
            usuario.desativado_em &&
            usuario.tipo_usuario !== "user"
        ) {
            throw new UnauthorizedException("Usuário desativado.");
        }

        requisicao.usuario = payload;

        return true;
    }

    private async verificarToken(token: string, requisicao: Request): Promise<JwtPayload> {
        try {
            return await this.jwtService.verifyAsync<JwtPayload>(token);
        } catch (erro) {
            // TokenExpiredError estende JsonWebTokenError: manter esta ordem.
            if (erro instanceof TokenExpiredError) {
                throw new UnauthorizedException("Token expirado.");
            }

            if (erro instanceof JsonWebTokenError) {
                this.registrarLog("INVALID_TOKEN", requisicao)
                throw new UnauthorizedException("Token inválido.");
            }

            throw new UnauthorizedException(
                "Não foi possível validar o token."
            );
        }
    }

    private registrarLog(evento: string, requisicao: Request): void {
        try {
            criarArquivoLogMonitorSeguranca.call(
                this,
                evento,
                requisicao.originalUrl,
                401
            );
        } catch {
            // Falha no log nunca deve impedir a resposta 401.
        }
    }

    private extrairToken(
        requisicao: Request
    ): string | undefined {
        const cabecalho =
            requisicao.headers.authorization;

        const [tipo, token] =
            cabecalho?.split(" ") ?? [];

        if (tipo !== "Bearer") {
            return undefined;
        }

        return token;
    }
}
