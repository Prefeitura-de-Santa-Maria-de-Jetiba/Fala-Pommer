// Registra os recursos usados no módulo de autenticação.
import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import {
    ConfigModule,
    ConfigService
} from "@nestjs/config";
import { ClsModule } from 'nestjs-cls';
import { getClientIp } from 'get-client-ip';

import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { UsuariosModule } from "../usuarios/usuarios.module";
import { AuthGuard } from "./auth.guard";
import { PerfisGuard } from "./guards/perfis.guard";
import { PrismaModule } from "../prisma/prisma.module";
import { EmailModule } from "../email/email.module";
import { TwoFactorEmailService } from "./two-factor-email.service";

@Module({
    imports: [
        UsuariosModule,
        PrismaModule,
        EmailModule,
        ConfigModule,

        ClsModule.forRoot({
            global: true,
            middleware: {
                mount: true,
                setup: (cls, req) => {
                    const ip = (req.ip ?? req.socket.remoteAddress ?? "")
                        .replace(/^::ffff:/, "");
                    cls.set("clienteIp", ip);
                },
            },
        }),

        JwtModule.registerAsync({
            global: true,

            inject: [ConfigService],

            useFactory: (configService: ConfigService) => ({
                secret: configService.getOrThrow<string>(
                    "JWT_SECRET"
                ),

                signOptions: {
                    expiresIn: "15m"
                }
            })
        })
    ],
    controllers: [AuthController],
    providers: [
        AuthService,
        AuthGuard,
        PerfisGuard,
        TwoFactorEmailService
    ],
    exports: [AuthService, AuthGuard, PerfisGuard]
})
export class AuthModule {}
