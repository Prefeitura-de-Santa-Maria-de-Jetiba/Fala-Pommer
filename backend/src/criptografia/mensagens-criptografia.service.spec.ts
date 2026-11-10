import { ConfigService } from '@nestjs/config';

import { MensagensCriptografiaService } from './mensagens-criptografia.service';

describe('MensagensCriptografiaService', () => {
  const chave = Buffer.alloc(32, 7).toString('base64');

  const criarServico = (valorChave = chave) =>
    new MensagensCriptografiaService({
      get: jest.fn().mockReturnValue(valorChave),
    } as unknown as ConfigService);

  it('criptografa e descriptografa uma mensagem com AES-256-GCM', () => {
    const servico = criarServico();
    const cifrado = servico.criptografar('Olá, Pomerode!', 42);

    expect(cifrado).toMatch(/^fp:aes-256-gcm:v1:/);
    expect(cifrado).not.toContain('Olá, Pomerode!');
    expect(servico.descriptografar(cifrado, 42)).toBe('Olá, Pomerode!');
  });

  it('usa um IV diferente em cada criptografia', () => {
    const servico = criarServico();

    expect(servico.criptografar('mesmo texto', 42)).not.toBe(
      servico.criptografar('mesmo texto', 42),
    );
  });

  it('suporta conteúdo vazio usado por mensagens que contêm somente arquivo', () => {
    const servico = criarServico();
    const cifrado = servico.criptografar('', 42);

    expect(servico.descriptografar(cifrado, 42)).toBe('');
  });

  it('rejeita mensagem adulterada ou movida para outra conversa', () => {
    const servico = criarServico();
    const cifrado = servico.criptografar('segredo', 42);
    const partes = cifrado.split(':');
    const primeiroCaractere = partes[5][0];
    partes[5] = `${primeiroCaractere === 'A' ? 'B' : 'A'}${partes[5].slice(1)}`;
    const adulterado = partes.join(':');

    expect(() => servico.descriptografar(adulterado, 42)).toThrow();
    expect(() => servico.descriptografar(cifrado, 43)).toThrow();
  });

  it('mantém compatibilidade com mensagens antigas em texto puro', () => {
    const servico = criarServico();

    expect(servico.descriptografar('mensagem antiga', 42)).toBe(
      'mensagem antiga',
    );
  });

  it('recusa uma chave ausente ou com tamanho incorreto', () => {
    expect(() => criarServico('')).toThrow(
      'MESSAGE_ENCRYPTION_KEY não foi configurada',
    );
    expect(() => criarServico(Buffer.alloc(16).toString('base64'))).toThrow(
      'MESSAGE_ENCRYPTION_KEY inválida',
    );
  });
});
