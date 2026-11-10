// Contém as regras de negócio relacionadas às conversas.
import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException
} from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { CriarAvaliacaoDto } from "./dto/criar-avaliacao.dto";
import { TransferirConversaDto } from "./dto/transferir-conversa.dto";
import { Prisma } from "../generated/prisma/client";
import { NotificacoesService } from "../notificacoes/notificacoes.service";
import { MensagensCriptografiaService } from "../criptografia/mensagens-criptografia.service";

export type ArquivoMensagemUpload = {
    originalname: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
};

const TEMPO_EXPIRACAO_DIGITACAO_MS = 5_000;

type EstadoDigitacao = {
    conversaId: number;
    usuarioId: number;
    nome: string;
    expiraEm: number;
};

@Injectable()
export class ConversasService {
    private readonly usuariosDigitando =
        new Map<string, EstadoDigitacao>();

    constructor(
        private readonly prisma: PrismaService,
        private readonly notificacoesService: NotificacoesService,
        private readonly criptografiaMensagens: MensagensCriptografiaService
    ) {}

    async listarAvaliacoes() {
        const inicioPeriodo = new Date();
        inicioPeriodo.setDate(inicioPeriodo.getDate() - 30);

        const avaliacoes = await this.prisma.avaliacao.findMany({
            where: {
                criada_em: {
                    gte: inicioPeriodo
                }
            },
            orderBy: [
                { criada_em: "desc" },
                { id: "desc" }
            ],
            select: {
                id: true,
                nota: true,
                descricao: true,
                criada_em: true,
                avaliador: {
                    select: {
                        id: true,
                        nome: true
                    }
                },
                finalizacao: {
                    select: {
                        conversa: {
                            select: {
                                atendimento_setor: {
                                    select: {
                                        setor: {
                                            select: {
                                                id: true,
                                                setor: true,
                                                sigla_setor: true,
                                                secretaria: {
                                                    select: {
                                                        secretaria: true
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        return avaliacoes.flatMap((avaliacao) => {
            const setor =
                avaliacao.finalizacao.conversa.atendimento_setor?.setor;

            if (!setor) return [];

            return [{
                id: avaliacao.id,
                nota: avaliacao.nota,
                descricao: avaliacao.descricao,
                criadaEm: avaliacao.criada_em,
                avaliador: {
                    id: avaliacao.avaliador.id,
                    nome: avaliacao.avaliador.nome
                },
                setor: {
                    id: setor.id,
                    nome: setor.setor,
                    sigla: setor.sigla_setor,
                    secretaria: setor.secretaria?.secretaria ?? null
                }
            }];
        });
    }

    /*
     * Lista as conversas privadas do usuário autenticado.
     * O superAdmin também pode fiscalizar conversas entre
     * perfis inferiores, desde que não exista outro superAdmin.
     */
    async listar(usuarioLogadoId: number) {
        const usuarioLogado =
            await this.prisma.cadastro.findUnique({
                where: {
                    id: usuarioLogadoId
                },

                select: {
                    tipo_usuario: true
                }
            });

        if (!usuarioLogado) {
            throw new NotFoundException(
                "Usuário autenticado não encontrado."
            );
        }

        const conversas =
            await this.prisma.conversa.findMany({
                where: {
                    tipo: "privada",

                    ...(usuarioLogado.tipo_usuario === "superAdmin"
                        ? {
                            OR: [
                                {
                                    conversa_participante: {
                                        some: {
                                            usuario_id: usuarioLogadoId,
                                            ocultada_em: null
                                        }
                                    }
                                },
                                {
                                    conversa_participante: {
                                        none: {
                                            cadastro: {
                                                tipo_usuario: "superAdmin" as const
                                            }
                                        }
                                    }
                                }
                            ]
                        }
                        : {
                            conversa_participante: {
                                some: {
                                    usuario_id: usuarioLogadoId,
                                    ocultada_em: null
                                }
                            }
                        }),

                    mensagens:
                        usuarioLogado.tipo_usuario === "user"
                            ? {
                                some: {
                                    remetente: {
                                        tipo_usuario: {
                                            in: ["superAdmin", "admin"]
                                        }
                                    }
                                }
                            }
                            : undefined
                },

                include: {
                    conversa_participante: {
                        include: {
                            cadastro: {
                                select: {
                                    id: true,
                                    nome: true,
                                    tipo_usuario: true,
                                    foto_perfil_url: true
                                }
                            }
                        }
                    },

                    mensagens: {
                        orderBy: {
                            enviada_em: "desc"
                        },

                        take: 1,

                        select: {
                            id: true,
                            conteudo: true,
                            origem: true,
                            arquivo_nome: true,
                            arquivo_tipo: true,
                            enviada_em: true
                        }
                    },

                    conversa_leitura: {
                        where: {
                            usuario_id: usuarioLogadoId
                        },

                        select: {
                            ultima_mensagem_lida_id: true
                        }
                    }
                },

                orderBy: {
                    criada_em: "desc"
                }
            });

        const mensagensNaoLidas =
            await this.contarMensagensNaoLidas(
                usuarioLogadoId,
                conversas.map((conversa) => ({
                    id: conversa.id,
                    ultimaMensagemLidaId:
                        conversa.conversa_leitura[0]
                            ?.ultima_mensagem_lida_id ?? null,
                    visivelDesdeMensagemId:
                        conversa.conversa_participante.find(
                            (participante) =>
                                participante.usuario_id ===
                                usuarioLogadoId
                        )?.visivel_desde_mensagem_id ?? null
                }))
            );

        return conversas.flatMap((conversa) => {
            const participaDaConversa =
                conversa.conversa_participante.some(
                    (participante) =>
                        participante.usuario_id ===
                        usuarioLogadoId
                );

            const somenteLeitura =
                usuarioLogado.tipo_usuario === "superAdmin" &&
                !participaDaConversa;

            const participantes =
                conversa.conversa_participante.map(
                    (participante) => participante.cadastro
                );

            const contatos =
                conversa.conversa_participante
                    .filter((participante) =>
                        participante.usuario_id !==
                        usuarioLogadoId
                    )
                    .map((participante) =>
                        participante.cadastro
                    );

            const primeiroParticipante = participantes[0];

            const contato = somenteLeitura && primeiroParticipante
                ? {
                    ...primeiroParticipante,
                    nome: participantes
                        .map((participante) => participante.nome)
                        .join(" e "),
                    foto_perfil_url: null
                }
                : contatos[0];

            if (!contato) {
                return [];
            }

            const ultimaMensagem =
                conversa.mensagens[0] ?? null;

            return [{
                id: conversa.id,
                tipo: conversa.tipo,
                criadaEm: conversa.criada_em,
                contato,
                somenteLeitura,
                mensagensNaoLidas:
                    somenteLeitura
                        ? 0
                        : mensagensNaoLidas.get(conversa.id) ?? 0,

                ultimaMensagem: ultimaMensagem
                    ? {
                        id: ultimaMensagem.id,
                        conteudo: this.criptografiaMensagens.descriptografar(
                            ultimaMensagem.conteudo,
                            conversa.id
                        ),
                        origem: ultimaMensagem.origem,
                        arquivoNome: ultimaMensagem.arquivo_nome,
                        arquivoTipo: ultimaMensagem.arquivo_tipo,
                        enviadaEm: ultimaMensagem.enviada_em
                    }
                    : null
            }];
        });
    }

    /*
     * Somente o administrador pode iniciar
     * uma conversa privada.
     *
     * O destinatário pode ser user, funcionário
     * ou outro administrador.
     */
    async criarOuBuscar(
        usuarioLogadoId: number,
        usuarioSelecionadoId: number
    ) {
        const [usuarioLogado, usuarioSelecionado] =
            await Promise.all([
                this.prisma.cadastro.findUnique({
                    where: {
                        id: usuarioLogadoId
                    },

                    select: {
                        id: true,
                        nome: true,
                        tipo_usuario: true
                    }
                }),

                this.prisma.cadastro.findUnique({
                    where: {
                        id: usuarioSelecionadoId
                    },

                    select: {
                        id: true,
                        nome: true,
                        tipo_usuario: true
                    }
                })
            ]);

        if (!usuarioLogado) {
            throw new NotFoundException(
                "Usuário autenticado não encontrado."
            );
        }

        if (usuarioLogado.tipo_usuario !== "admin" && usuarioLogado.tipo_usuario !== "superAdmin") {
            throw new ForbiddenException(
                "Somente administradores podem iniciar conversas privadas."
            );
        }

        if (!usuarioSelecionado) {
            throw new NotFoundException(
                "Usuário selecionado não encontrado."
            );
        }

        if (usuarioLogado.id === usuarioSelecionado.id) {
            throw new BadRequestException(
                "Você não pode iniciar uma conversa consigo mesmo."
            );
        }

        const participantes = [
            usuarioLogado.id,
            usuarioSelecionado.id
        ];

        const conversaExistente =
            await this.prisma.conversa.findFirst({
                where: {
                    tipo: "privada",

                    AND: [
                        {
                            conversa_participante: {
                                some: {
                                    usuario_id: usuarioLogado.id,
                                    ocultada_em: null
                                }
                            }
                        },
                        {
                            conversa_participante: {
                                some: {
                                    usuario_id:
                                        usuarioSelecionado.id,
                                    ocultada_em: null
                                }
                            }
                        },
                        {
                            conversa_participante: {
                                every: {
                                    usuario_id: {
                                        in: participantes
                                    }
                                }
                            }
                        }
                    ]
                },

                include: {
                    conversa_participante: {
                        include: {
                            cadastro: {
                                select: {
                                    id: true,
                                    nome: true,
                                    tipo_usuario: true,
                                    foto_perfil_url: true
                                }
                            }
                        }
                    }
                }
            });

        const conversa =
            conversaExistente ??
            await this.prisma.conversa.create({
                data: {
                    tipo: "privada",

                    conversa_participante: {
                        create: [
                            {
                                cadastro: {
                                    connect: {
                                        id: usuarioLogado.id
                                    }
                                }
                            },
                            {
                                cadastro: {
                                    connect: {
                                        id: usuarioSelecionado.id
                                    }
                                }
                            }
                        ]
                    }
                },

                include: {
                    conversa_participante: {
                        include: {
                            cadastro: {
                                select: {
                                    id: true,
                                    nome: true,
                                    tipo_usuario: true,
                                    foto_perfil_url: true
                                }
                            }
                        }
                    }
                }
            });

        const contato =
            conversa.conversa_participante.find(
                (participante) =>
                    participante.usuario_id ===
                    usuarioSelecionado.id
            )?.cadastro;

        if (!contato) {
            throw new NotFoundException(
                "Contato da conversa não encontrado."
            );
        }

        return {
            id: conversa.id,
            tipo: conversa.tipo,
            criadaEm: conversa.criada_em,
            contato,
            somenteLeitura: false,
            ultimaMensagem: null
        };
    }

    async listarGrupos(
        usuarioLogadoId: number
    ) {
        const usuarioLogado =
            await this.prisma.cadastro.findUnique({
                where: {
                    id: usuarioLogadoId
                },

                select: {
                    id: true,
                    tipo_usuario: true
                }
            });

        if (!usuarioLogado) {
            throw new NotFoundException(
                "Usuário autenticado não encontrado."
            );
        }

        if (usuarioLogado.tipo_usuario === "user") {
            throw new ForbiddenException(
                "Usuários comuns não possuem acesso a grupos."
            );
        }

        const grupos =
            await this.prisma.conversa.findMany({
                where: {
                    tipo: "grupo",
                    conversa_participante: {
                        some: {
                            usuario_id: usuarioLogado.id
                        }
                    }
                },
                include: {
                    conversa_participante: {
                        include: {
                            cadastro: {
                                select: {
                                    id: true,
                                    nome: true,
                                    tipo_usuario: true,
                                    foto_perfil_url: true
                                }
                            }
                        }
                    },
                    mensagens: {
                        orderBy: {
                            enviada_em: "desc"
                        },
                        take: 1,
                        select: {
                            id: true,
                            conteudo: true,
                            origem: true,
                            arquivo_nome: true,
                            arquivo_tipo: true,
                            enviada_em: true
                        }
                    },
                    conversa_leitura: {
                        where: {
                            usuario_id: usuarioLogado.id
                        },
                        select: {
                            ultima_mensagem_lida_id: true
                        }
                    }
                },

                orderBy: {
                    criada_em: "desc"
                }
            });

        const gruposDoUsuario = grupos.filter((grupo) =>
            grupo.conversa_participante.some((participante) =>
                participante.usuario_id === usuarioLogado.id
            )
        );

        const mensagensNaoLidas =
            await this.contarMensagensNaoLidas(
                usuarioLogado.id,
                gruposDoUsuario.map((grupo) => ({
                    id: grupo.id,
                    ultimaMensagemLidaId:
                        grupo.conversa_leitura[0]
                            ?.ultima_mensagem_lida_id ?? null
                }))
            );

        return grupos.map((grupo) => {
            const participaDaConversa =
                grupo.conversa_participante.some(
                    (participante) =>
                        participante.usuario_id === usuarioLogado.id
                );
            const ultimaMensagem = grupo.mensagens[0] ?? null;

            return {
                id: grupo.id,
                tipo: "grupo" as const,
                nome: grupo.nome ?? "Grupo sem nome",
                criadaEm: grupo.criada_em,
                participantes: grupo.conversa_participante.map(
                    (participante) => participante.cadastro
                ),
                totalParticipantes:
                    grupo.conversa_participante.length,
                somenteLeitura: !participaDaConversa,
                mensagensNaoLidas: participaDaConversa
                    ? mensagensNaoLidas.get(grupo.id) ?? 0
                    : 0,
                ultimaMensagem: ultimaMensagem
                    ? {
                        id: ultimaMensagem.id,
                        conteudo: this.criptografiaMensagens.descriptografar(
                            ultimaMensagem.conteudo,
                            grupo.id
                        ),
                        origem: ultimaMensagem.origem,
                        arquivoNome: ultimaMensagem.arquivo_nome,
                        arquivoTipo: ultimaMensagem.arquivo_tipo,
                        enviadaEm: ultimaMensagem.enviada_em
                    }
                    : null
            };
        });
    }

    async criarGrupo(
        usuarioLogadoId: number,
        nome: string,
        participanteIds: number[]
    ) {
        const nomeLimpo = nome.trim();
        const contatosSelecionados = Array.from(
            new Set(participanteIds)
        );

        if (nomeLimpo.length < 3 || nomeLimpo.length > 120) {
            throw new BadRequestException(
                "O nome do grupo deve ter entre 3 e 120 caracteres."
            );
        }

        if (
            contatosSelecionados.length < 2 ||
            contatosSelecionados.includes(usuarioLogadoId)
        ) {
            throw new BadRequestException(
                "Selecione pelo menos dois contatos diferentes de você."
            );
        }

        const todosParticipantes = [
            usuarioLogadoId,
            ...contatosSelecionados
        ];

        const grupo = await this.prisma.$transaction(
            async (transacao) => {
                // Usa a mesma trava da desativação para que a validação e
                // a inclusão no grupo sejam uma operação atômica.
                for (const usuarioId of [...todosParticipantes].sort(
                    (primeiroId, segundoId) => primeiroId - segundoId
                )) {
                    await transacao.$queryRaw<Array<{ id: number }>>`
                        SELECT id
                        FROM cadastro
                        WHERE id = ${usuarioId}
                        FOR UPDATE
                    `;
                }

                const usuarioLogado =
                    await transacao.cadastro.findUnique({
                        where: {
                            id: usuarioLogadoId
                        },
                        select: {
                            id: true,
                            tipo_usuario: true,
                            desativado_em: true
                        }
                    });

                if (!usuarioLogado) {
                    throw new NotFoundException(
                        "Usuário autenticado não encontrado."
                    );
                }

                if (
                    usuarioLogado.desativado_em !== null ||
                    usuarioLogado.tipo_usuario === "user"
                ) {
                    throw new ForbiddenException(
                        "Usuários comuns não podem criar grupos."
                    );
                }

                const contatos =
                    await transacao.cadastro.findMany({
                        where: {
                            id: {
                                in: contatosSelecionados
                            },
                            desativado_em: null,
                            tipo_usuario: {
                                not: "user"
                            }
                        },
                        select: {
                            id: true
                        }
                    });

                if (
                    contatos.length !== contatosSelecionados.length
                ) {
                    throw new BadRequestException(
                        "Um ou mais contatos não podem participar de grupos."
                    );
                }

                return transacao.conversa.create({
                    data: {
                        tipo: "grupo",
                        nome: nomeLimpo,
                        conversa_participante: {
                            create: todosParticipantes.map(
                                (usuarioId) => ({
                                    cadastro: {
                                        connect: {
                                            id: usuarioId
                                        }
                                    }
                                })
                            )
                        }
                    },
                    include: {
                        conversa_participante: {
                            include: {
                                cadastro: {
                                    select: {
                                        id: true,
                                        nome: true,
                                        tipo_usuario: true,
                                        foto_perfil_url: true
                                    }
                                }
                            }
                        }
                    }
                });
            }
        );

        return {
            id: grupo.id,
            tipo: "grupo" as const,
            nome: grupo.nome!,
            criadaEm: grupo.criada_em,
            participantes: grupo.conversa_participante.map(
                (participante) => participante.cadastro
            ),
            totalParticipantes:
                grupo.conversa_participante.length,
            somenteLeitura: false,
            mensagensNaoLidas: 0,
            ultimaMensagem: null
        };
    }

    async adicionarParticipantesGrupo(
        usuarioLogadoId: number,
        conversaId: number,
        participanteIds: number[]
    ) {
        const contatosSelecionados = Array.from(
            new Set(participanteIds)
        );

        if (
            contatosSelecionados.length < 1 ||
            contatosSelecionados.includes(usuarioLogadoId)
        ) {
            throw new BadRequestException(
                "Selecione pelo menos uma pessoa diferente de você."
            );
        }

        const grupo = await this.prisma.$transaction(
            async (transacao) => {
                const usuariosParaBloquear = Array.from(
                    new Set([
                        usuarioLogadoId,
                        ...contatosSelecionados
                    ])
                ).sort(
                    (primeiroId, segundoId) =>
                        primeiroId - segundoId
                );

                for (const usuarioId of usuariosParaBloquear) {
                    await transacao.$queryRaw<Array<{ id: number }>>`
                        SELECT id
                        FROM cadastro
                        WHERE id = ${usuarioId}
                        FOR UPDATE
                    `;
                }

                await transacao.$queryRaw<Array<{ id: number }>>`
                    SELECT id
                    FROM conversa
                    WHERE id = ${conversaId}
                    FOR UPDATE
                `;

                const [usuarioLogado, conversa, contatos] =
                    await Promise.all([
                        transacao.cadastro.findUnique({
                            where: {
                                id: usuarioLogadoId
                            },
                            select: {
                                id: true,
                                tipo_usuario: true,
                                desativado_em: true
                            }
                        }),
                        transacao.conversa.findUnique({
                            where: {
                                id: conversaId
                            },
                            include: {
                                conversa_participante: {
                                    select: {
                                        usuario_id: true
                                    }
                                }
                            }
                        }),
                        transacao.cadastro.findMany({
                            where: {
                                id: {
                                    in: contatosSelecionados
                                },
                                desativado_em: null,
                                tipo_usuario: {
                                    not: "user"
                                }
                            },
                            select: {
                                id: true
                            }
                        })
                    ]);

                if (!usuarioLogado) {
                    throw new NotFoundException(
                        "Usuário autenticado não encontrado."
                    );
                }

                if (
                    usuarioLogado.desativado_em !== null ||
                    usuarioLogado.tipo_usuario === "user"
                ) {
                    throw new ForbiddenException(
                        "Você não pode adicionar pessoas a grupos."
                    );
                }

                if (!conversa) {
                    throw new NotFoundException(
                        "Conversa não encontrada."
                    );
                }

                if (conversa.tipo !== "grupo") {
                    throw new BadRequestException(
                        "Somente grupos podem receber novos participantes."
                    );
                }

                const participaDoGrupo =
                    conversa.conversa_participante.some(
                        (participante) =>
                            participante.usuario_id === usuarioLogadoId
                    );

                if (!participaDoGrupo) {
                    throw new ForbiddenException(
                        "Você não participa deste grupo."
                    );
                }

                if (contatos.length !== contatosSelecionados.length) {
                    throw new BadRequestException(
                        "Uma ou mais pessoas não podem participar de grupos."
                    );
                }

                const participantesAtuais = new Set(
                    conversa.conversa_participante.map(
                        (participante) => participante.usuario_id
                    )
                );

                if (
                    contatosSelecionados.some((contatoId) =>
                        participantesAtuais.has(contatoId)
                    )
                ) {
                    throw new ConflictException(
                        "Uma ou mais pessoas já participam deste grupo."
                    );
                }

                return transacao.conversa.update({
                    where: {
                        id: conversaId
                    },
                    data: {
                        conversa_participante: {
                            create: contatosSelecionados.map(
                                (usuarioId) => ({
                                    cadastro: {
                                        connect: {
                                            id: usuarioId
                                        }
                                    }
                                })
                            )
                        }
                    },
                    include: {
                        conversa_participante: {
                            include: {
                                cadastro: {
                                    select: {
                                        id: true,
                                        nome: true,
                                        tipo_usuario: true,
                                        foto_perfil_url: true
                                    }
                                }
                            }
                        }
                    }
                });
            }
        );

        return {
            grupoId: grupo.id,
            participantes: grupo.conversa_participante.map(
                (participante) => participante.cadastro
            ),
            totalParticipantes:
                grupo.conversa_participante.length
        };
    }

    async sairDoGrupo(
        usuarioLogadoId: number,
        conversaId: number
    ) {
        const resultado = await this.prisma.$transaction(
            async (transacao) => {
                await transacao.$queryRaw<Array<{ id: number }>>`
                    SELECT id
                    FROM conversa
                    WHERE id = ${conversaId}
                    FOR UPDATE
                `;

                const [usuarioLogado, conversa] = await Promise.all([
                    transacao.cadastro.findUnique({
                        where: {
                            id: usuarioLogadoId
                        },
                        select: {
                            id: true,
                            nome: true,
                            tipo_usuario: true,
                            desativado_em: true
                        }
                    }),
                    transacao.conversa.findUnique({
                        where: {
                            id: conversaId
                        },
                        select: {
                            id: true,
                            tipo: true,
                            conversa_participante: {
                                where: {
                                    usuario_id: usuarioLogadoId
                                },
                                select: {
                                    usuario_id: true
                                }
                            }
                        }
                    })
                ]);

                if (!usuarioLogado) {
                    throw new NotFoundException(
                        "Usuário autenticado não encontrado."
                    );
                }

                if (
                    usuarioLogado.desativado_em !== null ||
                    usuarioLogado.tipo_usuario === "user"
                ) {
                    throw new ForbiddenException(
                        "Você não pode sair de grupos."
                    );
                }

                if (!conversa) {
                    throw new NotFoundException(
                        "Conversa não encontrada."
                    );
                }

                if (conversa.tipo !== "grupo") {
                    throw new BadRequestException(
                        "Somente participantes de grupos podem usar esta ação."
                    );
                }

                if (conversa.conversa_participante.length === 0) {
                    throw new ForbiddenException(
                        "Você não participa deste grupo."
                    );
                }

                await transacao.mensagem.create({
                    data: {
                        conversa_id: conversaId,
                        remetente_id: usuarioLogado.id,
                        origem: "usuario",
                        sistema: true,
                        conteudo: this.criptografiaMensagens.criptografar(
                            `${usuarioLogado.nome} saiu do grupo.`,
                            conversaId
                        )
                    }
                });

                await transacao.conversa_leitura.deleteMany({
                    where: {
                        conversa_id: conversaId,
                        usuario_id: usuarioLogadoId
                    }
                });

                await transacao.conversa_participante.delete({
                    where: {
                        conversa_id_usuario_id: {
                            conversa_id: conversaId,
                            usuario_id: usuarioLogadoId
                        }
                    }
                });

                const totalParticipantes =
                    await transacao.conversa_participante.count({
                        where: {
                            conversa_id: conversaId
                        }
                    });

                return {
                    grupoId: conversa.id,
                    totalParticipantes,
                    somenteLeitura: false
                };
            }
        );

        this.usuariosDigitando.delete(
            this.obterChaveDigitacao(
                conversaId,
                usuarioLogadoId
            )
        );

        return resultado;
    }

    /*
     * Lista atendimentos de setor.
     *
     * user: somente os próprios atendimentos.
     * funcionário: atendimentos do seu setor.
     * admin: atendimentos dos setores da sua secretaria.
     * superAdmin: todos os atendimentos.
     */
    async listarAtendimentos(
        usuarioLogadoId: number
    ) {
        const usuarioLogado =
            await this.prisma.cadastro.findUnique({
                where: {
                    id: usuarioLogadoId
                },

                select: {
                    id: true,
                    tipo_usuario: true,
                    setor_id: true,
                    secretaria_id: true
                }
            });

        if (!usuarioLogado) {
            throw new NotFoundException(
                "Usuário autenticado não encontrado."
            );
        }

        const visibilidadesAtendimento: Array<
            "todos" | "equipe" | "cidadao"
        > = usuarioLogado.tipo_usuario === "user"
            ? ["todos", "cidadao"]
            : ["todos", "equipe"];

        const filtro: {
            usuario_id?: number;
            setor_id?: number;
            ocultada_para_usuario_em?: null;
            setor?: {
                secretaria_id: number;
            };
        } = {};

        if (usuarioLogado.tipo_usuario === "user") {
            filtro.usuario_id = usuarioLogado.id;
            filtro.ocultada_para_usuario_em = null;
        }

        if (
            usuarioLogado.tipo_usuario ===
            "funcionario"
        ) {
            if (!usuarioLogado.setor_id) {
                throw new BadRequestException(
                    "O funcionário não está vinculado a nenhum setor."
                );
            }

            filtro.setor_id =
                usuarioLogado.setor_id;
        }

        if (usuarioLogado.tipo_usuario === "admin") {
            if (!usuarioLogado.secretaria_id) {
                return [];
            }

            filtro.setor = {
                secretaria_id:
                    usuarioLogado.secretaria_id
            };
        }

        const atendimentos =
            await this.prisma.conversa_setor.findMany({
                where: filtro,

                include: {
                    conversa: {
                        select: {
                            id: true,
                            tipo: true,
                            criada_em: true,

                            mensagens: {
                                where: {
                                    visibilidade: {
                                        in: visibilidadesAtendimento
                                    }
                                },

                                orderBy: {
                                    enviada_em: "desc"
                                },

                                take: 1,

                                select: {
                                    id: true,
                                    conteudo: true,
                                    origem: true,
                                    sistema: true,
                                    transferencia_id: true,
                                    arquivo_nome: true,
                                    arquivo_tipo: true,
                                    enviada_em: true
                                }
                            },

                            conversa_leitura: {
                                where: {
                                    usuario_id: usuarioLogadoId
                                },

                                select: {
                                    ultima_mensagem_lida_id: true
                                }
                            },

                            finalizacoes: {
                                orderBy: {
                                    id: "desc"
                                },

                                take: 1,

                                select: {
                                    id: true,
                                    finalizada_por_id: true,
                                    ultima_mensagem_id: true,
                                    finalizada_em: true,
                                    finalizada_por: {
                                        select: {
                                            nome: true
                                        }
                                    },
                                    avaliacoes: {
                                        where: {
                                            avaliador_id: usuarioLogadoId
                                        },

                                        take: 1,

                                        select: {
                                            id: true
                                        }
                                    }
                                }
                            }
                        }
                    },

                    setor: {
                        select: {
                            id: true,
                            setor: true,
                            sigla_setor: true,
                            secretaria: {
                                select: {
                                    id: true,
                                    secretaria: true,
                                    sigla_secretaria: true
                                }
                            }
                        }
                    },

                    usuario: {
                        select: {
                            id: true,
                            nome: true,
                            foto_perfil_url: true
                        }
                    }
                },

                orderBy: {
                    criada_em: "desc"
                }
            });

        const mensagensNaoLidas =
            await this.contarMensagensNaoLidas(
                usuarioLogadoId,
                atendimentos.map((atendimento) => ({
                    id: atendimento.conversa.id,
                    ultimaMensagemLidaId:
                        atendimento.conversa
                            .conversa_leitura[0]
                            ?.ultima_mensagem_lida_id ?? null,
                    visivelDesdeMensagemId: null,
                    visibilidades: visibilidadesAtendimento
                }))
            );

        return atendimentos.map((atendimento) => {
            const ultimaMensagem =
                atendimento.conversa.mensagens[0] ??
                null;

            const secretaria = atendimento.setor.secretaria
            const ultimaFinalizacao =
                atendimento.conversa.finalizacoes[0] ?? null;
            const dadosUltimaFinalizacao = ultimaFinalizacao
                ? {
                    id: ultimaFinalizacao.id,
                    finalizadaPorId:
                        ultimaFinalizacao.finalizada_por_id,
                    finalizadaPorNome:
                        ultimaFinalizacao.finalizada_por.nome,
                    finalizadaEm:
                        ultimaFinalizacao.finalizada_em
                }
                : null;
            const finalizacaoPendente =
                usuarioLogado.tipo_usuario === "user" &&
                ultimaFinalizacao &&
                ultimaFinalizacao.avaliacoes.length === 0
                    ? dadosUltimaFinalizacao
                    : null;
            const podeFinalizar =
                ultimaMensagem !== null &&
                ultimaFinalizacao?.ultima_mensagem_id !==
                    ultimaMensagem.id;

            return {
                id: atendimento.conversa.id,
                tipo: atendimento.conversa.tipo,
                criadaEm:
                    atendimento.conversa.criada_em,

                setor: {
                    id: atendimento.setor.id,
                    nome: atendimento.setor.setor,
                    sigla:
                        atendimento.setor.sigla_setor
                },

                usuario: atendimento.usuario,
                mensagensNaoLidas:
                    mensagensNaoLidas.get(
                        atendimento.conversa.id
                    ) ?? 0,

                ultimaMensagem: ultimaMensagem
                    ? {
                        id: ultimaMensagem.id,
                        conteudo:
                            this.criptografiaMensagens.descriptografar(
                                ultimaMensagem.conteudo,
                                atendimento.conversa.id
                            ),
                        origem:
                            ultimaMensagem.origem,
                        sistema:
                            ultimaMensagem.sistema,
                        transferenciaId:
                            ultimaMensagem.transferencia_id,
                        arquivoNome:
                            ultimaMensagem.arquivo_nome,
                        arquivoTipo:
                            ultimaMensagem.arquivo_tipo,
                        enviadaEm:
                            ultimaMensagem.enviada_em
                    }
                    : null,

                secretaria: secretaria
                    ? {
                        id: secretaria.id,
                        nome: secretaria.secretaria,
                        sigla: secretaria.sigla_secretaria
                    }
                    : null,

                finalizacaoPendente,
                ultimaFinalizacao: dadosUltimaFinalizacao,
                podeFinalizar
            };
        });
    }

    private async contarMensagensNaoLidas(
        usuarioLogadoId: number,
        conversas: Array<{
            id: number;
            ultimaMensagemLidaId: number | null;
            visivelDesdeMensagemId?: number | null;
            visibilidades?: Array<
                "todos" | "equipe" | "cidadao"
            >;
        }>
    ) {
        if (conversas.length === 0) {
            return new Map<number, number>();
        }

        const contagens =
            await this.prisma.mensagem.groupBy({
                by: ["conversa_id"],

                where: {
                    OR: conversas.map((conversa) => ({
                        conversa_id: conversa.id,
                        remetente_id: {
                            not: usuarioLogadoId
                        },

                        ...(conversa.visibilidades && {
                            visibilidade: {
                                in: conversa.visibilidades
                            }
                        }),

                        id: {
                            gt: Math.max(
                                conversa.ultimaMensagemLidaId ?? 0,
                                (conversa.visivelDesdeMensagemId ?? 1) - 1
                            )
                        }
                    }))
                },

                _count: {
                    _all: true
                }
            });

        return new Map(
            contagens.map((contagem) => [
                contagem.conversa_id,
                contagem._count._all
            ])
        );
    }

    /*
     * Um user inicia atendimento com um setor.
     */
    async iniciarComoUsuario(
        usuarioLogadoId: number,
        setorId: number
    ) {
        const [usuario, setor] =
            await Promise.all([
                this.prisma.cadastro.findUnique({
                    where: {
                        id: usuarioLogadoId
                    },

                    select: {
                        id: true,
                        nome: true,
                        tipo_usuario: true
                    }
                }),

                this.prisma.setores.findFirst({
                    where: {
                        id: setorId,
                        cadastros: {
                            some: {
                                tipo_usuario: "funcionario"
                            }
                        }
                    },

                    select: {
                        id: true,
                        setor: true,
                        sigla_setor: true
                    }
                })
            ]);

        if (!usuario) {
            throw new NotFoundException(
                "Usuário autenticado não encontrado."
            );
        }

        if (usuario.tipo_usuario !== "user") {
            throw new ForbiddenException(
                "Somente usuários podem iniciar atendimento com um setor."
            );
        }

        if (!setor) {
            throw new NotFoundException(
                "Setor não encontrado ou sem funcionário vinculado."
            );
        }

        return this.buscarOuCriarAtendimento(
            setor.id,
            usuario.id
        );
    }

    /*
     * Um funcionário inicia atendimento,
     * em nome do setor, com um user.
     */
    async iniciarComoFuncionario(
        funcionarioId: number,
        usuarioSelecionadoId: number
    ) {
        const [funcionario, usuarioSelecionado] =
            await Promise.all([
                this.prisma.cadastro.findUnique({
                    where: {
                        id: funcionarioId
                    },

                    select: {
                        id: true,
                        tipo_usuario: true,
                        setor_id: true
                    }
                }),

                this.prisma.cadastro.findUnique({
                    where: {
                        id: usuarioSelecionadoId
                    },

                    select: {
                        id: true,
                        nome: true,
                        tipo_usuario: true
                    }
                })
            ]);

        if (!funcionario) {
            throw new NotFoundException(
                "Funcionário autenticado não encontrado."
            );
        }

        if (
            funcionario.tipo_usuario !==
            "funcionario"
        ) {
            throw new ForbiddenException(
                "Somente funcionários podem iniciar esse atendimento."
            );
        }

        if (!funcionario.setor_id) {
            throw new BadRequestException(
                "O funcionário não está vinculado a nenhum setor."
            );
        }

        if (!usuarioSelecionado) {
            throw new NotFoundException(
                "Usuário não encontrado."
            );
        }

        if (
            usuarioSelecionado.tipo_usuario !==
            "user"
        ) {
            throw new BadRequestException(
                "O atendimento só pode ser iniciado com um usuário."
            );
        }

        return this.buscarOuCriarAtendimento(
            funcionario.setor_id,
            usuarioSelecionado.id
        );
    }

    /*
     * Procura ou cria uma conversa única
     * entre determinado setor e determinado user.
     */
    private async buscarOuCriarAtendimento(
        setorId: number,
        usuarioId: number
    ) {
        const atendimento = await this.prisma.$transaction(
            async (transacao) => {
                // Evita a criação simultânea de duas conversas ativas
                // para o mesmo usuário e setor.
                await transacao.$queryRaw<Array<{ id: number }>>`
                    SELECT id
                    FROM cadastro
                    WHERE id = ${usuarioId}
                    FOR UPDATE
                `;

                const atendimentoExistente =
                    await transacao.conversa_setor.findFirst({
                        where: {
                            setor_id: setorId,
                            usuario_id: usuarioId,
                            ocultada_para_usuario_em: null
                        },
                        orderBy: {
                            criada_em: "desc"
                        },
                        include: {
                            conversa: {
                                select: {
                                    id: true,
                                    tipo: true,
                                    criada_em: true
                                }
                            },
                            setor: {
                                select: {
                                    id: true,
                                    setor: true,
                                    sigla_setor: true,
                                    secretaria: {
                                        select: {
                                            id: true,
                                            secretaria: true,
                                            sigla_secretaria: true
                                        }
                                    }
                                }
                            },
                            usuario: {
                                select: {
                                    id: true,
                                    nome: true,
                                    foto_perfil_url: true
                                }
                            }
                        }
                    });

                if (atendimentoExistente) {
                    return atendimentoExistente;
                }

                const atendimentoOculto =
                    await transacao.conversa_setor.findFirst({
                        where: {
                            setor_id: setorId,
                            usuario_id: usuarioId
                        },
                        orderBy: {
                            criada_em: "desc"
                        },
                        select: {
                            conversa_id: true
                        }
                    });

                if (atendimentoOculto) {
                    return transacao.conversa_setor.update({
                        where: {
                            conversa_id:
                                atendimentoOculto.conversa_id
                        },
                        data: {
                            ocultada_para_usuario_em: null,
                            usuario_visivel_desde_mensagem_id: null
                        },
                        include: {
                            conversa: {
                                select: {
                                    id: true,
                                    tipo: true,
                                    criada_em: true
                                }
                            },
                            setor: {
                                select: {
                                    id: true,
                                    setor: true,
                                    sigla_setor: true,
                                    secretaria: {
                                        select: {
                                            id: true,
                                            secretaria: true,
                                            sigla_secretaria: true
                                        }
                                    }
                                }
                            },
                            usuario: {
                                select: {
                                    id: true,
                                    nome: true,
                                    foto_perfil_url: true
                                }
                            }
                        }
                    });
                }

                return transacao.conversa_setor.create({
                    data: {
                        conversa: {
                            create: {
                                tipo: "setor"
                            }
                        },
                        setor: {
                            connect: {
                                id: setorId
                            }
                        },
                        usuario: {
                            connect: {
                                id: usuarioId
                            }
                        }
                    },
                    include: {
                        conversa: {
                            select: {
                                id: true,
                                tipo: true,
                                criada_em: true
                            }
                        },
                        setor: {
                            select: {
                                id: true,
                                setor: true,
                                sigla_setor: true,
                                secretaria: {
                                    select: {
                                        id: true,
                                        secretaria: true,
                                        sigla_secretaria: true
                                    }
                                }
                            }
                        },
                        usuario: {
                            select: {
                                id: true,
                                nome: true,
                                foto_perfil_url: true
                            }
                        }
                    }
                });
            }
        );

        return {
            id: atendimento.conversa.id,
            tipo: atendimento.conversa.tipo,
            criadaEm: atendimento.conversa.criada_em,

            setor: {
                id: atendimento.setor.id,
                nome: atendimento.setor.setor,
                sigla: atendimento.setor.sigla_setor
            },

            secretaria: atendimento.setor.secretaria
                ? {
                    id: atendimento.setor.secretaria.id,
                    nome: atendimento.setor.secretaria.secretaria,
                    sigla: atendimento.setor.secretaria.sigla_secretaria
                }
                : null,

            usuario: atendimento.usuario,
            ultimaMensagem: null
        };
    }

    /*
     * Envia mensagem em uma conversa privada
     * ou em um atendimento de setor.
     */
    async enviarMensagem(
        usuarioLogadoId: number,
        conversaId: number,
        conteudo?: string,
        mensagemRespondidaId?: number,
        arquivo?: ArquivoMensagemUpload
    ) {
        const conteudoLimpo = conteudo?.trim() ?? "";

        if (!conteudoLimpo && !arquivo) {
            throw new BadRequestException(
                "A mensagem deve conter texto ou um arquivo."
            );
        }

        const contexto =
            await this.verificarAcessoConversa(
                usuarioLogadoId,
                conversaId
            );

        if (contexto.conversa.tipo === "comunidade") {
            const comunidadeId = contexto.conversa.comunidade?.id;

            if (!comunidadeId) {
                throw new ForbiddenException(
                    "Não foi possível identificar a comunidade."
                );
            }

            const membro = await this.prisma.comunidade_usuarios.findUnique({
                where: {
                    comunidade_id_usuario_id: {
                        comunidade_id: comunidadeId,
                        usuario_id: usuarioLogadoId
                    }
                },
                select: {
                    tipo_funcao: true
                }
            });

            if (!membro || membro.tipo_funcao !== "admin") {
                throw new ForbiddenException(
                    "Somente administradores podem enviar mensagens nesta comunidade."
                );
            }
        }

        let origem: "usuario" | "setor";

        if (contexto.somenteLeitura) {
            throw new ForbiddenException(
                "Esta conversa está disponível somente para visualização."
            );
        }

        if (mensagemRespondidaId !== undefined) {
            const visivelDesdeMensagemId =
                contexto.conversa.tipo === "privada"
                    ? contexto.conversa.conversa_participante.find(
                        (participante) =>
                            participante.usuario_id === usuarioLogadoId
                    )?.visivel_desde_mensagem_id ?? null
                    : null;
            const visibilidades =
                contexto.conversa.tipo === "setor"
                    ? contexto.usuarioLogado.tipo_usuario === "user"
                        ? ["todos", "cidadao"] as const
                        : ["todos", "equipe"] as const
                    : null;

            const mensagemRespondida =
                await this.prisma.mensagem.findFirst({
                    where: {
                        id: {
                            equals: mensagemRespondidaId,
                            ...(visivelDesdeMensagemId !== null && {
                                gte: visivelDesdeMensagemId
                            })
                        },
                        conversa_id: conversaId,

                        ...(visibilidades && {
                            visibilidade: {
                                in: [...visibilidades]
                            }
                        })
                    },

                    select: {
                        id: true
                    }
                });

            if (!mensagemRespondida) {
                throw new BadRequestException(
                    "A mensagem respondida não existe ou não está disponível nesta conversa."
                );
            }
        }

        if (contexto.conversa.tipo === "privada") {
            if (
                contexto.usuarioLogado.tipo_usuario ===
                "user"
            ) {
                const mensagemDeAdministrador =
                    await this.prisma.mensagem.findFirst({
                        where: {
                            conversa_id: conversaId,
                            remetente: {
                                tipo_usuario: {
                                    in: ["superAdmin", "admin"]
                                }
                            }
                        },

                        select: {
                            id: true
                        }
                    });

                if (!mensagemDeAdministrador) {
                    throw new ForbiddenException(
                        "Você só pode responder depois que um administrador enviar uma mensagem."
                    );
                }
            }

            origem = "usuario";
        } else if (contexto.conversa.tipo === "setor") {
            origem =
                contexto.usuarioLogado.tipo_usuario ===
                "funcionario"
                    ? "setor"
                    : "usuario";
        } else {
            origem = "usuario";
        }

        let caminhoArquivo: string | null = null;
        let dadosArquivo: {
            nome: string;
            url: string;
            tipo: string;
            mime: string;
            tamanho: number;
        } | null = null;

        if (arquivo) {
            const diretorioUploads = join(process.cwd(), "uploads", "chat");
            const extensao = this.obterExtensaoArquivo(arquivo.mimetype);
            const nomeArmazenado = `${randomUUID()}${extensao}`;

            await mkdir(diretorioUploads, { recursive: true });
            caminhoArquivo = join(diretorioUploads, nomeArmazenado);
            await writeFile(caminhoArquivo, arquivo.buffer);

            dadosArquivo = {
                nome: arquivo.originalname.slice(0, 255),
                url: `/uploads/chat/${nomeArmazenado}`,
                tipo: this.identificarTipoArquivo(arquivo.mimetype),
                mime: arquivo.mimetype,
                tamanho: arquivo.size
            };
        }

        try {
            const enviadaEm = new Date();
            const mensagem = await this.prisma.$transaction(
                async (transacao) => {
                    const mensagemCriada =
                        await transacao.mensagem.create({
                            data: {
                                conversa_id: conversaId,
                                remetente_id: usuarioLogadoId,
                                origem,
                                setor_id:
                                    origem === "setor"
                                        ? contexto.atendimento?.setor_id ?? null
                                        : null,
                                mensagem_respondida_id:
                                    mensagemRespondidaId ?? null,
                                conteudo:
                                    this.criptografiaMensagens.criptografar(
                                        conteudoLimpo,
                                        conversaId
                                    ),
                                enviada_em: enviadaEm,
                                arquivo_nome: dadosArquivo?.nome ?? null,
                                arquivo_url: dadosArquivo?.url ?? null,
                                arquivo_tipo: dadosArquivo?.tipo ?? null,
                                arquivo_mime: dadosArquivo?.mime ?? null,
                                arquivo_tamanho: dadosArquivo?.tamanho ?? null
                            },

                            include: {
                                remetente: {
                                    select: {
                                        id: true,
                                        nome: true,
                                        tipo_usuario: true,
                                        foto_perfil_url: true
                                    }
                                },

                                mensagem_respondida: {
                                    select: {
                                        id: true,
                                        conteudo: true,
                                        origem: true,
                                        visibilidade: true,
                                        arquivo_nome: true,
                                        arquivo_url: true,
                                        arquivo_tipo: true,
                                        arquivo_mime: true,
                                        arquivo_tamanho: true,
                                        remetente: {
                                            select: {
                                                id: true,
                                                nome: true,
                                                tipo_usuario: true,
                                                foto_perfil_url: true
                                            }
                                        },
                                        setores: {
                                            select: {
                                                id: true,
                                                setor: true,
                                                sigla_setor: true
                                            }
                                        }
                                    }
                                }
                            }
                        });

                    if (
                        contexto.conversa.tipo === "privada" &&
                        (
                            contexto.usuarioLogado.tipo_usuario === "admin" ||
                            contexto.usuarioLogado.tipo_usuario === "superAdmin"
                        )
                    ) {
                        // Uma nova mensagem administrativa reabre a conversa
                        // somente a partir deste ponto para o usuário desativado.
                        await transacao.conversa_participante.updateMany({
                            where: {
                                conversa_id: conversaId,
                                ocultada_em: {
                                    not: null
                                },
                                cadastro: {
                                    tipo_usuario: "user"
                                }
                            },
                            data: {
                                ocultada_em: null,
                                visivel_desde_mensagem_id:
                                    mensagemCriada.id
                            }
                        });
                    }

                    return mensagemCriada;
                }
            );

            this.usuariosDigitando.delete(
                this.obterChaveDigitacao(
                    conversaId,
                    usuarioLogadoId
                )
            );

            const atendimento = contexto.atendimento;

            const remetenteExibido =
                mensagem.origem === "setor" &&
                atendimento
                    ? {
                        tipo: "setor" as const,
                        id: mensagem.remetente.id,
                        nome: mensagem.remetente.nome,
                        sigla_setor: atendimento.setor.sigla_setor,
                        tipo_usuario: mensagem.remetente.tipo_usuario,
                        fotoPerfilUrl: mensagem.remetente.foto_perfil_url
                    }
                    : {
                        tipo:
                            mensagem.remetente.tipo_usuario === "admin" 
                                ? "admin" as const 
                            : mensagem.remetente.tipo_usuario === "superAdmin" 
                                ? "superAdmin" as const 
                            : "usuario" as const,
                        id: mensagem.remetente.id,
                        nome: mensagem.remetente.nome,
                        fotoPerfilUrl: mensagem.remetente.foto_perfil_url,
                        tipoUsuario:
                            mensagem.remetente.tipo_usuario
                    };
            const mensagemRespondida =
                mensagem.mensagem_respondida;
            const conteudoMensagemRespondida = mensagemRespondida
                ? this.criptografiaMensagens.descriptografar(
                    mensagemRespondida.conteudo,
                    conversaId
                )
                : null;
            const setorDaMensagemRespondida =
                mensagemRespondida?.setores ?? atendimento?.setor;
            const remetenteMensagemRespondida =
                mensagemRespondida?.origem === "setor" &&
                setorDaMensagemRespondida
                    ? {
                        tipo: "setor" as const,
                        id: mensagemRespondida.remetente.id,
                        nome: mensagemRespondida.remetente.nome,
                        sigla_setor:
                            setorDaMensagemRespondida.sigla_setor,
                        tipo_usuario:
                            mensagemRespondida.remetente.tipo_usuario,
                        fotoPerfilUrl:
                            mensagemRespondida.remetente.foto_perfil_url
                    }
                    : mensagemRespondida
                        ? {
                            tipo:
                                mensagemRespondida.remetente.tipo_usuario ===
                                "admin"
                                    ? "admin" as const
                                : mensagemRespondida.remetente.tipo_usuario ===
                                    "superAdmin"
                                    ? "superAdmin" as const
                                : "usuario" as const,
                            id: mensagemRespondida.remetente.id,
                            nome: mensagemRespondida.remetente.nome,
                            fotoPerfilUrl:
                                mensagemRespondida.remetente.foto_perfil_url,
                            tipoUsuario:
                                mensagemRespondida.remetente.tipo_usuario
                        }
                        : null;

            void this.notificacoesService.enviarNovaMensagem({
                conversaId,
                mensagemId: mensagem.id,
                remetenteId: usuarioLogadoId,
                remetenteNome: mensagem.remetente.nome,
                conteudo: conteudoLimpo,
                possuiArquivo: dadosArquivo !== null
            });

            return {
                id: mensagem.id,
                conversaId: mensagem.conversa_id,
                conteudo: conteudoLimpo,
                origem: mensagem.origem,
                sistema: false,
                enviadaEm: mensagem.enviada_em,
                remetente: remetenteExibido,
                arquivo: dadosArquivo,
                respondendoA:
                    mensagemRespondida && remetenteMensagemRespondida
                        ? {
                            id: mensagemRespondida.id,
                            conteudo: conteudoMensagemRespondida!,
                            remetente: remetenteMensagemRespondida,
                            arquivo: mensagemRespondida.arquivo_url
                                ? {
                                    nome: mensagemRespondida.arquivo_nome!,
                                    url: mensagemRespondida.arquivo_url,
                                    tipo: mensagemRespondida.arquivo_tipo!,
                                    mime: mensagemRespondida.arquivo_mime!,
                                    tamanho:
                                        mensagemRespondida.arquivo_tamanho!
                                }
                                : null
                        }
                        : null
            };
        } catch (erro) {
            if (caminhoArquivo) {
                await unlink(caminhoArquivo).catch(() => undefined);
            }

            throw erro;
        }
    }

    /*
     * Lista mensagens de uma conversa,
     * validando se o usuário pode acessá-la.
     */
    async listarMensagens(
        usuarioLogadoId: number,
        conversaId: number,
        consulta: {
            depoisDe?: number;
            antesDe?: number;
            limite?: number;
        } = {}
    ) {
        if (
            consulta.depoisDe !== undefined &&
            consulta.antesDe !== undefined
        ) {
            throw new BadRequestException(
                "Informe apenas depoisDe ou antesDe."
            );
        }

        const contexto =
            await this.verificarAcessoConversa(
                usuarioLogadoId,
                conversaId
            );

        const visivelDesdeMensagemId =
            contexto.conversa.tipo === "privada"
                ? contexto.conversa.conversa_participante.find(
                    (participante) =>
                        participante.usuario_id === usuarioLogadoId
                )?.visivel_desde_mensagem_id ?? null
                : null;
        const visibilidades =
            contexto.conversa.tipo === "setor"
                ? contexto.usuarioLogado.tipo_usuario === "user"
                    ? ["todos", "cidadao"] as const
                    : ["todos", "equipe"] as const
                : null;

        const limite = consulta.limite ?? 50;
        const ordemDecrescente =
            consulta.depoisDe === undefined;

        const mensagens =
            await this.prisma.mensagem.findMany({
                where: {
                    conversa_id: conversaId,

                    ...(visibilidades && {
                        visibilidade: {
                            in: [...visibilidades]
                        }
                    }),

                    ...(
                        visivelDesdeMensagemId !== null ||
                        consulta.depoisDe !== undefined ||
                        consulta.antesDe !== undefined
                    ) && {
                        id: {
                            ...(visivelDesdeMensagemId !== null && {
                                gte: visivelDesdeMensagemId
                            }),
                            ...(consulta.depoisDe !== undefined && {
                                gt: consulta.depoisDe
                            }),
                            ...(consulta.antesDe !== undefined && {
                                lt: consulta.antesDe
                            })
                        }
                    }
                },

                include: {
                    remetente: {
                        select: {
                            id: true,
                            nome: true,
                            tipo_usuario: true,
                            foto_perfil_url: true
                        }
                    },

                    setores: {
                        select: {
                            id: true,
                            setor: true,
                            sigla_setor: true
                        }
                    },

                    mensagem_respondida: {
                        select: {
                            id: true,
                            conteudo: true,
                            origem: true,
                            visibilidade: true,
                            arquivo_nome: true,
                            arquivo_url: true,
                            arquivo_tipo: true,
                            arquivo_mime: true,
                            arquivo_tamanho: true,
                            remetente: {
                                select: {
                                    id: true,
                                    nome: true,
                                    tipo_usuario: true,
                                    foto_perfil_url: true
                                }
                            },
                            setores: {
                                select: {
                                    id: true,
                                    setor: true,
                                    sigla_setor: true
                                }
                            }
                        }
                    }
                },

                orderBy: {
                    id: ordemDecrescente
                        ? "desc"
                        : "asc"
                },

                take: limite
            });

        const mensagensEmOrdemCronologica =
            ordemDecrescente
                ? mensagens.reverse()
                : mensagens;

        return mensagensEmOrdemCronologica.map((mensagem) => {
            const atendimento =
                contexto.atendimento;
            const setorDaMensagem =
                mensagem.setores ?? atendimento?.setor;

            const remetenteExibido =
                mensagem.origem === "setor" &&
                setorDaMensagem
                    ? {
                        tipo: "setor" as const,
                        id: mensagem.remetente.id,
                        nome: mensagem.remetente.nome,
                        sigla_setor: setorDaMensagem.sigla_setor,
                        tipo_usuario: mensagem.remetente.tipo_usuario,
                        fotoPerfilUrl: mensagem.remetente.foto_perfil_url
                    }
                    : {
                        tipo:
                            mensagem.remetente.tipo_usuario === "admin" 
                                ? "admin" as const 
                            : mensagem.remetente.tipo_usuario === "superAdmin" 
                                ? "superAdmin" as const 
                            : "usuario" as const,
                        id: mensagem.remetente.id,
                        nome:
                            mensagem.remetente.nome,
                        fotoPerfilUrl: mensagem.remetente.foto_perfil_url,
                        tipoUsuario:
                            mensagem.remetente.tipo_usuario
                    };
            const mensagemRespondidaCandidata =
                mensagem.mensagem_respondida;
            const mensagemRespondida =
                mensagemRespondidaCandidata &&
                (
                    visibilidades === null ||
                    visibilidades.some(
                        (visibilidade) =>
                            visibilidade ===
                            mensagemRespondidaCandidata.visibilidade
                    )
                ) &&
                (
                    visivelDesdeMensagemId === null ||
                    mensagemRespondidaCandidata.id >=
                        visivelDesdeMensagemId
                )
                    ? mensagemRespondidaCandidata
                    : null;
            const setorDaMensagemRespondida =
                mensagemRespondida?.setores ?? atendimento?.setor;
            const remetenteMensagemRespondida =
                mensagemRespondida?.origem === "setor" &&
                setorDaMensagemRespondida
                    ? {
                        tipo: "setor" as const,
                        id: mensagemRespondida.remetente.id,
                        nome: mensagemRespondida.remetente.nome,
                        sigla_setor:
                            setorDaMensagemRespondida.sigla_setor,
                        tipo_usuario:
                            mensagemRespondida.remetente.tipo_usuario,
                        fotoPerfilUrl:
                            mensagemRespondida.remetente.foto_perfil_url
                    }
                    : mensagemRespondida
                        ? {
                            tipo:
                                mensagemRespondida.remetente.tipo_usuario ===
                                "admin"
                                    ? "admin" as const
                                : mensagemRespondida.remetente.tipo_usuario ===
                                    "superAdmin"
                                    ? "superAdmin" as const
                                : "usuario" as const,
                            id: mensagemRespondida.remetente.id,
                            nome: mensagemRespondida.remetente.nome,
                            fotoPerfilUrl:
                                mensagemRespondida.remetente.foto_perfil_url,
                            tipoUsuario:
                                mensagemRespondida.remetente.tipo_usuario
                        }
                        : null;

            const podeVerAutorReal =
                contexto.conversa.tipo === "privada" ||
                contexto.usuarioLogado.tipo_usuario !==
                    "user" ||
                mensagem.origem === "usuario";

            return {
                id: mensagem.id,
                conversaId: mensagem.conversa_id,
                conteudo: this.criptografiaMensagens.descriptografar(
                    mensagem.conteudo,
                    conversaId
                ),
                origem: mensagem.origem,
                sistema: mensagem.sistema,
                enviadaEm: mensagem.enviada_em,
                remetente: remetenteExibido,
                arquivo: mensagem.arquivo_url
                    ? {
                        nome: mensagem.arquivo_nome!,
                        url: mensagem.arquivo_url,
                        tipo: mensagem.arquivo_tipo!,
                        mime: mensagem.arquivo_mime!,
                        tamanho: mensagem.arquivo_tamanho!
                    }
                    : null,
                respondendoA:
                    mensagemRespondida && remetenteMensagemRespondida
                        ? {
                            id: mensagemRespondida.id,
                            conteudo:
                                this.criptografiaMensagens.descriptografar(
                                    mensagemRespondida.conteudo,
                                    conversaId
                                ),
                            remetente: remetenteMensagemRespondida,
                            arquivo: mensagemRespondida.arquivo_url
                                ? {
                                    nome: mensagemRespondida.arquivo_nome!,
                                    url: mensagemRespondida.arquivo_url,
                                    tipo: mensagemRespondida.arquivo_tipo!,
                                    mime: mensagemRespondida.arquivo_mime!,
                                    tamanho:
                                        mensagemRespondida.arquivo_tamanho!
                                }
                                : null
                        }
                        : null,

                ...(podeVerAutorReal && {
                    autorReal: {
                        id: mensagem.remetente.id,
                        nome:
                            mensagem.remetente.nome
                    }
                })
            };
        });
    }

    async marcarComoLida(
        usuarioLogadoId: number,
        conversaId: number
    ) {
        const contexto =
            await this.verificarAcessoConversa(
                usuarioLogadoId,
                conversaId
            );

        const visivelDesdeMensagemId =
            contexto.conversa.tipo === "privada"
                ? contexto.conversa.conversa_participante.find(
                    (participante) =>
                        participante.usuario_id === usuarioLogadoId
                )?.visivel_desde_mensagem_id ?? null
                : null;
        const visibilidades =
            contexto.conversa.tipo === "setor"
                ? contexto.usuarioLogado.tipo_usuario === "user"
                    ? ["todos", "cidadao"] as const
                    : ["todos", "equipe"] as const
                : null;

        const ultimaMensagem =
            await this.prisma.mensagem.findFirst({
                where: {
                    conversa_id: conversaId,

                    ...(visibilidades && {
                        visibilidade: {
                            in: [...visibilidades]
                        }
                    }),

                    ...(visivelDesdeMensagemId !== null && {
                        id: {
                            gte: visivelDesdeMensagemId
                        }
                    })
                },

                orderBy: {
                    id: "desc"
                },

                select: {
                    id: true
                }
            });

        const leitura =
            await this.prisma.conversa_leitura.upsert({
                where: {
                    conversa_id_usuario_id: {
                        conversa_id: conversaId,
                        usuario_id: usuarioLogadoId
                    }
                },

                update: {
                    ultima_mensagem_lida_id:
                        ultimaMensagem?.id ?? null,
                    lida_em: new Date()
                },

                create: {
                    conversa_id: conversaId,
                    usuario_id: usuarioLogadoId,
                    ultima_mensagem_lida_id:
                        ultimaMensagem?.id ?? null
                },

                select: {
                    conversa_id: true,
                    ultima_mensagem_lida_id: true,
                    lida_em: true
                }
            });

        return {
            conversaId: leitura.conversa_id,
            ultimaMensagemLidaId:
                leitura.ultima_mensagem_lida_id,
            lidaEm: leitura.lida_em,
            mensagensNaoLidas: 0
        };
    }

    /*
     * Retorna um marco de leitura para as mensagens enviadas pelo usuário.
     * Em conversas privadas e grupos, todos os participantes ativos precisam
     * ter lido a mensagem. Em atendimentos, basta a leitura do cidadão ou de
     * um integrante da equipe, conforme quem esteja consultando o status.
     */
    async obterStatusLeitura(
        usuarioLogadoId: number,
        conversaId: number
    ) {
        const contexto = await this.verificarAcessoConversa(
            usuarioLogadoId,
            conversaId
        );

        const participantesAtivos =
            contexto.conversa.conversa_participante
                .filter(
                    (participante) =>
                        participante.usuario_id !== usuarioLogadoId &&
                        participante.ocultada_em === null
                )
                .map((participante) => participante.usuario_id);

        const atendimento = contexto.atendimento;
        const usuarioEhCidadaoDoAtendimento =
            contexto.conversa.tipo === "setor" &&
            atendimento?.usuario_id === usuarioLogadoId;

        const destinatariosObrigatorios =
            contexto.conversa.tipo === "setor"
                ? usuarioEhCidadaoDoAtendimento
                    ? null
                    : atendimento
                      ? [atendimento.usuario_id]
                      : []
                : participantesAtivos;

        const leituras = await this.prisma.conversa_leitura.findMany({
            where: {
                conversa_id: conversaId,
                usuario_id:
                    destinatariosObrigatorios === null
                        ? { not: usuarioLogadoId }
                        : { in: destinatariosObrigatorios },
                ultima_mensagem_lida_id: {
                    not: null
                }
            },
            select: {
                usuario_id: true,
                ultima_mensagem_lida_id: true
            }
        });

        let ultimaMensagemVisualizadaId: number | null = null;

        if (destinatariosObrigatorios === null) {
            // Para a mensagem do cidadão, a leitura por qualquer atendente
            // representa que ela foi visualizada pela equipe responsável.
            ultimaMensagemVisualizadaId = leituras.reduce<number | null>(
                (maiorId, leitura) => {
                    const mensagemId = leitura.ultima_mensagem_lida_id;

                    return mensagemId !== null &&
                        (maiorId === null || mensagemId > maiorId)
                        ? mensagemId
                        : maiorId;
                },
                null
            );
        } else if (
            destinatariosObrigatorios.length > 0 &&
            destinatariosObrigatorios.every((usuarioId) =>
                leituras.some((leitura) => leitura.usuario_id === usuarioId)
            )
        ) {
            // O menor marco representa a última mensagem vista por todos.
            ultimaMensagemVisualizadaId = Math.min(
                ...leituras.map(
                    (leitura) => leitura.ultima_mensagem_lida_id!
                )
            );
        }

        return {
            conversaId,
            ultimaMensagemVisualizadaId
        };
    }

    async atualizarDigitacao(
        usuarioLogadoId: number,
        conversaId: number,
        digitando: boolean
    ) {
        const contexto =
            await this.verificarAcessoConversa(
                usuarioLogadoId,
                conversaId
            );

        if (contexto.somenteLeitura) {
            throw new ForbiddenException(
                "Esta conversa está disponível somente para visualização."
            );
        }

        this.removerDigitacoesExpiradas();

        const chave = this.obterChaveDigitacao(
            conversaId,
            usuarioLogadoId
        );

        if (digitando) {
            const nomeExibido =
                contexto.conversa.tipo === "setor" &&
                contexto.usuarioLogado.tipo_usuario === "funcionario"
                    ? contexto.atendimento?.setor.setor ??
                        contexto.usuarioLogado.nome
                    : contexto.usuarioLogado.nome;

            this.usuariosDigitando.set(chave, {
                conversaId,
                usuarioId: usuarioLogadoId,
                nome: nomeExibido,
                expiraEm:
                    Date.now() +
                    TEMPO_EXPIRACAO_DIGITACAO_MS
            });
        } else {
            this.usuariosDigitando.delete(chave);
        }

        return {
            conversaId,
            digitando
        };
    }

    async listarDigitando(
        usuarioLogadoId: number,
        conversaId: number
    ) {
        await this.verificarAcessoConversa(
            usuarioLogadoId,
            conversaId
        );

        this.removerDigitacoesExpiradas();

        const usuarios = Array.from(
            this.usuariosDigitando.values()
        )
            .filter((estado) =>
                estado.conversaId === conversaId &&
                estado.usuarioId !== usuarioLogadoId
            )
            .map((estado) => ({
                id: estado.usuarioId,
                nome: estado.nome
            }));

        return { usuarios };
    }

    private removerDigitacoesExpiradas() {
        const agora = Date.now();

        for (const [chave, estado] of
            this.usuariosDigitando.entries()) {
            if (estado.expiraEm <= agora) {
                this.usuariosDigitando.delete(chave);
            }
        }
    }

    private obterChaveDigitacao(
        conversaId: number,
        usuarioId: number
    ) {
        return `${conversaId}:${usuarioId}`;
    }

    private identificarTipoArquivo(mime: string) {
        if (mime.startsWith("image/")) return "imagem";
        if (mime.startsWith("video/")) return "video";
        if (mime.startsWith("audio/")) return "audio";
        return "documento";
    }

    private obterExtensaoArquivo(mime: string) {
        const extensoes: Record<string, string> = {
            "application/pdf": ".pdf",
            "application/msword": ".doc",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
            "application/vnd.ms-excel": ".xls",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
            "application/vnd.ms-powerpoint": ".ppt",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
            "text/csv": ".csv",
            "text/plain": ".txt",
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/gif": ".gif",
            "image/webp": ".webp",
            "video/mp4": ".mp4",
            "video/webm": ".webm",
            "video/quicktime": ".mov",
            "audio/mpeg": ".mp3",
            "audio/ogg": ".ogg",
            "audio/wav": ".wav",
            "audio/webm": ".webm",
            "audio/mp4": ".m4a",
            "audio/aac": ".aac",
            "audio/x-m4a": ".m4a",
            "audio/3gpp": ".3gp"
        };

        return extensoes[mime] ?? ".bin";
    }

    /*
     * Valida o acesso a conversas privadas, grupos, comunidades e atendimentos de setor.
     */
    private async verificarAcessoConversa(
        usuarioLogadoId: number,
        conversaId: number
    ) {
        const [usuarioLogado, conversa] =
            await Promise.all([
                this.prisma.cadastro.findUnique({
                    where: {
                        id: usuarioLogadoId
                    },

                    select: {
                        id: true,
                        nome: true,
                        tipo_usuario: true,
                        setor_id: true,
                        secretaria_id: true
                    }
                }),

                this.prisma.conversa.findUnique({
                    where: {
                        id: conversaId
                    },

                    include: {
                        comunidade: {
                            select: {
                                id: true,
                                ocultar_municipes: true,
                                comunidade_usuarios: {
                                    where: { usuario_id: usuarioLogadoId },
                                    select: { tipo_funcao: true }
                                }
                            }
                        },
                        conversa_participante: {
                            select: {
                                usuario_id: true,
                                ocultada_em: true,
                                visivel_desde_mensagem_id: true,
                                cadastro: {
                                    select: {
                                        tipo_usuario: true
                                    }
                                }
                            }
                        },

                        atendimento_setor: {
                            include: {
                                setor: {
                                    select: {
                                        id: true,
                                        setor: true,
                                        sigla_setor: true,
                                        secretaria_id: true
                                    }
                                },

                                usuario: {
                                    select: {
                                        id: true,
                                        nome: true
                                    }
                                }
                            }
                        }
                    }
                })
            ]);

        if (!usuarioLogado) {
            throw new NotFoundException(
                "Usuário autenticado não encontrado."
            );
        }

        if (!conversa) {
            throw new NotFoundException(
                "Conversa não encontrada."
            );
        }

        // Seguidores podem apenas ler; não entram em conversa_participante.
        if (conversa.tipo === "comunidade") {
            if (!conversa.comunidade || (
                conversa.comunidade.ocultar_municipes && usuarioLogado.tipo_usuario === "user"
            )) {
                throw new NotFoundException("Comunidade não encontrada.");
            }
            const participa = conversa.conversa_participante.some((participante) =>
                participante.usuario_id === usuarioLogadoId && participante.ocultada_em === null
            );
            const eSeguidor =
                conversa.comunidade.comunidade_usuarios[0]?.tipo_funcao === "seguidor";

            if (!participa && !eSeguidor) {
                throw new ForbiddenException("Entre na comunidade para acessar as mensagens.");
            }
            return { usuarioLogado, conversa, atendimento: null, somenteLeitura: eSeguidor };
        }

        /*
         * Em conversa privada, os participantes possuem acesso normal.
         * O superAdmin pode fiscalizar conversas entre perfis inferiores,
         * mas nunca uma conversa que contenha outro superAdmin.
         */
        if (conversa.tipo === "privada") {
            const participaDaConversa =
                conversa.conversa_participante.some(
                    (participante) =>
                        participante.usuario_id ===
                            usuarioLogado.id &&
                        participante.ocultada_em === null
                );

            const possuiOutroSuperAdmin =
                conversa.conversa_participante.some(
                    (participante) =>
                        participante.usuario_id !==
                            usuarioLogado.id &&
                        participante.cadastro.tipo_usuario ===
                            "superAdmin"
                );

            if (
                usuarioLogado.tipo_usuario === "superAdmin" &&
                possuiOutroSuperAdmin &&
                !participaDaConversa
            ) {
                throw new ForbiddenException(
                    "Esta conversa privada pertence a outro superadministrador."
                );
            }

            const podeFiscalizar =
                usuarioLogado.tipo_usuario === "superAdmin" &&
                !possuiOutroSuperAdmin;

            if (!participaDaConversa && !podeFiscalizar) {
                throw new ForbiddenException(
                    "Você não participa desta conversa privada."
                );
            }

            return {
                usuarioLogado,
                conversa,
                atendimento: null,
                somenteLeitura: !participaDaConversa
            };
        }

        /*
         * Em atendimento de setor:
         * user acessa somente o próprio atendimento;
         * funcionário acessa somente seu setor;
         * admin acessa os setores da sua secretaria;
         * superAdmin pode visualizar todos.
         */
        if (conversa.tipo === "setor") {
            const atendimento =
                conversa.atendimento_setor;

            if (!atendimento) {
                throw new NotFoundException(
                    "Atendimento de setor não encontrado."
                );
            }

            if (
                usuarioLogado.tipo_usuario === "user" &&
                (
                    atendimento.usuario_id !==
                        usuarioLogado.id ||
                    atendimento.ocultada_para_usuario_em !== null
                )
            ) {
                throw new ForbiddenException(
                    "Você não possui acesso a este atendimento."
                );
            }

            if (
                usuarioLogado.tipo_usuario ===
                "funcionario"
            ) {
                if (!usuarioLogado.setor_id) {
                    throw new ForbiddenException(
                        "Você não está vinculado a nenhum setor."
                    );
                }

                if (
                    atendimento.setor_id !==
                    usuarioLogado.setor_id
                ) {
                    throw new ForbiddenException(
                        "Esta conversa pertence a outro setor."
                    );
                }
            }

            if (usuarioLogado.tipo_usuario === "admin") {
                if (!usuarioLogado.secretaria_id) {
                    throw new ForbiddenException(
                        "Você não está vinculado a nenhuma secretaria."
                    );
                }

                if (
                    atendimento.setor.secretaria_id !==
                    usuarioLogado.secretaria_id
                ) {
                    throw new ForbiddenException(
                        "Esta conversa pertence a um setor de outra secretaria."
                    );
                }
            }

            return {
                usuarioLogado,
                conversa,
                atendimento,
                somenteLeitura: false
            };
        }

        if (conversa.tipo === "grupo") {
            if (usuarioLogado.tipo_usuario === "user") {
                throw new ForbiddenException(
                    "Usuários comuns não possuem acesso a grupos."
                );
            }

            const participaDaConversa =
                conversa.conversa_participante.some(
                    (participante) =>
                        participante.usuario_id === usuarioLogado.id
                );

            if (!participaDaConversa) {
                throw new ForbiddenException(
                    "Você não participa deste grupo."
                );
            }

            return {
                usuarioLogado,
                conversa,
                atendimento: null,
                somenteLeitura: !participaDaConversa
            };
        }

        throw new BadRequestException("Tipo de conversa inválido.");
    }

    async finalizarConversa(
        usuarioLogadoId: number,
        conversaId: number
    ) {
        const contexto = await this.verificarAcessoConversa(
            usuarioLogadoId,
            conversaId
        );

        if (contexto.conversa.tipo !== "setor") {
            throw new BadRequestException(
                "Somente conversas de atendimento podem ser finalizadas."
            );
        }

        if (
            !contexto.usuarioLogado.tipo_usuario
        ) {
            throw new ForbiddenException(
                "Você não pode finalizar esta conversa."
            );
        }

        const ultimaMensagem = await this.prisma.mensagem.findFirst({
            where: {
                conversa_id: conversaId
            },
            orderBy: {
                id: "desc"
            },
            select: {
                id: true
            }
        });

        if (!ultimaMensagem) {
            throw new BadRequestException(
                "Não é possível finalizar uma conversa sem mensagens."
            );
        }

        try {
            const finalizacao =
                await this.prisma.conversa_finalizacao.create({
                    data: {
                        conversa_id: conversaId,
                        finalizada_por_id: usuarioLogadoId,
                        ultima_mensagem_id: ultimaMensagem.id
                    },
                    select: {
                        id: true,
                        conversa_id: true,
                        finalizada_por_id: true,
                        finalizada_em: true,
                        finalizada_por: {
                            select: {
                                nome: true
                            }
                        }
                    }
                });

            return {
                id: finalizacao.id,
                conversaId: finalizacao.conversa_id,
                finalizadaPorId: finalizacao.finalizada_por_id,
                finalizadaPorNome: finalizacao.finalizada_por.nome,
                finalizadaEm: finalizacao.finalizada_em
            };
        } catch (erro) {
            if (
                erro instanceof Prisma.PrismaClientKnownRequestError &&
                erro.code === "P2002"
            ) {
                throw new ConflictException(
                    "Esta conversa já foi finalizada. Envie uma nova mensagem antes de finalizá-la novamente."
                );
            }

            throw erro;
        }
    }

    async criaAvaliacao(
        usuarioLogadoId: number,
        conversaId: number,
        dados: CriarAvaliacaoDto
    ) {
        const contexto = await this.verificarAcessoConversa(
            usuarioLogadoId,
            conversaId
        );

        if (contexto.conversa.tipo !== "setor") {
            throw new BadRequestException(
                "Somente conversas de atendimento podem ser avaliadas."
            );
        }

        if (
            contexto.usuarioLogado.tipo_usuario !== "user"
        ) {
            throw new ForbiddenException(
                "Somente o usuário pode avaliar esta conversa."
            );
        }

        const finalizacao =
            await this.prisma.conversa_finalizacao.findFirst({
                where: {
                    conversa_id: conversaId
                },
                orderBy: [
                    { finalizada_em: "desc" },
                    { id: "desc" }
                ],
                select: {
                    id: true
                }
            });

        if (!finalizacao) {
            throw new BadRequestException(
                "Esta conversa ainda não foi finalizada."
            );
        }

        try {
            const avaliacao = await this.prisma.avaliacao.create({
                data: {
                    finalizacao_id: finalizacao.id,
                    avaliador_id: usuarioLogadoId,
                    nota: dados.nota,
                    descricao: dados.descricao?.trim() || null
                },
                select: {
                    id: true,
                    finalizacao_id: true,
                    avaliador_id: true,
                    nota: true,
                    descricao: true,
                    criada_em: true
                }
            });

            return {
                id: avaliacao.id,
                conversaId,
                finalizacaoId: avaliacao.finalizacao_id,
                avaliadorId: avaliacao.avaliador_id,
                nota: avaliacao.nota,
                descricao: avaliacao.descricao,
                criadaEm: avaliacao.criada_em
            };
        } catch (erro) {
            if (
                erro instanceof Prisma.PrismaClientKnownRequestError &&
                erro.code === "P2002"
            ) {
                throw new ConflictException(
                    "Você já avaliou esta finalização."
                );
            }

            throw erro;
        }
    }

    async transferirConversa(
        usuarioLogadoId: number,
        conversaId: number,
        dados: TransferirConversaDto
    ) {
        const contexto = await this.verificarAcessoConversa(
            usuarioLogadoId,
            conversaId
        );

        if (
            contexto.conversa.tipo !== "setor" ||
            !contexto.atendimento
        ) {
            throw new BadRequestException(
                "Somente conversas de atendimento podem ser transferidas."
            );
        }

        if (contexto.usuarioLogado.tipo_usuario === "user") {
            throw new ForbiddenException(
                "Usuários comuns não podem transferir conversas."
            );
        }

        const motivo = dados.motivo.trim();

        if (motivo.length < 10 || motivo.length > 500) {
            throw new BadRequestException(
                "O motivo deve ter entre 10 e 500 caracteres."
            );
        }

        const setorOrigemEsperadoId =
            contexto.atendimento.setor_id;

        const resultado = await this.prisma.$transaction(
            async (transacao) => {
                const linhasBloqueadas =
                    await transacao.$queryRaw<
                        Array<{ conversa_id: number }>
                    >`
                        SELECT conversa_id
                        FROM conversa_setor
                        WHERE conversa_id = ${conversaId}
                        FOR UPDATE
                    `;

                if (linhasBloqueadas.length === 0) {
                    throw new NotFoundException(
                        "Atendimento de setor não encontrado."
                    );
                }

                const atendimentoAtual =
                    await transacao.conversa_setor.findUnique({
                        where: {
                            conversa_id: conversaId
                        },
                        select: {
                            conversa_id: true,
                            setor_id: true,
                            usuario_id: true,
                            setor: {
                                select: {
                                    id: true,
                                    setor: true,
                                    sigla_setor: true,
                                    secretaria_id: true
                                }
                            },
                            conversa: {
                                select: {
                                    tipo: true
                                }
                            }
                        }
                    });

                if (!atendimentoAtual) {
                    throw new NotFoundException(
                        "Atendimento de setor não encontrado."
                    );
                }

                if (atendimentoAtual.conversa.tipo !== "setor") {
                    throw new BadRequestException(
                        "Somente conversas de atendimento podem ser transferidas."
                    );
                }

                if (
                    atendimentoAtual.setor_id !==
                    setorOrigemEsperadoId
                ) {
                    throw new ConflictException(
                        "A conversa já foi transferida por outro usuário."
                    );
                }

                if (
                    contexto.usuarioLogado.tipo_usuario === "funcionario" &&
                    contexto.usuarioLogado.setor_id !==
                        atendimentoAtual.setor_id
                ) {
                    throw new ForbiddenException(
                        "Esta conversa não pertence mais ao seu setor."
                    );
                }

                if (
                    contexto.usuarioLogado.tipo_usuario === "admin" &&
                    contexto.usuarioLogado.secretaria_id !==
                        atendimentoAtual.setor.secretaria_id
                ) {
                    throw new ForbiddenException(
                        "Esta conversa não pertence mais à sua secretaria."
                    );
                }

                if (
                    atendimentoAtual.setor_id ===
                    dados.setorDestinoId
                ) {
                    throw new BadRequestException(
                        "A conversa já pertence ao setor selecionado."
                    );
                }

                const setorDestino =
                    await transacao.setores.findUnique({
                        where: {
                            id: dados.setorDestinoId
                        },
                        select: {
                            id: true,
                            setor: true,
                            sigla_setor: true,
                            secretaria_id: true,
                            cadastros: {
                                where: {
                                    tipo_usuario: "funcionario",
                                    desativado_em: null
                                },
                                take: 1,
                                select: {
                                    id: true
                                }
                            }
                        }
                    });

                if (!setorDestino) {
                    throw new NotFoundException(
                        "Setor de destino não encontrado."
                    );
                }

                if (setorDestino.cadastros.length === 0) {
                    throw new BadRequestException(
                        "O setor de destino não possui funcionários disponíveis."
                    );
                }

                // Serializa a busca/criação do atendimento de destino para
                // impedir novas conversas duplicadas do mesmo cidadão/setor.
                await transacao.$queryRaw<Array<{ id: number }>>`
                    SELECT id
                    FROM cadastro
                    WHERE id = ${atendimentoAtual.usuario_id}
                    FOR UPDATE
                `;

                let atendimentoDestino =
                    await transacao.conversa_setor.findFirst({
                        where: {
                            setor_id: setorDestino.id,
                            usuario_id: atendimentoAtual.usuario_id,
                            ocultada_para_usuario_em: null
                        },
                        orderBy: {
                            criada_em: "desc"
                        },
                        select: {
                            conversa_id: true
                        }
                    });
                let conversaDestinoReutilizada = true;

                if (!atendimentoDestino) {
                    const atendimentoDestinoOculto =
                        await transacao.conversa_setor.findFirst({
                            where: {
                                setor_id: setorDestino.id,
                                usuario_id: atendimentoAtual.usuario_id
                            },
                            orderBy: {
                                criada_em: "desc"
                            },
                            select: {
                                conversa_id: true
                            }
                        });

                    if (atendimentoDestinoOculto) {
                        atendimentoDestino =
                            await transacao.conversa_setor.update({
                                where: {
                                    conversa_id:
                                        atendimentoDestinoOculto.conversa_id
                                },
                                data: {
                                    ocultada_para_usuario_em: null,
                                    usuario_visivel_desde_mensagem_id: null
                                },
                                select: {
                                    conversa_id: true
                                }
                            });
                    } else {
                        atendimentoDestino =
                            await transacao.conversa_setor.create({
                                data: {
                                    conversa: {
                                        create: {
                                            tipo: "setor"
                                        }
                                    },
                                    setor: {
                                        connect: {
                                            id: setorDestino.id
                                        }
                                    },
                                    usuario: {
                                        connect: {
                                            id: atendimentoAtual.usuario_id
                                        }
                                    }
                                },
                                select: {
                                    conversa_id: true
                                }
                            });
                        conversaDestinoReutilizada = false;
                    }
                }

                const transferencia =
                    await transacao.conversa_transferencia.create({
                        data: {
                            conversa_id: conversaId,
                            setor_origem_id:
                                atendimentoAtual.setor.id,
                            setor_destino_id: setorDestino.id,
                            transferida_por_id: usuarioLogadoId,
                            motivo
                        },
                        select: {
                            id: true,
                            transferida_em: true
                        }
                    });

                const conteudoMensagemEquipe =
                    `${contexto.usuarioLogado.nome} encaminhou um atendimento ` +
                    `do setor ${atendimentoAtual.setor.setor}.\n` +
                    `Motivo: ${motivo}`;

                const mensagemEquipe =
                    await transacao.mensagem.create({
                        data: {
                            conversa_id:
                                atendimentoDestino.conversa_id,
                            remetente_id: usuarioLogadoId,
                            origem: "setor",
                            sistema: true,
                            visibilidade: "equipe",
                            transferencia_id: transferencia.id,
                            setor_id: setorDestino.id,
                            conteudo:
                                this.criptografiaMensagens.criptografar(
                                    conteudoMensagemEquipe,
                                    atendimentoDestino.conversa_id
                                )
                        },
                        select: {
                            id: true
                        }
                    });

                const conteudoMensagemCidadao =
                    `Seu atendimento foi encaminhado para o setor ` +
                    `${setorDestino.setor}.`;
                const mensagemCidadao =
                    await transacao.mensagem.create({
                        data: {
                            conversa_id:
                                atendimentoDestino.conversa_id,
                            remetente_id: usuarioLogadoId,
                            origem: "setor",
                            sistema: true,
                            visibilidade: "cidadao",
                            transferencia_id: transferencia.id,
                            setor_id: setorDestino.id,
                            conteudo:
                                this.criptografiaMensagens.criptografar(
                                    conteudoMensagemCidadao,
                                    atendimentoDestino.conversa_id
                                )
                        },
                        select: {
                            id: true
                        }
                    });

                return {
                    transferenciaId: transferencia.id,
                    transferidaEm: transferencia.transferida_em,
                    conversaDestinoId:
                        atendimentoDestino.conversa_id,
                    conversaDestinoReutilizada,
                    mensagemEquipeId: mensagemEquipe.id,
                    mensagemCidadaoId: mensagemCidadao.id,
                    conteudoMensagemCidadao,
                    setorOrigem: atendimentoAtual.setor,
                    setorDestino: {
                        id: setorDestino.id,
                        setor: setorDestino.setor,
                        sigla_setor: setorDestino.sigla_setor,
                        secretaria_id: setorDestino.secretaria_id
                    }
                };
            }
        );

        void this.notificacoesService.enviarNovaMensagem({
            conversaId: resultado.conversaDestinoId,
            mensagemId: resultado.mensagemCidadaoId,
            remetenteId: usuarioLogadoId,
            remetenteNome: resultado.setorDestino.setor,
            conteudo: resultado.conteudoMensagemCidadao,
            possuiArquivo: false
        });

        return {
            conversaId,
            conversaDestinoId: resultado.conversaDestinoId,
            conversaDestinoReutilizada:
                resultado.conversaDestinoReutilizada,
            transferenciaId: resultado.transferenciaId,
            transferidaEm: resultado.transferidaEm,
            setorOrigem: {
                id: resultado.setorOrigem.id,
                nome: resultado.setorOrigem.setor,
                sigla: resultado.setorOrigem.sigla_setor
            },
            setorDestino: {
                id: resultado.setorDestino.id,
                nome: resultado.setorDestino.setor,
                sigla: resultado.setorDestino.sigla_setor
            }
        };
    }
}
