// Gerencia os desafios da verificação em duas etapas enviada por e-mail.
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes, randomInt } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { ClsService } from 'nestjs-cls';

import type { Prisma } from '../generated/prisma/client';
import { desafio_2fa_finalidade } from '../generated/prisma/enums';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { criarArquivoLogMonitorSeguranca } from 'src/security-log/security-log';

const DIGITOS_CODIGO = 6;
const VALIDADE_CODIGO_MS = 5 * 60 * 1000;
const INTERVALO_REENVIO_MS = 60 * 1000;
const MAXIMO_TENTATIVAS = 5;
const MAXIMO_REENVIOS = 3;
const JANELA_DESAFIOS_MS = 15 * 60 * 1000;
const MAXIMO_DESAFIOS_POR_JANELA = 5;
const SALT_ROUNDS = 10;
const QUANTIDADE_CODIGOS_RECUPERACAO = 8;
const TAMANHO_CODIGO_RECUPERACAO = 8;
const CARACTERES_CODIGO_RECUPERACAO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const DIFERENCA_UTC_SAO_PAULO_EM_MS = 3 * 60 * 60 * 1000;

const MENSAGEM_DESAFIO_INVALIDO = 'O código informado é inválido ou expirou.';
const MENSAGEM_CODIGO_RECUPERACAO_INVALIDO =
  'O código de recuperação informado é inválido.';

function agoraEmSaoPaulo() {
  return new Date(Date.now() - DIFERENCA_UTC_SAO_PAULO_EM_MS);
}

export interface DesafioDoisFatoresCriado {
  token: string;
  codigo: string;
  expiraEm: Date;
}

interface DesafioDoisFatoresReenviado {
  codigo: string;
  expiraEm: Date;
  usuarioId: number;
}

