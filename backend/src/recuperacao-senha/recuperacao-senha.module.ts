// Registra os recursos do módulo de recuperação de senha.
import { Module } from "@nestjs/common";
import { RecuperacaoSenhaController } from "./recuperacao-senha.controller";
import { RecuperacaoSenhaService } from "./recuperacao-senha.service";
import { PrismaModule } from "../prisma/prisma.module";
import { EmailModule } from "../email/email.module";

@Module({
    imports: [
        PrismaModule,
        EmailModule
    ],
    controllers: [RecuperacaoSenhaController],
    providers: [RecuperacaoSenhaService]
})
export class RecuperacaoSenhaModule {}
