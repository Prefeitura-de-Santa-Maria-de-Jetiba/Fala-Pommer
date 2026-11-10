// Registra os recursos usados no módulo de usuários.
import { Module } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { UsuariosController } from './usuarios.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { EmailModule } from 'src/email/email.module';
import { CriptografiaModule } from '../criptografia/criptografia.module';

@Module({
  imports: [PrismaModule, EmailModule, CriptografiaModule],
  providers: [UsuariosService],
  exports: [UsuariosService],
  controllers: [UsuariosController]
})
export class UsuariosModule {}
