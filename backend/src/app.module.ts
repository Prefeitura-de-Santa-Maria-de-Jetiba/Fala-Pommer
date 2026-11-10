// Reúne os módulos principais da aplicação.
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { RecuperacaoSenhaModule } from './recuperacao-senha/recuperacao-senha.module';
import { EmailModule } from './email/email.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from "@nestjs/config";
import { ConversasModule } from './conversas/conversas.module';
import { SetoresModule } from './setores/setores.module';
import { SecretariaModule } from './secretaria/secretaria.module';
import { NotificacoesModule } from './notificacoes/notificacoes.module';
import { RecaptchaModule } from './recaptcha/recaptcha.module';
import { ComunidadesModule } from './comunidades/comunidades.module';

@Module({
  imports: [PrismaModule, UsuariosModule, RecuperacaoSenhaModule, EmailModule, AuthModule, ConfigModule.forRoot({isGlobal: true, envFilePath: ['.env.local', '.env', '../.env']}), RecaptchaModule, NotificacoesModule, ConversasModule, SetoresModule, SecretariaModule, ComunidadesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
