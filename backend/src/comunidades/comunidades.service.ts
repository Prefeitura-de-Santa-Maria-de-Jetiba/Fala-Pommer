import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Categorias, CriarComunidadeDto } from './dto/criar-comunidade.dto';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { type JwtPayload } from '../auth/auth.guard';
import { comunidade_usuarios_tipo_funcao, conversa_tipo, Prisma } from '../generated/prisma/client';
import { MensagensCriptografiaService } from '../criptografia/mensagens-criptografia.service';
import { ListarMensagensDto } from '../conversas/dto/listar-mensagens.dto';
import { randomBytes } from 'node:crypto';
import { AtualizarDadosComunidade } from './dto/atualizar-dados-comunidade.dto';

function selecionarComunidade(usuarioId: number) {
    return {
        id: true,
        nome_comunidade: true,
        descricao_comunidade: true,
        imagem_comunidade: true,
        ocultar_municipes: true,
        categorias: true,
        conversa_id: true,
        comunidade_criada_em: true,
        conversa: {
            select: {
                conversa_participante: {
                    where: { usuario_id: usuarioId },
                    select: { usuario_id: true }
                },
                _count: { select: { conversa_participante: true } }
            }
        },
        comunidade_usuarios: {
            where: { usuario_id: usuarioId },
            select: {
                id: true,
                comunidade_id: true,
                usuario_id: true,
                tipo_funcao: true
            }
        },
        criador: {
            select: {
                id: true,
                nome: true,
                foto_perfil_url: true
            }
        }
    } as const;
}

type ComunidadeSelecionada = Prisma.comunidadeGetPayload<{
    select: ReturnType<typeof selecionarComunidade>
}>;

function apresentarComunidade(comunidade: ComunidadeSelecionada) {
    return {
        id: comunidade.id,
        nome_comunidade: comunidade.nome_comunidade,
        descricao_comunidade: comunidade.descricao_comunidade,
        imagem_comunidade: comunidade.imagem_comunidade,
        categorias: comunidade.categorias,
        comunidade_criada_em: comunidade.comunidade_criada_em,
        criador_nome: comunidade.criador?.nome,
        participa: (comunidade.conversa?.conversa_participante.length ?? 0) > 0,
        totalParticipantes: comunidade.conversa?._count.conversa_participante ?? 0,
        funcaoDosMembrosComunidade: comunidade.comunidade_usuarios[0] ?? null
    };
}

const selecionarMensagem = {
    id: true,
    conteudo: true,
    enviada_em: true,
    remetente: { select: { id: true, nome: true, foto_perfil_url: true } }
} as const;

export type ArquivoFotoComunidadeUpload = {
    mimetype: string;
    buffer: Buffer;
};

