import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITMO = 'aes-256-gcm';
const PREFIXO_ENVELOPE = 'fp:aes-256-gcm:v1';
const TAMANHO_CHAVE_BYTES = 32;
const TAMANHO_IV_BYTES = 12;
const TAMANHO_TAG_BYTES = 16;

@Injectable()
export class MensagensCriptografiaService {
  private readonly chave: Buffer;

  constructor(configService: ConfigService) {
    const chaveBase64 = configService
      .get<string>('MESSAGE_ENCRYPTION_KEY')
      ?.trim();

    if (!chaveBase64) {
      throw new Error(
        'MESSAGE_ENCRYPTION_KEY não foi configurada. ' +
          'Informe uma chave aleatória de 32 bytes codificada em Base64.',
      );
    }

    const chave = Buffer.from(chaveBase64, 'base64');
    const chaveCanonica = chave.toString('base64');

    if (chave.length !== TAMANHO_CHAVE_BYTES || chaveCanonica !== chaveBase64) {
      throw new Error(
        'MESSAGE_ENCRYPTION_KEY inválida. ' +
          'A chave deve conter exatamente 32 bytes em Base64 canônico.',
      );
    }

    this.chave = chave;
  }

  criptografar(conteudo: string, conversaId: number): string {
    const iv = randomBytes(TAMANHO_IV_BYTES);
    const cifrador = createCipheriv(ALGORITMO, this.chave, iv, {
      authTagLength: TAMANHO_TAG_BYTES,
    });

    cifrador.setAAD(this.criarDadosAdicionais(conversaId));

    const conteudoCifrado = Buffer.concat([
      cifrador.update(conteudo, 'utf8'),
      cifrador.final(),
    ]);
    const tag = cifrador.getAuthTag();

    return [
      PREFIXO_ENVELOPE,
      iv.toString('base64url'),
      tag.toString('base64url'),
      conteudoCifrado.toString('base64url'),
    ].join(':');
  }

  descriptografar(conteudo: string, conversaId: number): string {
    if (!conteudo.startsWith(`${PREFIXO_ENVELOPE}:`)) {
      // Compatibilidade temporária com mensagens anteriores à criptografia.
      return conteudo;
    }

    const partes = conteudo.split(':');

    if (partes.length !== 6) {
      throw new Error('Envelope de mensagem criptografada inválido.');
    }

    const [, , , ivBase64, tagBase64, conteudoBase64] = partes;
    const iv = this.decodificarBase64Url(ivBase64);
    const tag = this.decodificarBase64Url(tagBase64);
    const conteudoCifrado = this.decodificarBase64Url(conteudoBase64);

    if (iv.length !== TAMANHO_IV_BYTES || tag.length !== TAMANHO_TAG_BYTES) {
      throw new Error('Envelope de mensagem criptografada inválido.');
    }

    try {
      const decifrador = createDecipheriv(ALGORITMO, this.chave, iv, {
        authTagLength: TAMANHO_TAG_BYTES,
      });

      decifrador.setAAD(this.criarDadosAdicionais(conversaId));
      decifrador.setAuthTag(tag);

      return Buffer.concat([
        decifrador.update(conteudoCifrado),
        decifrador.final(),
      ]).toString('utf8');
    } catch {
      throw new Error('Não foi possível autenticar a mensagem criptografada.');
    }
  }

  private criarDadosAdicionais(conversaId: number): Buffer {
    if (!Number.isSafeInteger(conversaId) || conversaId <= 0) {
      throw new Error('ID da conversa inválido para criptografia.');
    }

    return Buffer.from(
      `fala-pommer:mensagem:v1:conversa:${conversaId}`,
      'utf8',
    );
  }

  private decodificarBase64Url(valor: string): Buffer {
    if (!/^[A-Za-z0-9_-]*$/.test(valor)) {
      throw new Error('Envelope de mensagem criptografada inválido.');
    }

    return Buffer.from(valor, 'base64url');
  }
}
