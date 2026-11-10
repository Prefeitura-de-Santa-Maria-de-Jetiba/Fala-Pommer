import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
    applicationDefault,
    cert,
    getApps,
    initializeApp,
    type App
} from "firebase-admin/app";
import {
    getMessaging,
    type Messaging
} from "firebase-admin/messaging";

import { PrismaService } from "../prisma/prisma.service";
import { type RegistrarTokenPushDto } from "./dto/registrar-token-push.dto";

type NovaMensagemPush = {
    conversaId: number;
    mensagemId: number;
    remetenteId: number;
    remetenteNome: string;
    conteudo: string;
    possuiArquivo: boolean;
};

const CODIGOS_TOKEN_INVALIDO = new Set([
    "messaging/invalid-registration-token",
    "messaging/registration-token-not-registered"
]);

@Injectable()
export class NotificacoesService {
    private readonly logger = new Logger(NotificacoesService.name);
    private readonly messaging: Messaging | null;

    constructor(
        private readonly prisma: PrismaService,
        configService: ConfigService
    ) {
        this.messaging = this.criarClienteFirebase(configService);
    }

    async registrarToken(
        usuarioId: number,
        sessaoId: string,
        dados: RegistrarTokenPushDto
    ) {
        await this.prisma.token_push.upsert({
            where: {
                token: dados.token
            },
            create: {
                token: dados.token,
                usuario_id: usuarioId,
                sessao_id: sessaoId,
                plataforma: dados.plataforma
            },
            update: {
                usuario_id: usuarioId,
                sessao_id: sessaoId,
                plataforma: dados.plataforma
            }
        });
    }

    async removerTokensDaSessao(
        usuarioId: number,
        sessaoId: string
    ) {
        await this.prisma.token_push.deleteMany({
            where: {
                usuario_id: usuarioId,
                sessao_id: sessaoId
            }
        });
    }

    async enviarNovaMensagem(dados: NovaMensagemPush) {
        if (!this.messaging) {
            return;
        }

        try {
            const destinatarios = await this.obterDestinatarios(
                dados.conversaId,
                dados.remetenteId
            );

            if (destinatarios.length === 0) {
                return;
            }

            const registros = await this.prisma.token_push.findMany({
                where: {
                    usuario_id: {
                        in: destinatarios
                    },
                    sessao: {
                        revogada_em: null
                    }
                },
                select: {
                    token: true
                }
            });
            const tokens = Array.from(new Set(
                registros.map((registro) => registro.token)
            ));

            for (let inicio = 0; inicio < tokens.length; inicio += 500) {
                await this.enviarLote(
                    tokens.slice(inicio, inicio + 500),
                    dados
                );
            }
        } catch (erro) {
            this.logger.error(
                "Não foi possível enviar a notificação de nova mensagem.",
                erro instanceof Error ? erro.stack : String(erro)
            );
        }
    }

    private async enviarLote(
        tokens: string[],
        dados: NovaMensagemPush
    ) {
        if (!this.messaging || tokens.length === 0) {
            return;
        }

        const corpo = dados.conteudo.trim()
            ? dados.conteudo.trim().slice(0, 180)
            : dados.possuiArquivo
                ? "Enviou um arquivo."
                : "Você recebeu uma nova mensagem.";
        const resultado = await this.messaging.sendEachForMulticast({
            tokens,
            notification: {
                title: dados.remetenteNome,
                body: corpo
            },
            data: {
                tipo: "nova_mensagem",
                conversaId: String(dados.conversaId),
                mensagemId: String(dados.mensagemId)
            },
            android: {
                priority: "high",
                notification: {
                    channelId: "mensagens_fala_pommer_v2",
                    sound: "notificacao.mp3"
                }
            },
            apns: {
                payload: {
                    aps: {
                        sound: "default"
                    }
                }
            }
        });
        const tokensInvalidos = resultado.responses.flatMap(
            (resposta, indice) => {
                const codigo = resposta.error?.code;

                return codigo && CODIGOS_TOKEN_INVALIDO.has(codigo)
                    ? [tokens[indice]]
                    : [];
            }
        );

        if (tokensInvalidos.length > 0) {
            await this.prisma.token_push.deleteMany({
                where: {
                    token: {
                        in: tokensInvalidos
                    }
                }
            });
        }
    }