@Injectable()
export class ComunidadesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly criptografia: MensagensCriptografiaService
    ) {}

    async criarComunidade(
        dados: CriarComunidadeDto,
        usuarioId: number,
        foto?: ArquivoFotoComunidadeUpload
    ) {
        let caminhoFoto: string | undefined;
        let fotoComunidadeUrl: string | undefined;

        if (foto) {
            const extensoes: Record<string, string> = {
                "image/jpeg": ".jpg",
                "image/png": ".png",
                "image/webp": ".webp"
            };
            const extensao = extensoes[foto.mimetype];

            if (!extensao) {
                throw new BadRequestException(
                    "Formato de imagem não permitido."
                );
            }

            const diretorioUploads = join(
                process.cwd(),
                "uploads",
                "comunidades"
            );
            const nomeArquivo = `${randomUUID()}${extensao}`;

            caminhoFoto = join(diretorioUploads, nomeArquivo);
            fotoComunidadeUrl = `/uploads/comunidades/${nomeArquivo}`;

            await mkdir(diretorioUploads, { recursive: true });
            await writeFile(caminhoFoto, foto.buffer);
        }

        try {
            const comunidade = await this.prisma.comunidade.create({
                data: {
                    nome_comunidade: dados.nome_comunidade,
                    criador: {
                        connect: { id: usuarioId }
                    },
                    descricao_comunidade: dados.descricao_comunidade,
                    imagem_comunidade: fotoComunidadeUrl,
                    ocultar_municipes: dados.ocultar_municipes,
                    categorias: dados.categorias,
                    conversa: {
                        create: {
                            tipo: conversa_tipo.comunidade,
                            nome: dados.nome_comunidade.slice(0, 120),
                            conversa_participante: {
                                create: { usuario_id: usuarioId }
                            }
                        }
                    },
                },
                select: selecionarComunidade(usuarioId)
            });

            //chama função de adicionar como admin da comunidade ao criar a comunidade
            await this.criarComunidadeFuncao(
                comunidade.id,
                usuarioId
            );

            return apresentarComunidade(comunidade);
        } catch (erro) {
            if (caminhoFoto) {
                await unlink(caminhoFoto).catch(() => undefined);
            }

            throw erro;
        }
    };

    //adiciona como admin da comunidade o criador da comunidade
    async criarComunidadeFuncao(
        comunidadeId: number, 
        usuarioId: number
    ) {
        const comunidade = await this.prisma.comunidade.findUnique({
            where: {
                id: comunidadeId
            }
        });

        if (!comunidade) {
            throw new Error('Comunidade não encontrada');
        }

        const tipoFuncao = comunidade.comunidade_criador_id === usuarioId
            ? 'admin'
            : 'membro';

        try {
            return this.prisma.comunidade_usuarios.create({
                data: {
                    comunidade_id: comunidadeId,
                    usuario_id: usuarioId,
                    tipo_funcao: tipoFuncao
                },
                select: {
                    comunidade_id: true,
                    usuario_id: true,
                    tipo_funcao: true
                }
            });
        } catch (erro) {
            throw erro
        }
    }

    //adiciona como membro da comunidade ao entrar na comunidade
    async entrarComunidadeFuncao(
        comunidadeId: number,
        usuarioId: number
    ) {
        try {
            return this.prisma.comunidade_usuarios.create({
                data: {
                    comunidade_id: comunidadeId,
                    usuario_id: usuarioId,
                    tipo_funcao: 'membro'
                },
                select: {
                    comunidade_id: true,
                    usuario_id: true,
                    tipo_funcao: true
                }
            });
        } catch (erro) {
            throw erro
        }
    }

    async seguirComunidadeFuncao(
        comunidadeId: number,
        usuarioLogadoId: number,
        banco: Prisma.TransactionClient = this.prisma
    ) {
        try {
            return banco.comunidade_usuarios.create({
                data: {
                    comunidade_id: comunidadeId,
                    usuario_id: usuarioLogadoId,
                    tipo_funcao: "seguidor"
                },
                select: {
                    comunidade_id: true,
                    usuario_id: true,
                    tipo_funcao: true
                }
            });
        } catch (erro) {
            throw erro
        }
    }

    async deixarSeguirComunidadeFuncao(
        comunidadeId: number,
        usuario: Pick<JwtPayload, 'sub' | 'tipo'>,
        banco: Prisma.TransactionClient = this.prisma
    ) {
        return this.prisma.$transaction(async (banco) => {
            // Comunidade existe e é visível para o usuário (404 se não)
            // exigirParticipacao = false, pois seguidor não participa da conversa
            await this.verificarAcesso(comunidadeId, usuario, false, banco);

            // 2. Existe vínculo entre o usuário e a comunidade?
            const vinculo = await banco.comunidade_usuarios.findUnique({
                where: {
                    comunidade_id_usuario_id: {
                        comunidade_id: comunidadeId,
                        usuario_id: usuario.sub
                    }
                },
                select: { tipo_funcao: true }
            });

            if (!vinculo) {
                throw new NotFoundException('Você não segue esta comunidade.');
            }

            // Só seguidor pode deixar de seguir.
            // Membro/admin devem usar sairComunidade (que trata o último admin, conversa etc.)
            if (vinculo.tipo_funcao !== 'seguidor') {
                throw new ConflictException(
                    'Você participa desta comunidade. Use a opção de sair da comunidade.'
                );
            }

            // Remove o vínculo
            await banco.comunidade_usuarios.delete({
                where: {
                    comunidade_id_usuario_id: {
                        comunidade_id: comunidadeId,
                        usuario_id: usuario.sub
                    }
                }
            });

            // Retorna a comunidade atualizada, igual ao seguirComunidade
            return apresentarComunidade(
                await banco.comunidade.findUniqueOrThrow({
                    where: { id: comunidadeId },
                    select: selecionarComunidade(usuario.sub)
                })
            );
        });
    }

    //carrega comunidade_usuarios
    async carregarFuncoesUsuario(comunidadeId: number) {
        try {
            return this.prisma.comunidade_usuarios.findMany({
                where: { comunidade_id: comunidadeId },
                select: {
                    id: true,
                    comunidade_id: true,
                    usuario_id: true,
                    tipo_funcao: true
                },
                orderBy: {id: "asc"}
            })
        } catch (erro) {
            throw erro
        }
    }

    async listarComunidade(tipoUsuario: JwtPayload["tipo"], usuarioId: number) {
        const comunidades = await this.prisma.comunidade.findMany({
            where: tipoUsuario === "user"
                ? { ocultar_municipes: false }
                : undefined,
            select: selecionarComunidade(usuarioId),
            orderBy: { id: 'asc' }
        });
        return comunidades.map(apresentarComunidade);
    };

    private async verificarAcesso(
        comunidadeId: number,
        usuario: Pick<JwtPayload, 'sub' | 'tipo'>,
        exigirParticipacao = true,
        banco: Prisma.TransactionClient = this.prisma
    ) {
        const comunidade = await banco.comunidade.findUnique({
            where: { id: comunidadeId },
            select: selecionarComunidade(usuario.sub)
        });

        if (!comunidade || (comunidade.ocultar_municipes && usuario.tipo === 'user')) {
            throw new NotFoundException('Comunidade não encontrada.');
        }

        const funcao = comunidade.comunidade_usuarios[0]?.tipo_funcao;
        const participaDaConversa =
            (comunidade.conversa?.conversa_participante.length ?? 0) > 0;

        if (exigirParticipacao && !participaDaConversa && funcao !== "seguidor") {
            throw new ForbiddenException('Entre na comunidade para acessar as mensagens.');
        }

        return comunidade;
    }

    async entrarComunidade(comunidadeId: number, usuario: Pick<JwtPayload, 'sub' | 'tipo'>) {
        return this.prisma.$transaction(async (banco) => {
            // Serializa entradas, inclusive a criação do chat para comunidades antigas.
            await banco.$queryRaw(Prisma.sql`SELECT id FROM comunidade WHERE id = ${comunidadeId} FOR UPDATE`);
            const comunidade = await this.verificarAcesso(comunidadeId, usuario, false, banco);

            const vinculo = await banco.comunidade_usuarios.findUnique({
                where: {
                    comunidade_id_usuario_id: {
                        comunidade_id: comunidadeId,
                        usuario_id: usuario.sub
                    }
                },
                select: { tipo_funcao: true }
            });

            if (vinculo?.tipo_funcao === "seguidor") {
                await banco.comunidade_usuarios.update({
                    where: {
                        comunidade_id_usuario_id: {
                            comunidade_id: comunidadeId,
                            usuario_id: usuario.sub
                        }
                    },
                    data: { tipo_funcao: "membro" }
                });
            } else if (!vinculo) {
                await banco.comunidade_usuarios.create({
                    data: {
                        comunidade_id: comunidadeId,
                        usuario_id: usuario.sub,
                        tipo_funcao: "membro"
                    }
                });
            }

            if (!comunidade.conversa_id) {
                const atualizada = await banco.comunidade.update({
                    where: { id: comunidadeId },
                    data: {
                        conversa: {
                            create: {
                                tipo: conversa_tipo.comunidade,
                                nome: comunidade.nome_comunidade.slice(0, 120),
                                conversa_participante: { create: { usuario_id: usuario.sub } }
                            }
                        }
                    },
                    select: selecionarComunidade(usuario.sub)
                });
                return apresentarComunidade(atualizada);
            }

            await banco.conversa_participante.upsert({
                where: {
                    conversa_id_usuario_id: {
                        conversa_id: comunidade.conversa_id,
                        usuario_id: usuario.sub
                    }
                },
                create: { conversa_id: comunidade.conversa_id, usuario_id: usuario.sub },
                update: {}
            });

            return apresentarComunidade(await banco.comunidade.findUniqueOrThrow({
                where: { id: comunidadeId },
                select: selecionarComunidade(usuario.sub)
            }));
        });
    }

    async seguirComunidade(
        comunidadeId: number,
        usuario: Pick<JwtPayload, 'sub' | 'tipo'>
    ) {
        return this.prisma.$transaction(async (banco) => {
            // valida existência/visibilidade, sem exigir participação
            const comunidade = await this.verificarAcesso(comunidadeId, usuario, false, banco);

            const existente = await banco.comunidade_usuarios.findUnique({
                where: {
                    comunidade_id_usuario_id: {
                        comunidade_id: comunidadeId,
                        usuario_id: usuario.sub
                    }
                },
                select: { tipo_funcao: true }
            });

            if (existente) {
                throw new ConflictException(
                    existente.tipo_funcao === 'seguidor'
                        ? 'Você já segue esta comunidade.'
                        : 'Você já participa desta comunidade.'
                );
            }

            await this.seguirComunidadeFuncao(comunidadeId, usuario.sub, banco);

            // Seguir não torna o usuário participante: ele só recebe acesso de
            // leitura pela função "seguidor".
            if (!comunidade.conversa_id) {
                await banco.comunidade.update({
                    where: { id: comunidadeId },
                    data: {
                        conversa: {
                            create: {
                                tipo: conversa_tipo.comunidade,
                                nome: comunidade.nome_comunidade.slice(0, 120)
                            }
                        }
                    }
                });
            }

            return apresentarComunidade(
                await banco.comunidade.findUniqueOrThrow({
                    where: { id: comunidadeId },
                    select: selecionarComunidade(usuario.sub)
                })
            );
        });
    }

    async listarMensagens(
        comunidadeId: number,
        usuario: Pick<JwtPayload, 'sub' | 'tipo'>,
        consulta: ListarMensagensDto
    ) {
        const comunidade = await this.verificarAcesso(comunidadeId, usuario);
        const mensagens = await this.prisma.mensagem.findMany({
            where: {
                conversa_id: comunidade.conversa_id!,
                id: {
                    ...(consulta.depoisDe !== undefined ? { gt: consulta.depoisDe } : {}),
                    ...(consulta.antesDe !== undefined ? { lt: consulta.antesDe } : {})
                }
            },
            orderBy: { id: consulta.depoisDe !== undefined ? 'asc' : 'desc' },
            take: consulta.limite ?? 50,
            select: selecionarMensagem
        });

        if (consulta.depoisDe === undefined) mensagens.reverse();

        return mensagens.map((mensagem) => ({
            id: mensagem.id,
            conteudo: this.criptografia.descriptografar(mensagem.conteudo, comunidade.conversa_id!),
            enviadaEm: mensagem.enviada_em,
            remetente: mensagem.remetente
        }));
    }

    // Retorna o contrato do chat comum; o envio de anexos continua nas rotas de conversas.
    async obterConversa(comunidadeId: number, usuario: Pick<JwtPayload, 'sub' | 'tipo'>) {
        const comunidade = await this.verificarAcesso(comunidadeId, usuario);
        const conversa = await this.prisma.conversa.findUniqueOrThrow({
            where: { id: comunidade.conversa_id! },
            select: {
                id: true,
                criada_em: true,
                conversa_participante: {
                    where: { ocultada_em: null },
                    select: {
                        cadastro: {
                            select: { id: true, nome: true, tipo_usuario: true, foto_perfil_url: true }
                        }
                    }
                }
            }
        });
        return {
            // Mensagens usam este ID, e não o ID da comunidade.
            id: conversa.id,
            tipo: 'comunidade' as const,
            comunidadeId: comunidade.id,
            nome: comunidade.nome_comunidade,
            imagem: comunidade.imagem_comunidade,
            criadaEm: conversa.criada_em,
            participantes: conversa.conversa_participante.map((participante) => participante.cadastro),
            totalParticipantes: conversa.conversa_participante.length,
            somenteLeitura: false,
            mensagensNaoLidas: 0,
            ultimaMensagem: null
        };
    }

    async enviarMensagem(
        comunidadeId: number,
        usuario: Pick<JwtPayload, 'sub' | 'tipo'>,
        conteudo: string
    ) {
        const texto = conteudo.trim();
        if (!texto || texto.length > 4000) {
            throw new BadRequestException('A mensagem deve conter de 1 a 4000 caracteres.');
        }
        const comunidade = await this.verificarAcesso(comunidadeId, usuario);
        const membro = await this.prisma.comunidade_usuarios.findUnique({
            where: {
                comunidade_id_usuario_id: {
                    comunidade_id: comunidadeId,
                    usuario_id: usuario.sub
                }
            },
            select: { tipo_funcao: true }
        });

        if (membro?.tipo_funcao !== "admin") {
            throw new ForbiddenException(
                "Somente administradores podem enviar mensagens nesta comunidade."
            );
        }

        const mensagem = await this.prisma.mensagem.create({
            data: {
                conversa_id: comunidade.conversa_id!,
                remetente_id: usuario.sub,
                origem: 'usuario',
                conteudo: this.criptografia.criptografar(texto, comunidade.conversa_id!)
            },
            select: selecionarMensagem
        });
        return {
            id: mensagem.id,
            conteudo: texto,
            enviadaEm: mensagem.enviada_em,
            remetente: mensagem.remetente
        };
    }

    async criarConviteComunidade(usuarioId: number, comunidadeId: number) {
        const token = randomBytes(32).toString('hex');

        const expiracao = new Date(Date.now() + 60 * 60 * 1000); //1 hora para a expiração

        const convite = await this.prisma.convite_comunidade.create({
            data: {
                token,
                comunidade_id: comunidadeId,
                criado_por: usuarioId,
                expira_em: expiracao,
            },
        });

        return {
            link: `${process.env.FRONTEND_URL}/convite/${token}`,
            expira_em: convite.expira_em
        };
        
    }

    async aceitarConviteComunidade(
        token: string,
        usuario: Pick<JwtPayload, 'sub' | 'tipo'>,
    ) {
        const convite = await this.prisma.convite_comunidade.findUnique({
            where: { token },
            select: {
                id: true,
                comunidade_id: true,
                expira_em: true,
                usado: true,
            },
        });

        if (!convite || convite.usado || convite.expira_em <= new Date()) {
            throw new NotFoundException('Convite inválido ou expirado.');
        }

        const comunidade = await this.entrarComunidade(
            convite.comunidade_id,
            usuario,
        );

        await this.prisma.convite_comunidade.updateMany({
            where: { id: convite.id, usado: false },
            data: { usado: true },
        });

        return comunidade;
    }

    async listarConvites() {
        const convites = await this.prisma.convite_comunidade.findMany({
            orderBy: {
                criado_em: "desc"
            },
            select: {
                id: true,
                comunidade_id: true,
                criado_por: true,
                expira_em: true,
                usado: true,
                criado_em: true,
                comunidade: {
                    select: {
                        nome_comunidade: true,
                    }
                },
                cadastro: {
                    select: {
                        nome: true,
                    },
                },
            },
        });

        return convites.map((convite) => ({
            id: convite.id,
            comunidade: convite.comunidade?.nome_comunidade,
            usuario: convite.cadastro?.nome,
            expira_em: convite.expira_em,
            usado: convite.usado,
            criado_em: convite.criado_em
        }));
    }

    async listarPromocoes() {
        const promocoes = await this.prisma.promocoes_comunidades.findMany({
            orderBy: { promovido_em: "desc" },
            select: {
                id: true,
                promovido_em: true,
                comunidade: {
                    select: { id: true, nome_comunidade: true }
                },
                cadastro_promocoes_comunidades_promovido_porTocadastro: {
                    select: { id: true, nome: true }
                },
                cadastro_promocoes_comunidades_pessoa_promovidaTocadastro: {
                    select: { id: true, nome: true }
                }
            }
        });

        return promocoes.map((promocao) => ({
            id: promocao.id,
            comunidade_id: promocao.comunidade.id,
            comunidade: promocao.comunidade.nome_comunidade,
            promovido_por_id:
                promocao.cadastro_promocoes_comunidades_promovido_porTocadastro.id,
            promovido_por:
                promocao.cadastro_promocoes_comunidades_promovido_porTocadastro.nome,
            pessoa_promovida_id:
                promocao.cadastro_promocoes_comunidades_pessoa_promovidaTocadastro.id,
            pessoa_promovida:
                promocao.cadastro_promocoes_comunidades_pessoa_promovidaTocadastro.nome,
            promovido_em: promocao.promovido_em
        }));
    }

    async listarRebaixamentos() {
        const promocoes = await this.prisma.rebaixamentos_comunidades.findMany({
            orderBy: { rebaixada_em: "desc" },
            select: {
                id: true,
                rebaixada_em: true,
                comunidade: {
                    select: { id: true, nome_comunidade: true }
                },
                cadastro_rebaixamentos_comunidades_rebaixado_porTocadastro: {
                    select: { id: true, nome: true }
                },
                cadastro_rebaixamentos_comunidades_pessoa_rebaixadaTocadastro: {
                    select: { id: true, nome: true }
                }
            }
        });

        return promocoes.map((promocao) => ({
            id: promocao.id,
            comunidade_id: promocao.comunidade.id,
            comunidade: promocao.comunidade.nome_comunidade,
            rebaixado_por_id:
                promocao.cadastro_rebaixamentos_comunidades_rebaixado_porTocadastro.id,
            rebaixado_por:
                promocao.cadastro_rebaixamentos_comunidades_rebaixado_porTocadastro.nome,
            pessoa_rebaixada_id:
                promocao.cadastro_rebaixamentos_comunidades_pessoa_rebaixadaTocadastro.id,
            pessoa_rebaixada:
                promocao.cadastro_rebaixamentos_comunidades_pessoa_rebaixadaTocadastro.nome,
            rebaixada_em: promocao.rebaixada_em
        }));
    }

    async atualizarDadosComunidade(comunidadeId: number, usuarioId: number, dados: AtualizarDadosComunidade, foto?: ArquivoFotoComunidadeUpload) {

        let caminhoFoto: string | undefined;
        let fotoComunidadeUrl: string | undefined;

        if (foto) {
            const extensoes: Record<string, string> = {
                "image/jpeg": ".jpg",
                "image/png": ".png",
                "image/webp": ".webp"
            };
            const extensao = extensoes[foto.mimetype];

            if (!extensao) {
                throw new BadRequestException(
                    "Formato de imagem não permitido."
                );
            }

            const diretorioUploads = join(
                process.cwd(),
                "uploads",
                "comunidades"
            );
            const nomeArquivo = `${randomUUID()}${extensao}`;

            caminhoFoto = join(diretorioUploads, nomeArquivo);
            fotoComunidadeUrl = `/uploads/comunidades/${nomeArquivo}`;

            await mkdir(diretorioUploads, { recursive: true });
            await writeFile(caminhoFoto, foto.buffer);
        }

        return this.prisma.comunidade.update({
            where: {
                id: comunidadeId
            },

            data: {
                nome_comunidade: dados.nome_comunidade?.trim(), //retorna undefined -> não altera caso não for enviado
                descricao_comunidade: dados.descricao_comunidade?.trim(),
                imagem_comunidade: fotoComunidadeUrl
            },

            select: {
                nome_comunidade: true,
                descricao_comunidade: true,
                imagem_comunidade: true
            }
        });
    }

    async adicionarMembrosComunidade(
        usuarioId: number,
        comunidadeId: number,
        usuariosIds: number[],
    ) {
        const idsSelecionados = Array.from(new Set(usuariosIds));

        if (
            idsSelecionados.length < 1 ||
            idsSelecionados.includes(usuarioId)
        ) {
            throw new BadRequestException(
                "Selecione pelo menos uma pessoa diferente de você.",
            );
        }

        return this.prisma.$transaction(async (transacao) => {
            const [minhaFuncao, contatos, jaMembros] = await Promise.all([
                transacao.comunidade_usuarios.findFirst({
                    where: {
                        comunidade_id: comunidadeId,
                        usuario_id: usuarioId,
                    },
                    select: { tipo_funcao: true },
                }),
                transacao.cadastro.findMany({
                    where: {
                        id: { in: idsSelecionados },
                        desativado_em: null,
                    },
                    select: { id: true },
                }),
                transacao.comunidade_usuarios.findMany({
                    where: {
                        comunidade_id: comunidadeId,
                        usuario_id: { in: idsSelecionados },
                    },
                    select: { usuario_id: true },
                }),
            ]);

            if (minhaFuncao?.tipo_funcao !== "admin") {
                throw new ForbiddenException(
                    "Apenas admins podem adicionar membros.",
                );
            }

            if (contatos.length !== idsSelecionados.length) {
                throw new BadRequestException(
                    "Uma ou mais pessoas não podem ser adicionadas.",
                );
            }

            if (jaMembros.length > 0) {
                throw new ConflictException(
                    "Uma ou mais pessoas já participam desta comunidade.",
                );
            }

            const comunidade = await transacao.comunidade.findUnique({
                where: { id: comunidadeId },
                select: {
                    conversa_id: true,
                },
            });

            if (!comunidade) {
                throw new NotFoundException("Comunidade não encontrada.");
            }

            if (!comunidade.conversa_id) {
                throw new ConflictException(
                    "Esta comunidade não possui uma conversa vinculada."
                );
            }

            await transacao.comunidade_usuarios.createMany({
                data: idsSelecionados.map((usuarioId) => ({
                    comunidade_id: comunidadeId,
                    usuario_id: usuarioId,
                    tipo_funcao: "membro",
                })),
            });

            await transacao.conversa_participante.createMany({
                data: idsSelecionados.map((id) => ({
                    conversa_id: comunidade.conversa_id!,
                    usuario_id: id,
                })),
            });

            const adicionados = await transacao.comunidade_usuarios.findMany({
                where: {
                    comunidade_id: comunidadeId,
                    usuario_id: { in: idsSelecionados },
                },
                select: {
                    usuario_id: true,
                    tipo_funcao: true
                },
            });

            // busca todos os membros atuais para o front atualizar a tela
            const membros = await transacao.comunidade_usuarios.findMany({
                where: { comunidade_id: comunidadeId },
                select: {
                    tipo_funcao: true,
                    cadastro: {
                        select: {
                            id: true,
                            nome: true,
                            tipo_usuario: true,
                            foto_perfil_url: true,
                        },
                    },
                },
            });

            return {
                adicionados,
                participantes: membros.map((membro) => ({
                    ...membro.cadastro,
                    tipoUsuario: membro.cadastro.tipo_usuario,
                })),
                totalParticipantes: membros.length,
            };
        });
    }

    async sairComunidade(
        usuarioLogadoId: number,
        comunidadeId: number,
        conversaId: number
    ) {

        const resultado = await this.prisma.$transaction(
            async (transacao) => {
                const usuarioLogado = await transacao.cadastro.findUnique({
                    where: {
                        id: usuarioLogadoId
                    },
                    select: {
                        id: true,
                        nome: true,
                        tipo_usuario: true,
                        desativado_em: true,
                        comunidade_usuarios: {
                            where: { comunidade_id: comunidadeId },
                            select: { tipo_funcao: true }
                        }
                    }
                });

                if (!usuarioLogado) {
                    throw new NotFoundException(
                        "Usuário autenticado não encontrado."
                    );
                }

                const conversa = await transacao.conversa.findUnique({
                    where: {
                        id: conversaId
                    },
                    select: {
                        id: true,
                        tipo: true,
                        comunidade: {
                            select: {
                                id: true
                            }
                        },
                        conversa_participante: {
                            where: {
                                usuario_id: usuarioLogadoId
                            },
                            select: {
                                usuario_id: true
                            }
                        }
                    }
                });

                const totalAdminsComunidade = await transacao.comunidade_usuarios.count({
                    where: {
                        comunidade_id: comunidadeId,
                        tipo_funcao: "admin"
                    }
                });

                const eAdminNestaComunidade = usuarioLogado.comunidade_usuarios[0]?.tipo_funcao === "admin";

                if (totalAdminsComunidade === 1 && eAdminNestaComunidade) {
                    throw new BadRequestException(
                        "Você não pode sair da comunidade sendo o único admin. Promova outro membro antes de sair."
                    );
                }

                const comunidade = await transacao.comunidade.findUnique({
                    where: {
                        id: comunidadeId
                    },
                    select: {
                        id: true,
                        ocultar_municipes: true
                    }
                });

                if (usuarioLogado.desativado_em !== null) {
                    throw new ForbiddenException(
                        "Você não pode sair da comunidade."
                    );
                }

                if (!conversa) {
                    throw new NotFoundException(
                        "Conversa não encontrada."
                    );
                }

                if (conversa.comunidade?.id !== comunidadeId) {
                    throw new BadRequestException(
                        "Esta conversa não pertence à comunidade informada."
                    );
                }

                if (conversa.tipo !== "comunidade") {
                    throw new BadRequestException(
                        "Somente membros de comunidades pode usar esta ação."
                    );
                }

                if (conversa.conversa_participante.length === 0) {
                    throw new ForbiddenException(
                        "Você não participa desta comunidade."
                    );
                }

                if (!comunidade) {
                    throw new NotFoundException(
                        "Comunidade não encontrada"
                    );
                }

                if (usuarioLogado.tipo_usuario === "user" && comunidade.ocultar_municipes === true) {
                    throw new BadRequestException(
                        "Você não tem acesso a esta ação"
                    );
                }

                await transacao.comunidade_usuarios.delete({
                    where: {
                        comunidade_id_usuario_id: {
                            comunidade_id: comunidadeId,
                            usuario_id: usuarioLogadoId
                        }
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
                    await this.prisma.conversa_participante.count({
                        where: {
                            conversa_id: conversaId
                        }
                    });

                return totalParticipantes
            }
        );

        return resultado;
    }

    async removerDaComunidade(
        usuarioLogadoId: number,
        comunidadeId: number,
        conversaId: number,
        id: number,
    ) {
        const remover = await this.prisma.$transaction(
            async (transacao) => {
                const usuario = await transacao.cadastro.findUnique({
                    where: {
                        id,
                    },
                    select: {
                        id: true,
                        nome: true,
                        tipo_usuario: true,
                        desativado_em: true,
                        comunidade_usuarios: {
                            where: {
                                comunidade_id: comunidadeId
                            },
                            select: {
                                tipo_funcao: true,
                            }
                        }
                    }
                });

                const usuarioLogado = await transacao.cadastro.findUnique({
                    where: {
                        id: usuarioLogadoId
                    },
                    select: {
                        id: true,
                        nome: true,
                        tipo_usuario: true,
                        desativado_em: true,
                        comunidade_usuarios: {
                            where: {
                                comunidade_id: comunidadeId
                            },
                            select: {
                                tipo_funcao: true,
                            }
                        }
                    }
                });

                const comunidade = await transacao.comunidade.findUnique({
                    where: {
                        id: comunidadeId
                    },
                    select: {
                        id: true,
                        ocultar_municipes: true
                    }
                });

                const conversa = await transacao.conversa.findUnique({
                    where: {
                        id: conversaId
                    },
                    select: {
                        id: true,
                        tipo: true,
                        comunidade: {
                            select: {
                                id: true
                            }
                        },
                        conversa_participante: {
                            where: {
                                usuario_id: usuarioLogadoId
                            },
                            select: {
                                usuario_id: true
                            }
                        }
                    }
                });

                const donoComunidade = await transacao.comunidade.findFirst({
                    where: {
                        id: comunidadeId,
                        comunidade_criador_id: id
                    },
                    select: {
                        comunidade_criada_em: true,
                        comunidade_usuarios: {
                            select: {
                                tipo_funcao: true
                            }
                        }
                    }
                });

                if (!usuarioLogado) {
                    throw new NotFoundException(
                        "Usuário autenticado não encontrado."
                    );
                }

                if (usuarioLogado.desativado_em !== null) {
                    throw new ForbiddenException(
                        "Você não tem permissão para remover alguém"
                    );
                }

                const funcaoSolicitante =
                    usuarioLogado.comunidade_usuarios[0]?.tipo_funcao;

                if (!funcaoSolicitante) {
                    throw new ForbiddenException(
                        "Você não pertence a esta comunidade."
                    );
                }

                if (funcaoSolicitante !== "admin") {
                    throw new ForbiddenException(
                        "Você não tem permissão para remover membros."
                    );
                }

                if (donoComunidade?.comunidade_usuarios?.[0]?.tipo_funcao === "admin") {
                    throw new ForbiddenException(
                        "Não é possível remover o criador da comunidade enquanto ele for administrador"
                    )
                }

                if (!conversa) {
                    throw new NotFoundException(
                        "Conversa não encontrada."
                    );
                }

                if (!usuario) {
                    throw new NotFoundException(
                        'Usuário não encontrado'
                    );
                }

                if (conversa.comunidade?.id !== comunidadeId) {
                    throw new BadRequestException(
                        "Esta conversa não pertence à comunidade informada."
                    );
                }

                if (conversa.tipo !== "comunidade") {
                    throw new BadRequestException(
                        "Somente admins de comunidades pode usar esta ação."
                    );
                }

                if (conversa.conversa_participante.length === 0) {
                    throw new ForbiddenException(
                        "Você não participa desta comunidade."
                    );
                }

                if (!comunidade) {
                    throw new NotFoundException(
                        "Comunidade não encontrada"
                    );
                }

                if (usuarioLogado.tipo_usuario === "user" && comunidade.ocultar_municipes === true) {
                    throw new BadRequestException(
                        "Você não tem acesso a esta ação"
                    );
                }

                if (usuario.comunidade_usuarios[0]?.tipo_funcao === "admin") {
                    throw new BadRequestException(
                        "Rebaixe este usuário antes de o remover"
                    )
                }

                if (usuario.comunidade_usuarios.length === 0) {
                    throw new NotFoundException(
                        "Este usuário não pertence à comunidade."
                    );
                }

                await transacao.comunidade_usuarios.delete({
                    where: {
                        comunidade_id_usuario_id: {
                            comunidade_id: comunidadeId,
                            usuario_id: id
                        }
                    }
                });

                await transacao.conversa_leitura.deleteMany({
                    where: {
                        conversa_id: conversaId,
                        usuario_id: id
                    }
                });

                await transacao.conversa_participante.delete({
                    where: {
                        conversa_id_usuario_id: {
                            conversa_id: conversaId,
                            usuario_id: id
                        }
                    }
                });

                const totalParticipantes =
                    await transacao.conversa_participante.count({
                        where: {
                            conversa_id: conversaId
                        }
                    });

                return totalParticipantes
            }
        );
        return remover;
    }

    async promoverMembroComunidade(
        id: number,
        usuarioLogadoId: number,
        comunidadeId: number
    ) {
        const promover = await this.prisma.$transaction(
            async (transacao) => {
                const usuario = await transacao.cadastro.findUnique({
                    where: {
                        id,
                    },
                    select: {
                        id: true,
                        nome: true,
                        tipo_usuario: true,
                        desativado_em: true,
                        comunidade_usuarios: {
                            where: {
                                comunidade_id: comunidadeId
                            },
                            select: {
                                tipo_funcao: true,
                            }
                        }
                    }
                });

                const usuarioLogado = await transacao.cadastro.findUnique({
                    where: {
                        id: usuarioLogadoId
                    },
                    select: {
                        id: true,
                        nome: true,
                        tipo_usuario: true,
                        desativado_em: true,
                        comunidade_usuarios: {
                            where: {
                                comunidade_id: comunidadeId
                            },
                            select: {
                                tipo_funcao: true,
                            }
                        }
                    }
                });

                const comunidade = await transacao.comunidade.findUnique({
                    where: {
                        id: comunidadeId
                    },
                    select: {
                        id: true,
                    }
                });

                const membro = await transacao.comunidade_usuarios.findUnique({
                    where: {
                        comunidade_id_usuario_id: {
                            comunidade_id: comunidadeId,
                            usuario_id: id
                        }
                    }
                });

                const membroLogado = await transacao.comunidade_usuarios.findUnique({
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

                if (!membro) {
                    throw new BadRequestException(
                        'Usuário não pertence a esta comunidade'
                    );
                }

                if (!comunidade) {
                    throw new NotFoundException(
                        "Comunidade não encontrada"
                    );
                }

                if (!usuario) {
                    throw new NotFoundException(
                        'Usuário não encontrado'
                    );
                }

                if (!usuarioLogado) {
                    throw new NotFoundException(
                        'Usuário logado não encontrado'
                    );
                }

                if (usuarioLogado.desativado_em !== null) {
                    throw new ForbiddenException(
                        'Sua conta está desativada'
                    );
                }

                if (membroLogado?.tipo_funcao !== 'admin') {
                    throw new ForbiddenException(
                        'Somente administradores podem promover membros'
                    );
                }

                if (usuario.desativado_em !== null) {
                    throw new BadRequestException(
                        'Não é possível promover um usuário desativado'
                    );
                }

                if (usuarioLogado?.comunidade_usuarios?.[0]?.tipo_funcao !== "admin") {
                    throw new BadRequestException(
                        "Você não tem permissão para promover"
                    );
                }

                if (membro.tipo_funcao === 'admin') {
                    throw new BadRequestException(
                        'Usuário já é um administrador'
                    );
                }

                const promocao = new Date();

                await transacao.comunidade_usuarios.update({
                    where: {
                        comunidade_id_usuario_id: {
                            comunidade_id: comunidadeId,
                            usuario_id: id
                        }
                    },
                    data: {
                        tipo_funcao: "admin",
                    },
                    select: {
                        comunidade_id: true,
                        usuario_id: true,
                        tipo_funcao: true
                    }
                });

                await transacao.promocoes_comunidades.create({
                    data: {
                        promovido_por: usuarioLogadoId,
                        pessoa_promovida: id,
                        comunidade_id: comunidadeId,
                        promovido_em: promocao
                    }
                });
            }
        );

        return promover;
    }

    async rebaixarAdminComunidade(
        id: number,
        usuarioLogadoId: number,
        comunidadeId: number
    ) {
        const rebaixar = await this.prisma.$transaction(
            async (transacao) => {
                const usuario = await transacao.cadastro.findUnique({
                    where: {
                        id,
                    },
                    select: {
                        id: true,
                        nome: true,
                        tipo_usuario: true,
                        desativado_em: true,
                        comunidade_usuarios: {
                            where: {
                                comunidade_id: comunidadeId
                            },
                            select: {
                                tipo_funcao: true,
                            }
                        }
                    }
                });

                const usuarioLogado = await transacao.cadastro.findUnique({
                    where: {
                        id: usuarioLogadoId
                    },
                    select: {
                        id: true,
                        nome: true,
                        tipo_usuario: true,
                        desativado_em: true,
                        comunidade_usuarios: {
                            where: {
                                comunidade_id: comunidadeId
                            },
                            select: {
                                tipo_funcao: true,
                            }
                        }
                    }
                });

                const comunidade = await transacao.comunidade.findUnique({
                    where: {
                        id: comunidadeId
                    },
                    select: {
                        id: true,
                    }
                });

                const admin = await transacao.comunidade_usuarios.findUnique({
                    where: {
                        comunidade_id_usuario_id: {
                            comunidade_id: comunidadeId,
                            usuario_id: id
                        }
                    }
                });

                const membroLogado = await transacao.comunidade_usuarios.findUnique({
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

                const donoComunidade = await transacao.comunidade.findFirst({
                    where: {
                        id: comunidadeId,
                        comunidade_criador_id: id
                    },
                    select: {
                        comunidade_criada_em: true
                    }
                });

                if (!admin) {
                    throw new BadRequestException(
                        'Usuário não pertence a esta comunidade'
                    );
                }

                if (!comunidade) {
                    throw new NotFoundException(
                        "Comunidade não encontrada"
                    );
                }

                if (!usuario) {
                    throw new NotFoundException(
                        'Usuário não encontrado'
                    );
                }

                if (!usuarioLogado) {
                    throw new NotFoundException(
                        'Usuário logado não encontrado'
                    );
                }

                if (donoComunidade) {
                    throw new ForbiddenException(
                        "Não é possivel rebaixar o dono da comunidade"
                    );
                }

                if (usuarioLogado.desativado_em !== null) {
                    throw new ForbiddenException(
                        'Sua conta está desativada'
                    );
                }

                if (membroLogado?.tipo_funcao !== 'admin') {
                    throw new ForbiddenException(
                        'Somente administradores podem rebaixar admins'
                    );
                }

                if (usuarioLogado?.comunidade_usuarios?.[0]?.tipo_funcao !== "admin") {
                    throw new BadRequestException(
                        "Você não tem permissão para rebaixar"
                    );
                }

                if (admin.tipo_funcao === 'membro') {
                    throw new BadRequestException(
                        'Usuário é um membro, não é possivel rebaixar membros'
                    );
                }

                const rebaixamento = new Date();

                await transacao.comunidade_usuarios.update({
                    where: {
                        comunidade_id_usuario_id: {
                            comunidade_id: comunidadeId,
                            usuario_id: id
                        }
                    },
                    data: {
                        tipo_funcao: "membro"
                    },
                    select: {
                        comunidade_id: true,
                        usuario_id: true,
                        tipo_funcao: true
                    }
                });

                await transacao.rebaixamentos_comunidades.create({
                    data: {
                        rebaixado_por: usuarioLogadoId,
                        pessoa_rebaixada: id,
                        comunidade_id: comunidadeId,
                        rebaixada_em: rebaixamento
                    }
                })
            }
        );

        return rebaixar;
    }
}