@Injectable()
export class TwoFactorEmailService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly cls: ClsService
  ) {}

  async obterStatus(usuarioId: number): Promise<{ ativo: boolean }> {
    const usuario = await this.prisma.cadastro.findUnique({
      where: {
        id: usuarioId,
      },
      select: {
        dois_fatores_email_ativo: true,
      },
    });

    if (!usuario) {
      throw new UnauthorizedException('Usuário inválido.');
    }

    return {
      ativo: usuario.dois_fatores_email_ativo,
    };
  }

  async iniciarLogin(usuarioId: number) {
    const usuario = await this.obterUsuarioConfiguracao(usuarioId);

    if (!usuario.dois_fatores_email_ativo) {
      throw new BadRequestException(
        'A verificação em duas etapas não está ativa.',
      );
    }

    const desafio = await this.criarDesafio(usuario.id, 'login');

    await this.enviarDesafioPorEmail(
      usuario.email,
      desafio.codigo,
      usuario.id,
      'login',
    );

    return this.criarRespostaDesafio(
      desafio.token,
      usuario.email,
      desafio.expiraEm,
    );
  }

  async reenviarCodigoLogin(token: string) {
    const desafio = await this.reenviarCodigo(token, 'login');
    const usuario = await this.obterUsuarioConfiguracao(desafio.usuarioId);

    if (!usuario.dois_fatores_email_ativo) {
      await this.invalidarDesafiosPendentes(usuario.id, 'login');

      throw new UnauthorizedException(MENSAGEM_DESAFIO_INVALIDO);
    }

    await this.enviarDesafioPorEmail(
      usuario.email,
      desafio.codigo,
      usuario.id,
      'login',
    );

    return this.criarRespostaDesafio(token, usuario.email, desafio.expiraEm);
  }

  async iniciarAtivacao(usuarioId: number, senha: string) {
    const usuario = await this.obterUsuarioConfiguracao(usuarioId);

    await this.validarSenha(senha, usuario.senha);

    if (usuario.dois_fatores_email_ativo) {
      throw new BadRequestException(
        'A verificação em duas etapas já está ativa.',
      );
    }

    const desafio = await this.criarDesafio(usuario.id, 'ativacao');

    await this.enviarDesafioPorEmail(
      usuario.email,
      desafio.codigo,
      usuario.id,
      'ativacao',
    );

    return this.criarRespostaDesafio(
      desafio.token,
      usuario.email,
      desafio.expiraEm,
    );
  }

  async confirmarAtivacao(usuarioId: number, token: string, codigo: string) {
    const status = await this.obterStatus(usuarioId);

    if (status.ativo) {
      throw new BadRequestException(
        'A verificação em duas etapas já está ativa.',
      );
    }

    await this.verificarCodigo(token, codigo, 'ativacao', usuarioId);
    const codigosRecuperacao = this.gerarCodigosRecuperacao();
    const codigosHash = await Promise.all(
      codigosRecuperacao.map((codigoRecuperacao) =>
        bcrypt.hash(codigoRecuperacao, SALT_ROUNDS),
      ),
    );

    await this.prisma.$transaction(async (transacao) => {
      const resultado = await transacao.cadastro.updateMany({
        where: {
          id: usuarioId,
          dois_fatores_email_ativo: false,
        },
        data: {
          dois_fatores_email_ativo: true,
          dois_fatores_email_confirmado_em: new Date(),
        },
      });

      if (resultado.count !== 1) {
        throw new BadRequestException(
          'Não foi possível ativar a verificação em duas etapas.',
        );
      }

      await transacao.codigo_recuperacao_2fa.deleteMany({
        where: {
          usuario_id: usuarioId,
        },
      });

      await transacao.codigo_recuperacao_2fa.createMany({
        data: codigosHash.map((codigoHash) => ({
          usuario_id: usuarioId,
          codigo_hash: codigoHash,
        })),
      });
    });

    return {
      mensagem: 'Verificação em duas etapas ativada com sucesso.',
      codigos_recuperacao: codigosRecuperacao,
    };
  }

  async solicitarDesativacao(usuarioId: number, senha: string) {
    const usuario = await this.obterUsuarioConfiguracao(usuarioId);

    await this.validarSenha(senha, usuario.senha);

    if (!usuario.dois_fatores_email_ativo) {
      throw new BadRequestException(
        'A verificação em duas etapas não está ativa.',
      );
    }

    const desafio = await this.criarDesafio(usuario.id, 'desativacao');

    await this.enviarDesafioPorEmail(
      usuario.email,
      desafio.codigo,
      usuario.id,
      'desativacao',
    );

    return this.criarRespostaDesafio(
      desafio.token,
      usuario.email,
      desafio.expiraEm,
    );
  }

  async confirmarDesativacao(usuarioId: number, token: string, codigo: string) {
    const status = await this.obterStatus(usuarioId);

    if (!status.ativo) {
      throw new BadRequestException(
        'A verificação em duas etapas não está ativa.',
      );
    }

    await this.verificarCodigo(token, codigo, 'desativacao', usuarioId);

    return this.desativarDoisFatoresDoUsuario(usuarioId);
  }

  async confirmarDesativacaoComCodigoRecuperacao(
    usuarioId: number,
    senha: string,
    codigoRecuperacao: string,
  ) {
    const usuario = await this.obterUsuarioConfiguracao(usuarioId);

    await this.validarSenha(senha, usuario.senha);

    if (!usuario.dois_fatores_email_ativo) {
      throw new BadRequestException(
        'A verificação em duas etapas não está ativa.',
      );
    }

    await this.consumirCodigoRecuperacaoDoUsuario(
      usuario.id,
      codigoRecuperacao,
    );

    return this.desativarDoisFatoresDoUsuario(usuarioId);
  }

  private async desativarDoisFatoresDoUsuario(usuarioId: number) {
    await this.prisma.$transaction(async (transacao) => {
      const resultado = await transacao.cadastro.updateMany({
        where: {
          id: usuarioId,
          dois_fatores_email_ativo: true,
        },
        data: {
          dois_fatores_email_ativo: false,
          dois_fatores_email_confirmado_em: null,
        },
      });

      if (resultado.count !== 1) {
        throw new BadRequestException(
          'Não foi possível desativar a verificação em duas etapas.',
        );
      }

      await transacao.desafio_login_2fa.updateMany({
        where: {
          usuario_id: usuarioId,
          usado_em: null,
        },
        data: {
          usado_em: new Date(),
        },
      });

      await transacao.codigo_recuperacao_2fa.deleteMany({
        where: {
          usuario_id: usuarioId,
        },
      });
    });

    return {
      mensagem: 'Verificação em duas etapas desativada com sucesso.',
    };
  }

  async reenviarCodigoConfiguracao(
    usuarioId: number,
    token: string,
    finalidade: desafio_2fa_finalidade,
  ) {
    if (finalidade === 'login') {
      throw new BadRequestException('Finalidade do desafio inválida.');
    }

    const usuario = await this.obterUsuarioConfiguracao(usuarioId);

    if (
      (finalidade === 'ativacao' && usuario.dois_fatores_email_ativo) ||
      (finalidade === 'desativacao' && !usuario.dois_fatores_email_ativo)
    ) {
      throw new BadRequestException(
        'O desafio não corresponde ao estado atual.',
      );
    }

    const desafio = await this.reenviarCodigo(token, finalidade, usuarioId);

    await this.enviarDesafioPorEmail(
      usuario.email,
      desafio.codigo,
      usuario.id,
      finalidade,
    );

    return this.criarRespostaDesafio(token, usuario.email, desafio.expiraEm);
  }

  async criarDesafio(
    usuarioId: number,
    finalidade: desafio_2fa_finalidade,
  ): Promise<DesafioDoisFatoresCriado> {
    if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
      throw new BadRequestException('Usuário inválido.');
    }

    return this.prisma.$transaction(async (transacao) => {
      const usuariosBloqueados = await transacao.$queryRaw<
        Array<{ id: number }>
      >`
        SELECT id
        FROM cadastro
        WHERE id = ${usuarioId}
        FOR UPDATE
      `;

      if (usuariosBloqueados.length !== 1) {
        throw new BadRequestException('Usuário inválido.');
      }

      const agora = new Date();

      await this.validarLimiteCriacaoDesafio(
        transacao,
        usuarioId,
        finalidade,
        agora,
      );

      const token = randomBytes(32).toString('hex');
      const codigo = this.gerarCodigo();
      const expiraEm = new Date(agora.getTime() + VALIDADE_CODIGO_MS);
      const tokenHash = this.gerarHashToken(token);
      const codigoHash = await bcrypt.hash(codigo, SALT_ROUNDS);

      await transacao.desafio_login_2fa.updateMany({
        where: {
          usuario_id: usuarioId,
          finalidade,
          usado_em: null,
        },
        data: {
          usado_em: agora,
        },
      });

      await transacao.desafio_login_2fa.create({
        data: {
          usuario_id: usuarioId,
          finalidade,
          token_hash: tokenHash,
          codigo_hash: codigoHash,
          expira_em: expiraEm,
          ultimo_envio_em: agora,
        },
      });

      return {
        token,
        codigo,
        expiraEm,
      };
    });
  }

  async reenviarCodigo(
    token: string,
    finalidade: desafio_2fa_finalidade,
    usuarioIdEsperado?: number,
  ): Promise<DesafioDoisFatoresReenviado> {
    const agora = new Date();
    const tokenHash = this.gerarHashToken(token);

    const desafio = await this.prisma.desafio_login_2fa.findUnique({
      where: {
        token_hash: tokenHash,
      },
    });

    this.validarDesafio(desafio, finalidade, agora, usuarioIdEsperado);

    const proximoEnvioEm = new Date(
      desafio.ultimo_envio_em.getTime() + INTERVALO_REENVIO_MS,
    );

    if (proximoEnvioEm.getTime() > agora.getTime()) {
      throw new HttpException(
        'Aguarde antes de solicitar outro código.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (desafio.reenvios >= MAXIMO_REENVIOS) {
      throw new HttpException(
        'Limite de reenvios atingido. Inicie uma nova verificação mais tarde.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const codigo = this.gerarCodigo();
    const codigoHash = await bcrypt.hash(codigo, SALT_ROUNDS);
    const expiraEm = new Date(agora.getTime() + VALIDADE_CODIGO_MS);
    const limiteReenvio = new Date(agora.getTime() - INTERVALO_REENVIO_MS);

    const resultado = await this.prisma.desafio_login_2fa.updateMany({
      where: {
        id: desafio.id,
        finalidade,
        usado_em: null,
        expira_em: {
          gt: agora,
        },
        tentativas: {
          lt: MAXIMO_TENTATIVAS,
        },
        reenvios: {
          lt: MAXIMO_REENVIOS,
        },
        ultimo_envio_em: {
          lte: limiteReenvio,
        },
      },
      data: {
        codigo_hash: codigoHash,
        expira_em: expiraEm,
        ultimo_envio_em: agora,
        reenvios: {
          increment: 1,
        },
      },
    });

    if (resultado.count !== 1) {
      throw new HttpException(
        'Não foi possível reenviar o código agora.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return {
      codigo,
      expiraEm,
      usuarioId: desafio.usuario_id,
    };
  }

  async verificarCodigo(
    token: string,
    codigo: string,
    finalidade: desafio_2fa_finalidade,
    usuarioIdEsperado?: number,
  ): Promise<{ usuarioId: number }> {
    const agora = new Date();
    const tokenHash = this.gerarHashToken(token);

    const desafio = await this.prisma.desafio_login_2fa.findUnique({
      where: {
        token_hash: tokenHash,
      },
    });

    try {
      this.validarDesafio(desafio, finalidade, agora, usuarioIdEsperado);
    } catch (erro) {
      if (desafio) {
        await this.registrarErroVerificacao(desafio.usuario_id);
      }

      throw erro;
    }

    const formatoValido = new RegExp(`^\\d{${DIGITOS_CODIGO}}$`).test(codigo);
    const codigoCorreto =
      formatoValido && (await bcrypt.compare(codigo, desafio.codigo_hash));

    if (!codigoCorreto) {
      await this.registrarTentativaInvalida(desafio.id, finalidade, agora);
      await this.registrarErroVerificacao(desafio.usuario_id);

      criarArquivoLogMonitorSeguranca.call(
          this,
          "TWO_FAILED_FACTORS",
          "/auth/2fa/confirm",
          401
      );

      throw new UnauthorizedException(MENSAGEM_DESAFIO_INVALIDO);
    }

    const resultado = await this.prisma.desafio_login_2fa.updateMany({
      where: {
        id: desafio.id,
        finalidade,
        usado_em: null,
        expira_em: {
          gt: agora,
        },
        tentativas: {
          lt: MAXIMO_TENTATIVAS,
        },
      },
      data: {
        usado_em: agora,
      },
    });

    if (resultado.count !== 1) {
      await this.registrarErroVerificacao(desafio.usuario_id);
      throw new UnauthorizedException(MENSAGEM_DESAFIO_INVALIDO);
    }

    return {
      usuarioId: desafio.usuario_id,
    };
  }

  async verificarCodigoRecuperacao(
    token: string,
    codigoRecuperacao: string,
    finalidade: desafio_2fa_finalidade,
    usuarioIdEsperado?: number,
  ): Promise<{ usuarioId: number }> {
    const agora = new Date();
    const tokenHash = this.gerarHashToken(token);

    const desafio = await this.prisma.desafio_login_2fa.findUnique({
      where: {
        token_hash: tokenHash,
      },
    });

    try {
      this.validarDesafio(desafio, finalidade, agora, usuarioIdEsperado);
    } catch (erro) {
      if (desafio) {
        await this.registrarErroVerificacao(desafio.usuario_id);
      }

      throw erro;
    }

    const codigosDisponiveis =
      await this.prisma.codigo_recuperacao_2fa.findMany({
        where: {
          usuario_id: desafio.usuario_id,
          usado_em: null,
        },
        select: {
          id: true,
          codigo_hash: true,
        },
      });

    const codigoNormalizado = codigoRecuperacao.trim().toUpperCase();
    const comparacoes = await Promise.all(
      codigosDisponiveis.map((codigoSalvo) =>
        bcrypt.compare(codigoNormalizado, codigoSalvo.codigo_hash),
      ),
    );
    const indiceCorreto = comparacoes.findIndex(Boolean);

    if (indiceCorreto === -1) {
      await this.registrarTentativaInvalida(desafio.id, finalidade, agora);
      await this.registrarErroVerificacao(desafio.usuario_id);

      throw new UnauthorizedException(MENSAGEM_DESAFIO_INVALIDO);
    }

    const codigoEncontrado = codigosDisponiveis[indiceCorreto];

    try {
      await this.prisma.$transaction(async (transacao) => {
        const desafioConsumido = await transacao.desafio_login_2fa.updateMany({
          where: {
            id: desafio.id,
            finalidade,
            usado_em: null,
            expira_em: {
              gt: agora,
            },
            tentativas: {
              lt: MAXIMO_TENTATIVAS,
            },
          },
          data: {
            usado_em: agora,
          },
        });

        const codigoConsumido =
          await transacao.codigo_recuperacao_2fa.updateMany({
            where: {
              id: codigoEncontrado.id,
              usuario_id: desafio.usuario_id,
              usado_em: null,
            },
            data: {
              usado_em: agora,
            },
          });

        if (desafioConsumido.count !== 1 || codigoConsumido.count !== 1) {
          throw new UnauthorizedException(MENSAGEM_DESAFIO_INVALIDO);
        }
      });
    } catch (erro) {
      if (erro instanceof UnauthorizedException) {
        await this.registrarErroVerificacao(desafio.usuario_id);
      }

      throw erro;
    }

    return {
      usuarioId: desafio.usuario_id,
    };
  }

  async invalidarDesafiosPendentes(
    usuarioId: number,
    finalidade?: desafio_2fa_finalidade,
  ): Promise<void> {
    await this.prisma.desafio_login_2fa.updateMany({
      where: {
        usuario_id: usuarioId,
        finalidade,
        usado_em: null,
      },
      data: {
        usado_em: new Date(),
      },
    });
  }

  private gerarCodigo(): string {
    return randomInt(0, 10 ** DIGITOS_CODIGO)
      .toString()
      .padStart(DIGITOS_CODIGO, '0');
  }

  private gerarCodigosRecuperacao(): string[] {
    const codigos = new Set<string>();

    while (codigos.size < QUANTIDADE_CODIGOS_RECUPERACAO) {
      let codigo = '';

      for (let indice = 0; indice < TAMANHO_CODIGO_RECUPERACAO; indice += 1) {
        codigo +=
          CARACTERES_CODIGO_RECUPERACAO[
            randomInt(0, CARACTERES_CODIGO_RECUPERACAO.length)
          ];
      }

      codigos.add(`${codigo.slice(0, 4)}-${codigo.slice(4)}`);
    }

    return Array.from(codigos);
  }

  private async consumirCodigoRecuperacaoDoUsuario(
    usuarioId: number,
    codigoRecuperacao: string,
  ): Promise<void> {
    const codigosDisponiveis =
      await this.prisma.codigo_recuperacao_2fa.findMany({
        where: {
          usuario_id: usuarioId,
          usado_em: null,
        },
        select: {
          id: true,
          codigo_hash: true,
        },
      });

    const codigoNormalizado = codigoRecuperacao.trim().toUpperCase();
    const comparacoes = await Promise.all(
      codigosDisponiveis.map((codigoSalvo) =>
        bcrypt.compare(codigoNormalizado, codigoSalvo.codigo_hash),
      ),
    );
    const indiceCorreto = comparacoes.findIndex(Boolean);

    if (indiceCorreto === -1) {
      throw new UnauthorizedException(MENSAGEM_CODIGO_RECUPERACAO_INVALIDO);
    }

    const resultado = await this.prisma.codigo_recuperacao_2fa.updateMany({
      where: {
        id: codigosDisponiveis[indiceCorreto].id,
        usuario_id: usuarioId,
        usado_em: null,
      },
      data: {
        usado_em: new Date(),
      },
    });

    if (resultado.count !== 1) {
      throw new UnauthorizedException(MENSAGEM_CODIGO_RECUPERACAO_INVALIDO);
    }
  }

  private gerarHashToken(token: string): string {
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      throw new UnauthorizedException(MENSAGEM_DESAFIO_INVALIDO);
    }

    return createHash('sha256').update(token).digest('hex');
  }

  private registrarErroVerificacao(usuarioId: number) {
    return this.prisma.erro_autenticacao.create({
      data: {
        usuario_id: usuarioId,
        tipo: 'verificacao',
        criado_em: agoraEmSaoPaulo(),
      },
    });
  }

  private validarDesafio(
    desafio: {
      id: number;
      usuario_id: number;
      finalidade: desafio_2fa_finalidade;
      codigo_hash: string;
      tentativas: number;
      expira_em: Date;
      usado_em: Date | null;
      ultimo_envio_em: Date;
    } | null,
    finalidade: desafio_2fa_finalidade,
    agora: Date,
    usuarioIdEsperado?: number,
  ): asserts desafio {
    if (
      !desafio ||
      (usuarioIdEsperado !== undefined &&
        desafio.usuario_id !== usuarioIdEsperado) ||
      desafio.finalidade !== finalidade ||
      desafio.usado_em !== null ||
      desafio.expira_em.getTime() <= agora.getTime() ||
      desafio.tentativas >= MAXIMO_TENTATIVAS
    ) {
      throw new UnauthorizedException(MENSAGEM_DESAFIO_INVALIDO);
    }
  }

  private async obterUsuarioConfiguracao(usuarioId: number) {
    const usuario = await this.prisma.cadastro.findUnique({
      where: {
        id: usuarioId,
      },
      select: {
        id: true,
        email: true,
        senha: true,
        dois_fatores_email_ativo: true,
      },
    });

    if (!usuario) {
      throw new UnauthorizedException('Usuário inválido.');
    }

    return usuario;
  }

  private async validarLimiteCriacaoDesafio(
    transacao: Prisma.TransactionClient,
    usuarioId: number,
    finalidade: desafio_2fa_finalidade,
    agora: Date,
  ): Promise<void> {
    const inicioJanela = new Date(agora.getTime() - JANELA_DESAFIOS_MS);
    const [desafioMaisRecente, quantidadeNaJanela] = await Promise.all([
      transacao.desafio_login_2fa.findFirst({
        where: {
          usuario_id: usuarioId,
          finalidade,
        },
        orderBy: {
          ultimo_envio_em: 'desc',
        },
        select: {
          ultimo_envio_em: true,
        },
      }),
      transacao.desafio_login_2fa.count({
        where: {
          usuario_id: usuarioId,
          finalidade,
          criado_em: {
            gte: inicioJanela,
          },
        },
      }),
    ]);

    if (
      desafioMaisRecente &&
      desafioMaisRecente.ultimo_envio_em.getTime() + INTERVALO_REENVIO_MS >
        agora.getTime()
    ) {
      throw new HttpException(
        'Aguarde antes de solicitar outro código.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (quantidadeNaJanela >= MAXIMO_DESAFIOS_POR_JANELA) {
      throw new HttpException(
        'Limite de solicitações atingido. Tente novamente mais tarde.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async validarSenha(senha: string, senhaHash: string): Promise<void> {
    const senhaCorreta = await bcrypt.compare(senha, senhaHash);

    if (!senhaCorreta) {
      throw new UnauthorizedException('Senha inválida.');
    }
  }

  private async enviarDesafioPorEmail(
    email: string,
    codigo: string,
    usuarioId: number,
    finalidade: desafio_2fa_finalidade,
  ): Promise<void> {
    try {
      await this.emailService.enviarCodigoDoisFatores(email, codigo);
    } catch {
      await this.invalidarDesafiosPendentes(usuarioId, finalidade);

      throw new ServiceUnavailableException(
        'Não foi possível enviar o código de verificação.',
      );
    }
  }

  private criarRespostaDesafio(token: string, email: string, expiraEm: Date) {
    return {
      mensagem: 'Código de verificação enviado para o seu e-mail.',
      token,
      email_mascarado: this.mascararEmail(email),
      expira_em: expiraEm,
    };
  }

  private mascararEmail(email: string): string {
    const separador = email.lastIndexOf('@');

    if (separador <= 0) {
      return '***';
    }

    const nome = email.slice(0, separador);
    const dominio = email.slice(separador + 1);
    const nomeMascarado =
      nome.length === 1
        ? `${nome[0]}***`
        : `${nome[0]}***${nome[nome.length - 1]}`;

    return `${nomeMascarado}@${dominio}`;
  }

  private async registrarTentativaInvalida(
    desafioId: number,
    finalidade: desafio_2fa_finalidade,
    agora: Date,
  ): Promise<void> {
    await this.prisma.desafio_login_2fa.updateMany({
      where: {
        id: desafioId,
        finalidade,
        usado_em: null,
        expira_em: {
          gt: agora,
        },
        tentativas: {
          lt: MAXIMO_TENTATIVAS,
        },
      },
      data: {
        tentativas: {
          increment: 1,
        },
      },
    });
  }
}
