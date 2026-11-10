// Registra os recursos usados no módulo de conversas.
import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module";
import { NotificacoesModule } from "../notificacoes/notificacoes.module";
import { CriptografiaModule } from "../criptografia/criptografia.module";
import { ConversasController } from "./conversas.controller";
import { ConversasService } from "./conversas.service";

@Module({
    imports: [
        PrismaModule,
        NotificacoesModule,
        CriptografiaModule
    ],

    controllers: [
        ConversasController
    ],

    providers: [
        ConversasService
    ]
})
export class ConversasModule {}
