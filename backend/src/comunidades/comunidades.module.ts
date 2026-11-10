import { Module } from '@nestjs/common';
import { ComunidadesController } from './comunidades.controller';
import { ComunidadesService } from './comunidades.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CriptografiaModule } from '../criptografia/criptografia.module';

@Module({
  imports: [PrismaModule, CriptografiaModule],
  controllers: [ComunidadesController],
  providers: [ComunidadesService],
  exports: [ComunidadesService]
})
export class ComunidadesModule {}
