import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { AuthService } from './auth.service';
import { TwoFactorEmailService } from './two-factor-email.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

describe('AuthService - autenticação em duas etapas', () => {
  const usuariosMock = {
    buscarPorEmail: jest.fn(),
    cadastrar: jest.fn(),
  };
  const jwtMock = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };
  const prismaMock = {
    cadastro: {
      findFirst: jest.fn(),
    },
    login_evento: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    sessao: {
      create: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    erro_autenticacao: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };
  const twoFactorMock = {
    iniciarLogin: jest.fn(),
    verificarCodigo: jest.fn(),
    verificarCodigoRecuperacao: jest.fn(),
  };

  let service: AuthService;

  const usuario = {
    id: 7,
    nome: 'Usuário Teste',
    email: 'usuario@exemplo.com',
    senha: 'hash-da-senha',
    tipo_usuario: 'user' as const,
    dois_fatores_email_ativo: true,
    desativado_em: null,
    versao_token: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    prismaMock.login_evento.create.mockResolvedValue({});
    prismaMock.sessao.create.mockResolvedValue({ id: 'sessao-1' });
    prismaMock.sessao.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.erro_autenticacao.create.mockResolvedValue({});
    jwtMock.signAsync.mockResolvedValue('jwt-final');

    service = new AuthService(
      usuariosMock as unknown as UsuariosService,
      jwtMock as unknown as JwtService,
      prismaMock as unknown as PrismaService,
      twoFactorMock as unknown as TwoFactorEmailService,
    );
  });

  it('conclui o cadastro Google, salva a foto e inicia a sessao', async () => {
    jwtMock.verifyAsync.mockResolvedValue({
      finalidade: 'cadastro_google',
      google_sub: 'google-123',
      email: 'Usuario@Exemplo.com',
      nome: 'Usuario Google',
      foto: 'https://lh3.googleusercontent.com/foto',
    });
    usuariosMock.cadastrar.mockResolvedValue({ id: usuario.id });
    usuariosMock.buscarPorEmail.mockResolvedValue({
      ...usuario,
      email: 'usuario@exemplo.com',
      dois_fatores_email_ativo: false,
    });

    const resultado = await service.concluirCadastroGoogle({
      cadastroToken: 'token-cadastro-google',
      nome: 'Usuario Google',
      dataNascimento: '1990-05-20',
      cpf: '123.456.789-09',
      numeroTelefone: '(27) 99999-9999',
      email: 'usuario@exemplo.com',
      senha: 'Senha!123',
      confirmarSenha: 'Senha!123',
    });

    expect(jwtMock.verifyAsync).toHaveBeenCalledWith(
      'token-cadastro-google',
    );
    expect(usuariosMock.cadastrar).toHaveBeenCalledWith(
      {
        nome: 'Usuario Google',
        dataNascimento: '1990-05-20',
        cpf: '123.456.789-09',
        numeroTelefone: '(27) 99999-9999',
        email: 'usuario@exemplo.com',
        senha: 'Senha!123',
        confirmarSenha: 'Senha!123',
      },
      'https://lh3.googleusercontent.com/foto',
    );
    expect(resultado).toEqual(
      expect.objectContaining({
        access_token: 'jwt-final',
        usuario: expect.objectContaining({
          email: 'usuario@exemplo.com',
        }),
      }),
    );
  });

  it('rejeita quando o e-mail difere da conta Google', async () => {
    jwtMock.verifyAsync.mockResolvedValue({
      finalidade: 'cadastro_google',
      google_sub: 'google-123',
      email: 'google@exemplo.com',
    });

    await expect(
      service.concluirCadastroGoogle({
        cadastroToken: 'token-cadastro-google',
        nome: 'Usuario Google',
        dataNascimento: '1990-05-20',
        cpf: '123.456.789-09',
        numeroTelefone: '(27) 99999-9999',
        email: 'outro@exemplo.com',
        senha: 'Senha!123',
        confirmarSenha: 'Senha!123',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(usuariosMock.cadastrar).not.toHaveBeenCalled();
  });

  it('rejeita token de cadastro Google expirado ou adulterado', async () => {
    jwtMock.verifyAsync.mockRejectedValue(new Error('token invalido'));

    await expect(
      service.concluirCadastroGoogle({
        cadastroToken: 'token-invalido',
        nome: 'Usuario Google',
        dataNascimento: '1990-05-20',
        cpf: '123.456.789-09',
        numeroTelefone: '(27) 99999-9999',
        email: 'usuario@exemplo.com',
        senha: 'Senha!123',
        confirmarSenha: 'Senha!123',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(usuariosMock.cadastrar).not.toHaveBeenCalled();
  });

  it('interrompe o login e retorna somente o desafio quando o 2FA está ativo', async () => {
    usuariosMock.buscarPorEmail.mockResolvedValue(usuario);
    twoFactorMock.iniciarLogin.mockResolvedValue({
      token: 'token-do-desafio',
      email_mascarado: 'u***o@exemplo.com',
      expira_em: new Date('2026-08-21T15:05:00.000Z'),
    });

    const resultado = await service.signIn(usuario.email, 'Senha!123');

    expect(resultado).toEqual(
      expect.objectContaining({
        requer_segunda_etapa: true,
        token: 'token-do-desafio',
      }),
    );
    expect(resultado).not.toHaveProperty('access_token');
    expect(jwtMock.signAsync).not.toHaveBeenCalled();
    expect(prismaMock.login_evento.create).not.toHaveBeenCalled();
  });

  it('conclui diretamente o login quando o 2FA está inativo', async () => {
    usuariosMock.buscarPorEmail.mockResolvedValue({
      ...usuario,
      dois_fatores_email_ativo: false,
    });

    const resultado = await service.signIn(usuario.email, 'Senha!123');

    expect(resultado).toEqual(
      expect.objectContaining({
        requer_segunda_etapa: false,
        access_token: 'jwt-final',
        refresh_token: expect.any(String),
      }),
    );
    expect(twoFactorMock.iniciarLogin).not.toHaveBeenCalled();
    expect(prismaMock.login_evento.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.sessao.create).toHaveBeenCalledWith({
      data: {
        usuario_id: usuario.id,
        versao_token: usuario.versao_token,
        refresh_token_hash: expect.stringMatching(/^[a-f0-9]{64}$/),
        ultimo_uso_em: expect.any(Date),
        criado_em: expect.any(Date),
      },
      select: {
        id: true,
      },
    });
    expect(jwtMock.signAsync).toHaveBeenCalledWith({
      sub: usuario.id,
      tipo: usuario.tipo_usuario,
      ver: usuario.versao_token,
      sid: 'sessao-1',
    });
  });

  it('permite que um perfil desativado entre como usuário comum', async () => {
    usuariosMock.buscarPorEmail.mockResolvedValue({
      ...usuario,
      dois_fatores_email_ativo: false,
      desativado_em: new Date('2026-09-02T12:00:00.000Z'),
    });

    const resultado = await service.signIn(usuario.email, 'Senha!123');

    expect(resultado).toEqual(
      expect.objectContaining({
        requer_segunda_etapa: false,
        access_token: 'jwt-final',
        usuario: expect.objectContaining({
          tipo: 'user',
        }),
      }),
    );
  });

  it('rejeita um registro desativado que ainda possua perfil privilegiado', async () => {
    usuariosMock.buscarPorEmail.mockResolvedValue({
      ...usuario,
      tipo_usuario: 'admin',
      dois_fatores_email_ativo: false,
      desativado_em: new Date('2026-09-02T12:00:00.000Z'),
    });

    await expect(
      service.signIn(usuario.email, 'Senha!123'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwtMock.signAsync).not.toHaveBeenCalled();
  });

  it('não cria desafio quando a senha está incorreta', async () => {
    usuariosMock.buscarPorEmail.mockResolvedValue(usuario);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      service.signIn(usuario.email, 'incorreta'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(twoFactorMock.iniciarLogin).not.toHaveBeenCalled();
    expect(prismaMock.erro_autenticacao.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        usuario_id: usuario.id,
        tipo: 'login',
      }),
    });
  });

  it('lista os erros de autenticação com os dados do usuário', async () => {
    prismaMock.erro_autenticacao.findMany.mockResolvedValue([
      {
        id: 12,
        tipo: 'verificacao',
        criado_em: new Date('2026-08-24T15:30:45.000Z'),
        cadastro: {
          nome: usuario.nome,
          tipo_usuario: usuario.tipo_usuario,
        },
      },
    ]);

    await expect(service.obterRelatoriosErros()).resolves.toEqual([
      expect.objectContaining({
        id: 12,
        usuario: usuario.nome,
        tipoUsuario: usuario.tipo_usuario,
        erro: 'verificacao',
        horario: expect.any(String),
      }),
    ]);
  });

  it('emite o JWT somente depois de confirmar o código do segundo fator', async () => {
    twoFactorMock.verificarCodigo.mockResolvedValue({ usuarioId: 7 });
    prismaMock.cadastro.findFirst.mockResolvedValue(usuario);

    const resultado = await service.confirmarLoginDoisFatores(
      'token-do-desafio',
      '123456',
    );

    expect(twoFactorMock.verificarCodigo).toHaveBeenCalledWith(
      'token-do-desafio',
      '123456',
      'login',
    );
    expect(resultado.access_token).toBe('jwt-final');
    expect(prismaMock.login_evento.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.cadastro.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { desativado_em: null },
            { tipo_usuario: 'user' },
          ],
        }),
      }),
    );
  });

  it('permite concluir o login com um código de recuperação válido', async () => {
    twoFactorMock.verificarCodigoRecuperacao.mockResolvedValue({
      usuarioId: 7,
    });
    prismaMock.cadastro.findFirst.mockResolvedValue(usuario);

    const resultado = await service.confirmarLoginComCodigoRecuperacao(
      'token-do-desafio',
      'ABCD-EFGH',
    );

    expect(twoFactorMock.verificarCodigoRecuperacao).toHaveBeenCalledWith(
      'token-do-desafio',
      'ABCD-EFGH',
      'login',
    );
    expect(resultado.access_token).toBe('jwt-final');
  });

  it('rotaciona o refresh token e emite um novo access token', async () => {
    const refreshTokenAtual = 'a'.repeat(86);
    prismaMock.sessao.findUnique.mockResolvedValue({
      id: 'sessao-1',
      usuario_id: usuario.id,
      versao_token: usuario.versao_token,
      revogada_em: null,
      usuario,
    });

    const resultado = await service.renovarSessao(refreshTokenAtual);

    expect(resultado).toEqual({
      access_token: 'jwt-final',
      refresh_token: expect.stringMatching(/^[A-Za-z0-9_-]{86}$/),
    });
    expect(resultado.refresh_token).not.toBe(refreshTokenAtual);
    expect(jwtMock.signAsync).toHaveBeenCalledWith({
      sub: usuario.id,
      tipo: usuario.tipo_usuario,
      ver: usuario.versao_token,
      sid: 'sessao-1',
    });
    expect(prismaMock.sessao.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'sessao-1',
        usuario_id: usuario.id,
        refresh_token_hash: expect.stringMatching(/^[a-f0-9]{64}$/),
        revogada_em: null,
      },
      data: {
        refresh_token_hash: expect.stringMatching(/^[a-f0-9]{64}$/),
        ultimo_uso_em: expect.any(Date),
      },
    });
  });

  it('rejeita a renovacao de uma sessao revogada', async () => {
    prismaMock.sessao.findUnique.mockResolvedValue({
      id: 'sessao-1',
      usuario_id: usuario.id,
      versao_token: usuario.versao_token,
      revogada_em: new Date(),
      usuario,
    });

    await expect(
      service.renovarSessao('a'.repeat(86)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prismaMock.sessao.updateMany).not.toHaveBeenCalled();
  });

  it('revoga a sessao atual ao sair', async () => {
    prismaMock.login_evento.findFirst.mockResolvedValue({ id: 15 });
    prismaMock.login_evento.update.mockResolvedValue({});

    await service.registrarSaida(usuario.id, 'sessao-1');

    expect(prismaMock.sessao.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'sessao-1',
        usuario_id: usuario.id,
        revogada_em: null,
      },
      data: {
        revogada_em: expect.any(Date),
      },
    });
    expect(prismaMock.login_evento.update).toHaveBeenCalledWith({
      where: { id: 15 },
      data: { saiu_em: expect.any(Date) },
    });
  });
});
