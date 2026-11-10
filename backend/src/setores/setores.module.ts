// Registra os recursos usados no módulo de setores.
import { Module } from '@nestjs/common';
import { SetoresService } from './setores.service';
import { SetoresController } from './setores.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [SetoresService],
  controllers: [SetoresController],
  exports: [SetoresService]
})
export class SetoresModule {}
