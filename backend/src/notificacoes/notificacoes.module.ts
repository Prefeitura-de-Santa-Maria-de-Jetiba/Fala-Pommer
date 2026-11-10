import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { NotificacoesController } from "./notificacoes.controller";
import { NotificacoesService } from "./notificacoes.service";

@Module({
    imports: [
        AuthModule,
        PrismaModule
    ],
    controllers: [NotificacoesController],
    providers: [NotificacoesService],
    exports: [NotificacoesService]
})
export class NotificacoesModule {}
