import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { PrismaService } from '../prisma/prisma.service';
import { AuthGuard, type JwtPayload } from './auth.guard';

describe('AuthGuard - perfil desativado', () => {
  const jwtMock = {
    verifyAsync: jest.fn(),
  };
  const prismaMock = {
    sessao: {
      findUnique: jest.fn(),
    },
  };

  let guard: AuthGuard;
  let requisicao: {
    headers: { authorization: string };
    usuario?: JwtPayload;
  };
  let contexto: ExecutionContext;

  const payload: JwtPayload = {
    sub: 7,
    tipo: 'user',
    ver: 1,
    sid: 'sessao-1',
    iat: 1,
    exp: 2,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    requisicao = {
      headers: {
        authorization: 'Bearer jwt-valido',
      },
    };
    contexto = {
      switchToHttp: () => ({
        getRequest: () => requisicao,
      }),
    } as ExecutionContext;
    jwtMock.verifyAsync.mockResolvedValue(payload);

    guard = new AuthGuard(
      jwtMock as unknown as JwtService,
      prismaMock as unknown as PrismaService,
    );
  });

  it('mantém o acesso quando a conta desativada já é usuário comum', async () => {
    prismaMock.sessao.findUnique.mockResolvedValue({
      usuario_id: 7,
      revogada_em: null,
      usuario: {
        desativado_em: new Date('2026-09-02T12:00:00.000Z'),
        versao_token: 1,
        tipo_usuario: 'user',
      },
    });

    await expect(guard.canActivate(contexto)).resolves.toBe(true);
    expect(requisicao.usuario).toEqual(payload);
  });

  it('bloqueia uma conta desativada que ainda tenha perfil privilegiado', async () => {
    jwtMock.verifyAsync.mockResolvedValue({
      ...payload,
      tipo: 'admin',
    });
    prismaMock.sessao.findUnique.mockResolvedValue({
      usuario_id: 7,
      revogada_em: null,
      usuario: {
        desativado_em: new Date('2026-09-02T12:00:00.000Z'),
        versao_token: 1,
        tipo_usuario: 'admin',
      },
    });

    await expect(guard.canActivate(contexto)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('bloqueia um access token cuja sessao foi revogada', async () => {
    prismaMock.sessao.findUnique.mockResolvedValue({
      usuario_id: 7,
      revogada_em: new Date(),
      usuario: {
        desativado_em: null,
        versao_token: 1,
        tipo_usuario: 'user',
      },
    });

    await expect(guard.canActivate(contexto)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
