/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await */
import {
  BadRequestException,
  HttpException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { TwoFactorEmailService } from './two-factor-email.service';

const AGORA = new Date('2026-08-21T15:00:00.000Z');
const TOKEN = 'a'.repeat(64);
const OUTRO_TOKEN = 'b'.repeat(64);

describe('TwoFactorEmailService', () => {
  const desafioDelegate = {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
    updateMany: jest.fn(),
    create: jest.fn(),
  };
  const cadastroDelegate = {
    findUnique: jest.fn(),
    updateMany: jest.fn(),
  };
  const codigoRecuperacaoDelegate = {
    findMany: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  };
  const erroAutenticacaoDelegate = {
    create: jest.fn(),
  };
  const prismaMock = {
    desafio_login_2fa: desafioDelegate,
    cadastro: cadastroDelegate,
    codigo_recuperacao_2fa: codigoRecuperacaoDelegate,
    erro_autenticacao: erroAutenticacaoDelegate,
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  };
  const emailMock = {
    enviarCodigoDoisFatores: jest.fn(),
  };

  let service: TwoFactorEmailService;
  let hashCodigoValido: string;
  let hashSenhaValida: string;
  let hashCodigoRecuperacao: string;

  function criarDesafioSalvo(
    alteracoes: Partial<{
      id: number;
      usuario_id: number;
      finalidade: 'ativacao' | 'login' | 'desativacao';
      token_hash: string;
      codigo_hash: string;
      tentativas: number;
      reenvios: number;
      expira_em: Date;
      usado_em: Date | null;
      criado_em: Date;
      ultimo_envio_em: Date;
    }> = {},
  ) {
    return {
      id: 10,
      usuario_id: 7,
      finalidade: 'login' as const,
      token_hash: 'token-hash',
      codigo_hash: hashCodigoValido,
      tentativas: 0,
      reenvios: 0,
      expira_em: new Date(AGORA.getTime() + 5 * 60 * 1000),
      usado_em: null,
      criado_em: new Date(AGORA.getTime() - 2 * 60 * 1000),
      ultimo_envio_em: new Date(AGORA.getTime() - 61 * 1000),
      ...alteracoes,
    };
  }

  beforeAll(async () => {
    [hashCodigoValido, hashSenhaValida, hashCodigoRecuperacao] =
      await Promise.all([
        bcrypt.hash('123456', 4),
        bcrypt.hash('Senha!123', 4),
        bcrypt.hash('ABCD-EFGH', 4),
      ]);
  });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(AGORA);
    jest.clearAllMocks();

    desafioDelegate.findFirst.mockResolvedValue(null);
    desafioDelegate.count.mockResolvedValue(0);
    desafioDelegate.updateMany.mockResolvedValue({ count: 1 });
    desafioDelegate.create.mockResolvedValue({});
    cadastroDelegate.updateMany.mockResolvedValue({ count: 1 });
    codigoRecuperacaoDelegate.updateMany.mockResolvedValue({ count: 1 });
    codigoRecuperacaoDelegate.deleteMany.mockResolvedValue({ count: 1 });
    codigoRecuperacaoDelegate.createMany.mockResolvedValue({ count: 8 });
    erroAutenticacaoDelegate.create.mockResolvedValue({});
    emailMock.enviarCodigoDoisFatores.mockResolvedValue(undefined);
    prismaMock.$queryRaw.mockResolvedValue([{ id: 7 }]);
    prismaMock.$transaction.mockImplementation(async (operacao) =>
      operacao(prismaMock),
    );

    service = new TwoFactorEmailService(
      prismaMock as unknown as PrismaService,
      emailMock as unknown as EmailService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('inicia a ativação, invalida o desafio anterior e envia o código', async () => {
    cadastroDelegate.findUnique.mockResolvedValue({
      id: 7,
      email: 'usuario@exemplo.com',
      senha: hashSenhaValida,
      dois_fatores_email_ativo: false,
    });

    const resultado = await service.iniciarAtivacao(7, 'Senha!123');

    expect(resultado.token).toMatch(/^[a-f0-9]{64}$/);
    expect(resultado.email_mascarado).toBe('u***o@exemplo.com');
    expect(desafioDelegate.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          usuario_id: 7,
          finalidade: 'ativacao',
          usado_em: null,
        }),
      }),
    );
    expect(emailMock.enviarCodigoDoisFatores).toHaveBeenCalledWith(
      'usuario@exemplo.com',
      expect.stringMatching(/^\d{6}$/),
    );
  });

  it('bloqueia a linha do usuário antes de validar e criar o desafio', async () => {
    await service.criarDesafio(7, 'login');

    const [consulta, usuarioId] = prismaMock.$queryRaw.mock.calls[0] as [
      TemplateStringsArray,
      number,
    ];
    expect(consulta.join(' ')).toContain('FOR UPDATE');
    expect(usuarioId).toBe(7);
    expect(prismaMock.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      desafioDelegate.findFirst.mock.invocationCallOrder[0],
    );
    expect(desafioDelegate.findFirst.mock.invocationCallOrder[0]).toBeLessThan(
      desafioDelegate.create.mock.invocationCallOrder[0],
    );
  });

  it('impede um novo desafio antes de 60 segundos', async () => {
    desafioDelegate.findFirst.mockResolvedValue({
      ultimo_envio_em: new Date(AGORA.getTime() - 30 * 1000),
    });

    await expect(service.criarDesafio(7, 'login')).rejects.toMatchObject({
      status: 429,
    });
    expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1);
    expect(desafioDelegate.create).not.toHaveBeenCalled();
  });

  it('limita a cinco novos desafios por finalidade em 15 minutos', async () => {
    desafioDelegate.findFirst.mockResolvedValue({
      ultimo_envio_em: new Date(AGORA.getTime() - 2 * 60 * 1000),
    });
    desafioDelegate.count.mockResolvedValue(5);

    await expect(service.criarDesafio(7, 'login')).rejects.toMatchObject({
      status: 429,
    });
    expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1);
    expect(desafioDelegate.create).not.toHaveBeenCalled();
  });

  it('respeita o intervalo mínimo entre reenvios', async () => {
    desafioDelegate.findUnique.mockResolvedValue(
      criarDesafioSalvo({
        ultimo_envio_em: new Date(AGORA.getTime() - 30 * 1000),
      }),
    );

    await expect(service.reenviarCodigo(TOKEN, 'login')).rejects.toBeInstanceOf(
      HttpException,
    );
    expect(desafioDelegate.updateMany).not.toHaveBeenCalled();
  });

  it('limita cada desafio a três reenvios', async () => {
    desafioDelegate.findUnique.mockResolvedValue(
      criarDesafioSalvo({ reenvios: 3 }),
    );

    await expect(service.reenviarCodigo(TOKEN, 'login')).rejects.toMatchObject({
      status: 429,
    });
    expect(desafioDelegate.updateMany).not.toHaveBeenCalled();
  });

  it('renova o código e incrementa o contador no reenvio válido', async () => {
    desafioDelegate.findUnique.mockResolvedValue(
      criarDesafioSalvo({ reenvios: 2 }),
    );

    const resultado = await service.reenviarCodigo(TOKEN, 'login');

    expect(resultado.codigo).toMatch(/^\d{6}$/);
    expect(resultado.expiraEm).toEqual(
      new Date(AGORA.getTime() + 5 * 60 * 1000),
    );
    expect(desafioDelegate.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          reenvios: { lt: 3 },
          ultimo_envio_em: { lte: expect.any(Date) },
        }),
        data: expect.objectContaining({
          reenvios: { increment: 1 },
        }),
      }),
    );
  });

  it('registra código incorreto como tentativa inválida', async () => {
    desafioDelegate.findUnique.mockResolvedValue(criarDesafioSalvo());

    await expect(
      service.verificarCodigo(TOKEN, '654321', 'login'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(desafioDelegate.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tentativas: { lt: 5 } }),
        data: { tentativas: { increment: 1 } },
      }),
    );
    expect(erroAutenticacaoDelegate.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        usuario_id: 7,
        tipo: 'verificacao',
      }),
    });
  });

  it('bloqueia o desafio após cinco tentativas', async () => {
    desafioDelegate.findUnique.mockResolvedValue(
      criarDesafioSalvo({ tentativas: 5 }),
    );

    await expect(
      service.verificarCodigo(TOKEN, '123456', 'login'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('recusa código expirado', async () => {
    desafioDelegate.findUnique.mockResolvedValue(
      criarDesafioSalvo({
        expira_em: new Date(AGORA.getTime() - 1),
      }),
    );

    await expect(
      service.verificarCodigo(TOKEN, '123456', 'login'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('consome o desafio e impede reutilizar o mesmo código', async () => {
    desafioDelegate.findUnique
      .mockResolvedValueOnce(criarDesafioSalvo())
      .mockResolvedValueOnce(criarDesafioSalvo({ usado_em: AGORA }));

    await expect(
      service.verificarCodigo(TOKEN, '123456', 'login'),
    ).resolves.toEqual({ usuarioId: 7 });
    await expect(
      service.verificarCodigo(TOKEN, '123456', 'login'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('ativa o 2FA e armazena somente os hashes dos códigos de recuperação', async () => {
    cadastroDelegate.findUnique.mockResolvedValue({
      dois_fatores_email_ativo: false,
    });
    desafioDelegate.findUnique.mockResolvedValue(
      criarDesafioSalvo({ finalidade: 'ativacao' }),
    );

    const resultado = await service.confirmarAtivacao(7, TOKEN, '123456');

    expect(resultado.codigos_recuperacao).toHaveLength(8);
    expect(new Set(resultado.codigos_recuperacao).size).toBe(8);
    expect(resultado.codigos_recuperacao).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^[A-HJ-KM-NP-Z2-9]{4}-[A-HJ-KM-NP-Z2-9]{4}$/),
      ]),
    );
    expect(cadastroDelegate.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ dois_fatores_email_ativo: true }),
      }),
    );
    const dadosCriados = codigoRecuperacaoDelegate.createMany.mock.calls[0][0]
      .data as Array<{ codigo_hash: string }>;
    expect(dadosCriados).toHaveLength(8);
    await Promise.all(
      dadosCriados.map(async (item, indice) => {
        expect(item.codigo_hash).toMatch(/^\$2[aby]\$10\$/);
        expect(item.codigo_hash).not.toContain(
          resultado.codigos_recuperacao[indice],
        );
        await expect(
          bcrypt.compare(
            resultado.codigos_recuperacao[indice],
            item.codigo_hash,
          ),
        ).resolves.toBe(true);
      }),
    );
  });

  it('consome uma única vez o código de recuperação no login', async () => {
    desafioDelegate.findUnique
      .mockResolvedValueOnce(criarDesafioSalvo())
      .mockResolvedValueOnce(criarDesafioSalvo({ id: 11 }));
    codigoRecuperacaoDelegate.findMany
      .mockResolvedValueOnce([{ id: 22, codigo_hash: hashCodigoRecuperacao }])
      .mockResolvedValueOnce([]);

    await expect(
      service.verificarCodigoRecuperacao(TOKEN, 'abcd-efgh', 'login'),
    ).resolves.toEqual({ usuarioId: 7 });
    await expect(
      service.verificarCodigoRecuperacao(OUTRO_TOKEN, 'ABCD-EFGH', 'login'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(codigoRecuperacaoDelegate.updateMany).toHaveBeenCalledTimes(1);
    expect(codigoRecuperacaoDelegate.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 22, usado_em: null }),
        data: { usado_em: AGORA },
      }),
    );
  });

  it('desativa o 2FA e invalida desafios e códigos de recuperação', async () => {
    cadastroDelegate.findUnique.mockResolvedValue({
      dois_fatores_email_ativo: true,
    });
    desafioDelegate.findUnique.mockResolvedValue(
      criarDesafioSalvo({ finalidade: 'desativacao' }),
    );

    const resultado = await service.confirmarDesativacao(7, TOKEN, '123456');

    expect(resultado.mensagem).toContain('desativada');
    expect(cadastroDelegate.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          dois_fatores_email_ativo: false,
          dois_fatores_email_confirmado_em: null,
        },
      }),
    );
    expect(codigoRecuperacaoDelegate.deleteMany).toHaveBeenCalledWith({
      where: { usuario_id: 7 },
    });
  });

  it('não inicia login 2FA quando a proteção está inativa', async () => {
    cadastroDelegate.findUnique.mockResolvedValue({
      id: 7,
      email: 'usuario@exemplo.com',
      senha: hashSenhaValida,
      dois_fatores_email_ativo: false,
    });

    await expect(service.iniciarLogin(7)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(emailMock.enviarCodigoDoisFatores).not.toHaveBeenCalled();
  });
});
