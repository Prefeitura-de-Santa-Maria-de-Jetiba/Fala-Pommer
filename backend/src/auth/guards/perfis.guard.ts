// Verifica se o usuário possui um dos perfis permitidos.
import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    UnauthorizedException,
    Injectable
} from "@nestjs/common";

import { Reflector } from "@nestjs/core";

import {
    PERFIS_KEY,
    TipoUsuario
} from "../decorators/perfis.decorator";

import type {
    RequisicaoAutenticada
} from "../auth.guard";
import { ClsService } from "nestjs-cls";
import { criarArquivoLogMonitorSeguranca } from "src/security-log/security-log";

@Injectable()
export class PerfisGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly cls: ClsService
    ) {}

    canActivate(contexto: ExecutionContext): boolean {
        const perfisPermitidos =
            this.reflector.getAllAndOverride<TipoUsuario[]>(
                PERFIS_KEY,
                [
                    contexto.getHandler(),
                    contexto.getClass()
                ]
            );

        if (!perfisPermitidos?.length) {
            return true;
        }

        const requisicao =
            contexto.switchToHttp()
                .getRequest<RequisicaoAutenticada>();

        const tipoUsuario = requisicao.usuario?.tipo;

        if (!tipoUsuario) {
            criarArquivoLogMonitorSeguranca.call(
                this,
                "UNAUTHENTICATED_ACCESS",
                requisicao.originalUrl,
                401
            );

            throw new UnauthorizedException(
                "Autenticação necessária."
            );
        }

        if (!perfisPermitidos.includes(tipoUsuario)) {
            
            if (
                perfisPermitidos.includes("admin") ||
                perfisPermitidos.includes("superAdmin")
            ) {
                criarArquivoLogMonitorSeguranca.call(
                    this,
                    "TENTATIVA_ESCALONAMENTO_FUNCAO",
                    requisicao.originalUrl,
                    403
                );
                throw new ForbiddenException(
                    "Você não possui permissão para acessar esta área."
                );
            }

            criarArquivoLogMonitorSeguranca.call(
                this,
                "FORBIDDEN_ACCESS",
                requisicao.originalUrl,
                403
            );

            throw new ForbiddenException(
                "Você não possui permissão para acessar esta área."
            );
        }

        return true;
    }

}