    private async obterDestinatarios(
        conversaId: number,
        remetenteId: number
    ) {
        const conversa = await this.prisma.conversa.findUnique({
            where: {
                id: conversaId
            },
            select: {
                tipo: true,
                conversa_participante: {
                    where: {
                        ocultada_em: null,
                        usuario_id: {
                            not: remetenteId
                        },
                        cadastro: {
                            desativado_em: null
                        }
                    },
                    select: {
                        usuario_id: true
                    }
                },
                atendimento_setor: {
                    select: {
                        usuario_id: true,
                        ocultada_para_usuario_em: true,
                        setor: {
                            select: {
                                id: true,
                                secretaria_id: true
                            }
                        }
                    }
                },
                comunidade: {
                    select: {
                        comunidade_usuarios: {
                            where: { tipo_funcao: "seguidor" },
                            select: { usuario_id: true }
                        }
                    }
                }
            }
        });

        if (!conversa) {
            return [];
        }

        if (conversa.tipo === "comunidade") {
            const seguidores = new Set(
                conversa.comunidade?.comunidade_usuarios.map(
                    (seguidor) => seguidor.usuario_id
                ) ?? []
            );

            return conversa.conversa_participante
                .filter((participante) => !seguidores.has(participante.usuario_id))
                .map((participante) => participante.usuario_id);
        }

        if (conversa.tipo !== "setor") {
            return conversa.conversa_participante.map(
                (participante) => participante.usuario_id
            );
        }

        const atendimento = conversa.atendimento_setor;

        if (!atendimento) {
            return [];
        }

        const destinatarios = await this.prisma.cadastro.findMany({
            where: {
                id: {
                    not: remetenteId
                },
                desativado_em: null,
                OR: [
                    ...(
                        atendimento.ocultada_para_usuario_em === null
                            ? [{ id: atendimento.usuario_id }]
                            : []
                    ),
                    {
                        tipo_usuario: "funcionario",
                        setor_id: atendimento.setor.id
                    },
                    ...(
                        atendimento.setor.secretaria_id !== null
                            ? [{
                                tipo_usuario: "admin" as const,
                                secretaria_id:
                                    atendimento.setor.secretaria_id
                            }]
                            : []
                    ),
                    {
                        tipo_usuario: "superAdmin"
                    }
                ]
            },
            select: {
                id: true
            }
        });

        return destinatarios.map((destinatario) => destinatario.id);
    }

    private criarClienteFirebase(configService: ConfigService) {
        const projectId = configService.get<string>("FIREBASE_PROJECT_ID");
        const clientEmail = configService.get<string>("FIREBASE_CLIENT_EMAIL");
        const privateKey = configService.get<string>("FIREBASE_PRIVATE_KEY")
            ?.replace(/\\n/g, "\n");
        const usaCredenciaisPadrao = Boolean(
            configService.get<string>("GOOGLE_APPLICATION_CREDENTIALS")
        );

        if (
            (!projectId || !clientEmail || !privateKey) &&
            !usaCredenciaisPadrao
        ) {
            this.logger.warn(
                "Firebase Admin não configurado; notificações push não serão enviadas."
            );
            return null;
        }

        try {
            const aplicativoExistente = getApps().find(
                (aplicativo) => aplicativo.name === "fala-pommer-backend"
            );
            const aplicativo: App = aplicativoExistente ?? initializeApp({
                credential: usaCredenciaisPadrao
                    ? applicationDefault()
                    : cert({
                        projectId: projectId!,
                        clientEmail: clientEmail!,
                        privateKey: privateKey!
                    })
            }, "fala-pommer-backend");

            return getMessaging(aplicativo);
        } catch (erro) {
            this.logger.error(
                "Não foi possível configurar o Firebase Admin.",
                erro instanceof Error ? erro.stack : String(erro)
            );
            return null;
        }
    }
}
