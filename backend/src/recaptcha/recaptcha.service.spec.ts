import {
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { RecaptchaService } from './recaptcha.service';

describe('RecaptchaService', () => {
  const configMock = {
    getOrThrow: jest.fn().mockReturnValue('segredo-de-teste'),
    get: jest.fn().mockReturnValue(undefined),
  };

  let service: RecaptchaService;

  beforeEach(() => {
    jest.clearAllMocks();
    configMock.get.mockReturnValue(undefined);
    service = new RecaptchaService(configMock as unknown as ConfigService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function simularRespostaGoogle(resultado: object, ok = true) {
    return jest.spyOn(global, 'fetch').mockResolvedValue({
      ok,
      json: jest.fn().mockResolvedValue(resultado),
    } as unknown as Response);
  }

  it('aceita token válido para a ação esperada', async () => {
    simularRespostaGoogle({
      success: true,
      score: 0.9,
      action: 'login',
    });

    await expect(service.validar('token', 'login')).resolves.toBeUndefined();
    expect(global.fetch).toHaveBeenCalledWith(
      'https://www.google.com/recaptcha/api/siteverify',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('rejeita pontuação abaixo do limite', async () => {
    simularRespostaGoogle({
      success: true,
      score: 0.2,
      action: 'cadastro',
    });

    await expect(service.validar('token', 'cadastro')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejeita token emitido para outra ação', async () => {
    simularRespostaGoogle({
      success: true,
      score: 0.9,
      action: 'login',
    });

    await expect(
      service.validar('token', 'recuperar_senha'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('aplica o limite configurado especificamente para a ação', async () => {
    configMock.get.mockImplementation((chave: string) =>
      chave === 'RECAPTCHA_SCORE_CADASTRO' ? '0.7' : undefined,
    );
    simularRespostaGoogle({
      success: true,
      score: 0.65,
      action: 'cadastro',
    });

    await expect(service.validar('token', 'cadastro')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('informa indisponibilidade quando não consegue consultar o Google', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('falha de rede'));

    await expect(service.validar('token', 'login')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
