// Verifica se o usuário possui um dos perfis permitidos.
import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
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

@Injectable()
export class PerfisGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector
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

        if (
            !tipoUsuario ||
            !perfisPermitidos.includes(tipoUsuario)
        ) {
            throw new ForbiddenException(
                "Você não possui permissão para acessar esta área."
            );
        }

        return true;
    }
}
