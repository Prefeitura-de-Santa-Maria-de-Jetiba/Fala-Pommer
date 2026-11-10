import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { MensagensCriptografiaService } from './mensagens-criptografia.service';

@Module({
  imports: [ConfigModule],
  providers: [MensagensCriptografiaService],
  exports: [MensagensCriptografiaService],
})
export class CriptografiaModule {}
