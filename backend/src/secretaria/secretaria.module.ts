import { Module } from '@nestjs/common';
import { SecretariaController } from './secretaria.controller';
import { SecretariaService } from './secretaria.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [SecretariaService],
  controllers: [SecretariaController],
  exports: [SecretariaService]
})
export class SecretariaModule {}
