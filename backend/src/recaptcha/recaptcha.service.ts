import {
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type AcaoRecaptcha = 'login' | 'cadastro' | 'recuperar_senha';

const configuracaoPorAcao: Record<
  AcaoRecaptcha,
  { variavel: string; padrao: number }
> = {
  login: {
    variavel: 'RECAPTCHA_SCORE_LOGIN',
    padrao: 0.5,
  },
  cadastro: {
    variavel: 'RECAPTCHA_SCORE_CADASTRO',
    padrao: 0.6,
  },
  recuperar_senha: {
    variavel: 'RECAPTCHA_SCORE_RECUPERACAO',
    padrao: 0.5,
  },
};

interface RespostaRecaptcha {
  success: boolean;
  score?: number;
  action?: string;
  hostname?: string;
  'error-codes'?: string[];
}

@Injectable()
export class RecaptchaService {
  private readonly logger = new Logger(RecaptchaService.name);

  constructor(private readonly configService: ConfigService) {}

  async validar(token: string, acaoEsperada: AcaoRecaptcha) {
    const segredo = this.configService.getOrThrow<string>(
      'RECAPTCHA_KEYS_SECRET',
    );

    let resposta: Response;

    try {
      resposta = await fetch(
        'https://www.google.com/recaptcha/api/siteverify',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            secret: segredo,
            response: token,
          }),
        },
      );
    } catch {
      throw new ServiceUnavailableException(
        'Não foi possível realizar a verificação de segurança.',
      );
    }

    if (!resposta.ok) {
      throw new ServiceUnavailableException(
        'Não foi possível realizar a verificação de segurança.',
      );
    }

    const resultado = (await resposta.json()) as RespostaRecaptcha;
    const scoreMinimo = this.obterScoreMinimo(acaoEsperada);

    if (
      !resultado.success ||
      resultado.action !== acaoEsperada ||
      typeof resultado.score !== 'number' ||
      resultado.score < scoreMinimo
    ) {
      this.logger.warn(
        `reCAPTCHA rejeitado: ${JSON.stringify({
          acaoEsperada,
          acaoRecebida: resultado.action,
          sucesso: resultado.success,
          score: resultado.score,
          scoreMinimo,
          hostname: resultado.hostname,
          erros: resultado['error-codes'],
        })}`,
      );

      throw new ForbiddenException(
        'Não foi possível confirmar a verificação de segurança.',
      );
    }

  }

  private obterScoreMinimo(acao: AcaoRecaptcha) {
    const configuracao = configuracaoPorAcao[acao];
    const valorConfigurado = Number(
      this.configService.get(configuracao.variavel) ??
        this.configService.get('RECAPTCHA_MIN_SCORE') ??
        configuracao.padrao,
    );

    return Number.isFinite(valorConfigurado) &&
      valorConfigurado >= 0 &&
      valorConfigurado <= 1
      ? valorConfigurado
      : configuracao.padrao;
  }
}
