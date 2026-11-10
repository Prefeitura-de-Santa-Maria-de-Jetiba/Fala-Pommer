import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TwoFactorEmailService } from './two-factor-email.service';
import { RecaptchaService } from '../recaptcha/recaptcha.service';

describe('AuthController - rotas de autenticação em duas etapas', () => {
  const authMock = {
    signIn: jest.fn(),
    confirmarLoginDoisFatores: jest.fn(),
    confirmarLoginComCodigoRecuperacao: jest.fn(),
    renovarSessao: jest.fn(),
    registrarSaida: jest.fn(),
  };
  const twoFactorMock = {
    reenviarCodigoLogin: jest.fn(),
    obterStatus: jest.fn(),
    iniciarAtivacao: jest.fn(),
    confirmarAtivacao: jest.fn(),
    solicitarDesativacao: jest.fn(),
    confirmarDesativacao: jest.fn(),
    confirmarDesativacaoComCodigoRecuperacao: jest.fn(),
    reenviarCodigoConfiguracao: jest.fn(),
  };
  const recaptchaMock = {
    validar: jest.fn(),
  };

  let controller: AuthController;
  const requisicao = {
    headers: {},
    usuario: {
      sub: 7,
      tipo: 'user',
      sid: 'sessao-1',
    },
  };
  const resposta = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AuthController(
      authMock as unknown as AuthService,
      twoFactorMock as unknown as TwoFactorEmailService,
      recaptchaMock as unknown as RecaptchaService,
    );
  });

  it('delega confirmação, recuperação e reenvio do segundo fator do login', async () => {
    authMock.confirmarLoginDoisFatores.mockResolvedValue({
      access_token: 'jwt',
    });
    authMock.confirmarLoginComCodigoRecuperacao.mockResolvedValue({
      access_token: 'jwt',
    });
    twoFactorMock.reenviarCodigoLogin.mockResolvedValue({ token: 'token' });

    await controller.confirmarLoginDoisFatores({
      token: 'token',
      codigo: '123456',
    }, requisicao as never, resposta as never);
    await controller.confirmarLoginComCodigoRecuperacao(
      {
        token: 'token',
        codigoRecuperacao: 'ABCD-EFGH',
      },
      requisicao as never,
      resposta as never,
    );
    await controller.reenviarCodigoLoginDoisFatores({ token: 'token' });

    expect(authMock.confirmarLoginDoisFatores).toHaveBeenCalledWith(
      'token',
      '123456',
    );
    expect(authMock.confirmarLoginComCodigoRecuperacao).toHaveBeenCalledWith(
      'token',
      'ABCD-EFGH',
    );
    expect(twoFactorMock.reenviarCodigoLogin).toHaveBeenCalledWith('token');
  });

  it('retorna o status usando apenas o usuário autenticado', async () => {
    twoFactorMock.obterStatus.mockResolvedValue({ ativo: true });

    await expect(
      controller.statusDoisFatores(requisicao as never),
    ).resolves.toEqual({ ativo: true });
    expect(twoFactorMock.obterStatus).toHaveBeenCalledWith(7);
  });

  it('delega ativação e confirmação com o usuário autenticado', async () => {
    twoFactorMock.iniciarAtivacao.mockResolvedValue({ token: 'token' });
    twoFactorMock.confirmarAtivacao.mockResolvedValue({
      codigos_recuperacao: ['ABCD-EFGH'],
    });

    await controller.configurarDoisFatores(requisicao as never, {
      senha: 'Senha!123',
    });
    await controller.confirmarDoisFatores(requisicao as never, {
      token: 'token',
      codigo: '123456',
    });

    expect(twoFactorMock.iniciarAtivacao).toHaveBeenCalledWith(7, 'Senha!123');
    expect(twoFactorMock.confirmarAtivacao).toHaveBeenCalledWith(
      7,
      'token',
      '123456',
    );
  });

  it('delega os dois caminhos de desativação', async () => {
    twoFactorMock.solicitarDesativacao.mockResolvedValue({ token: 'token' });
    twoFactorMock.confirmarDesativacao.mockResolvedValue({ mensagem: 'ok' });
    twoFactorMock.confirmarDesativacaoComCodigoRecuperacao.mockResolvedValue({
      mensagem: 'ok',
    });

    await controller.solicitarDesativacaoDoisFatores(requisicao as never, {
      senha: 'Senha!123',
    });
    await controller.desativarDoisFatores(requisicao as never, {
      token: 'token',
      codigo: '123456',
    });
    await controller.desativarDoisFatoresComCodigoRecuperacao(
      requisicao as never,
      {
        senha: 'Senha!123',
        codigoRecuperacao: 'ABCD-EFGH',
      },
    );

    expect(twoFactorMock.solicitarDesativacao).toHaveBeenCalledWith(
      7,
      'Senha!123',
    );
    expect(twoFactorMock.confirmarDesativacao).toHaveBeenCalledWith(
      7,
      'token',
      '123456',
    );
    expect(
      twoFactorMock.confirmarDesativacaoComCodigoRecuperacao,
    ).toHaveBeenCalledWith(7, 'Senha!123', 'ABCD-EFGH');
  });

  it('mantém o reenvio de configuração vinculado ao usuário e à finalidade', async () => {
    twoFactorMock.reenviarCodigoConfiguracao.mockResolvedValue({
      token: 'token',
    });

    await controller.reenviarCodigoDoisFatores(requisicao as never, {
      token: 'token',
      finalidade: 'ativacao',
    });

    expect(twoFactorMock.reenviarCodigoConfiguracao).toHaveBeenCalledWith(
      7,
      'token',
      'ativacao',
    );
  });

  it('usa o cookie web na renovacao e o remove no logout', async () => {
    const refreshToken = 'a'.repeat(86);
    const requisicaoWeb = {
      ...requisicao,
      headers: {
        cookie: `fala_pommer_refresh_token=${refreshToken}`,
      },
    };
    authMock.renovarSessao.mockResolvedValue({ access_token: 'novo-jwt' });
    authMock.registrarSaida.mockResolvedValue({ mensagem: 'ok' });

    await controller.renovarSessao(
      {},
      requisicaoWeb as never,
      resposta as never,
    );
    await controller.logout(requisicao as never, resposta as never);

    expect(authMock.renovarSessao).toHaveBeenCalledWith(refreshToken);
    expect(authMock.registrarSaida).toHaveBeenCalledWith(7, 'sessao-1');
    expect(resposta.clearCookie).toHaveBeenCalledWith(
      'fala_pommer_refresh_token',
      expect.objectContaining({ httpOnly: true, path: '/auth' }),
    );
  });

  it('entrega refresh token no corpo somente para o aplicativo', async () => {
    const refreshToken = 'a'.repeat(86);
    const novoRefreshToken = 'b'.repeat(86);
    const requisicaoCapacitor = {
      headers: {
        'x-fala-pommer-cliente': 'capacitor',
      },
    };
    authMock.renovarSessao.mockResolvedValue({
      access_token: 'novo-jwt',
      refresh_token: novoRefreshToken,
    });

    const resultado = await controller.renovarSessao(
      { refreshToken },
      requisicaoCapacitor as never,
      resposta as never,
    );

    expect(authMock.renovarSessao).toHaveBeenCalledWith(refreshToken);
    expect(resultado).toEqual({
      access_token: 'novo-jwt',
      refresh_token: novoRefreshToken,
    });
    expect(resposta.cookie).not.toHaveBeenCalled();
  });

  it('guarda o refresh token do login web em cookie HttpOnly', async () => {
    authMock.signIn.mockResolvedValue({
      access_token: 'jwt',
      refresh_token: 'c'.repeat(86),
      usuario: { tipo: 'user' },
    });

    const resultado = await controller.login(
      {
        email: 'usuario@teste.com',
        senha: 'Senha!123',
        recaptchaToken: 'token-recaptcha',
      },
      requisicao as never,
      resposta as never,
    );

    expect(resultado).toEqual({
      access_token: 'jwt',
      usuario: { tipo: 'user' },
    });
    expect(recaptchaMock.validar).toHaveBeenCalledWith(
      'token-recaptcha',
      'login',
    );
    expect(resposta.cookie).toHaveBeenCalledWith(
      'fala_pommer_refresh_token',
      'c'.repeat(86),
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/auth',
      }),
    );
  });
});
