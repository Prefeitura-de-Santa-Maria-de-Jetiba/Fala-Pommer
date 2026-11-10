// Contém as regras de negócio relacionadas aos usuários.
import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException
} from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { CriarUsuarioDto } from "./dto/criar-usuario.dto";
import { AtualizarUsuarioDto } from "./dto/atualizar-usuario.dto";
import { AtualizarMeuPerfilDto } from "./dto/atualizar-meu-perfil.dto";
import { EmailService } from "../email/email.service";
import { MensagensCriptografiaService } from "../criptografia/mensagens-criptografia.service";

import * as bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { identity } from "rxjs";

export type ArquivoFotoPerfilUpload = {
    originalname: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
};

@Injectable()
export class UsuariosService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly emailService: EmailService,
        private readonly criptografiaMensagens: MensagensCriptografiaService
    ) {}

    async cadastrar(
        dados: CriarUsuarioDto,
        fotoPerfilUrl?: string
    ) {
        if (dados.senha !== dados.confirmarSenha) {
            throw new BadRequestException(
                "As senhas não coincidem."
            );
        }

        const dataNascimento =
            new Date(dados.dataNascimento);

        const anoNascimento =
            dataNascimento.getFullYear();

        if (
            Number.isNaN(dataNascimento.getTime())
        ) {
            throw new BadRequestException(
                "Data de nascimento inválida."
            );
        }

        if (anoNascimento > 2014) {
            throw new BadRequestException(
                "Informe uma data de nascimento antes de 2014."
            );
        }

        if (anoNascimento < 1926) {
            throw new BadRequestException(
                "Informe uma data de nascimento a partir de 1926."
            );
        }

        const temMinuscula =
            /[a-z]/.test(dados.senha);

        const temMaiuscula =
            /[A-Z]/.test(dados.senha);

        const temNumero =
            /[0-9]/.test(dados.senha);

        const temEspecial =
            /[^0-9A-Za-z\s]/.test(dados.senha);

        if (
            !temMinuscula ||
            !temMaiuscula ||
            !temNumero ||
            !temEspecial
        ) {
            throw new BadRequestException(
                "Insira uma senha contendo letras maiúsculas, minúsculas, números e símbolos."
            );
        }

        const email =
            dados.email.trim().toLowerCase();

        const cpfLimpo =
            dados.cpf.replace(/\D/g, "");

        const telefoneLimpo =
            dados.numeroTelefone.replace(/\D/g, "");

        const usuarioExistente =
            await this.prisma.cadastro.findFirst({
                where: {
                    OR: [
                        { email },
                        { cpf: cpfLimpo }
                    ]
                },

                select: {
                    id: true
                }
            });

        if (usuarioExistente) {
            throw new ConflictException(
                "Já existe usuário com este CPF ou e-mail."
            );
        }

        const senhaHash =
            await bcrypt.hash(
                dados.senha,
                12
            );

        const usuarioCriado = await this.prisma.cadastro.create({
            data: {
                nome: dados.nome.trim(),

                data_nascimento: new Date(
                    `${dados.dataNascimento}T00:00:00.000Z`
                ),

                cpf: cpfLimpo,
                telefone: telefoneLimpo,
                email,
                senha: senhaHash,
                foto_perfil_url: fotoPerfilUrl
            },

            select: {
                id: true,
                nome: true,
                data_nascimento: true,
                cpf: true,
                telefone: true,
                email: true
            }
        });

        await this.emailService.enviarConfirmacaoCadastro(
            usuarioCriado.email,
            usuarioCriado.nome
        );

        return usuarioCriado;
    }

    async chamarHistorico() {
        return await this.prisma.historico_administrativo.findMany({
            select: {
                id: true,
                administrador: {
                    select: {
                        id: true,
                        nome: true,
                    },
                },
                usuario_alvo: {
                    select: {
                        id: true,
                        nome: true,
                    },
                },
                acao: true,
                motivo: true,
                criado_em: true,
                tipo_usuario_anterior: true,
            },
            orderBy: {
                criado_em: 'asc'
            }
        });
    }

    async buscarPorEmail(
        email: string
    ) {
        return this.prisma.cadastro.findFirst({
            where: {
                email: email.trim().toLowerCase()
            }
        });
    }

    /*
     * Admin:
     * lista todos, menos o próprio admin.
     *
     * Funcionário:
     * lista apenas usuários comuns.
     */
    async listarUsuariosParaConversa(
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

        if (
            usuarioLogado.tipo_usuario !== "superAdmin" &&
            usuarioLogado.tipo_usuario !== "admin" &&
            usuarioLogado.tipo_usuario !== "funcionario"
        ) {
            throw new ForbiddenException(
                "Você não possui permissão para listar contatos."
            );
        }

        const usuarios =
            await this.prisma.cadastro.findMany({
                where: {
                    OR: [
                        {
                            desativado_em: null
                        },
                        {
                            tipo_usuario: "user"
                        }
                    ],

                    id: {
                        not: usuarioLogado.id
                    },

                    ...(usuarioLogado.tipo_usuario ===
                    "funcionario"
                        ? {
                            tipo_usuario: "user" as const
                        }
                        : {})
                },

                select: {
                    id: true,
                    nome: true,
                    tipo_usuario: true,
                    foto_perfil_url: true,

                    setor: {
                        select: {
                            id: true,
                            setor: true,
                            sigla_setor: true
                        }
                    },

                    secretaria: {
                        select: {
                            id: true,
                            secretaria: true,
                            sigla_secretaria: true
                        }
                    }
                },

                orderBy: {
                    nome: "asc"
                }
            });

        return usuarios.map((usuario) => ({
            id: usuario.id,
            nome: usuario.nome,
            tipoUsuario: usuario.tipo_usuario,
            foto_perfil_url: usuario.foto_perfil_url,

            setor: usuario.setor
                ? {
                    id: usuario.setor.id,
                    nome: usuario.setor.setor,
                    sigla:
                        usuario.setor.sigla_setor
                }
                : null
        }));
    }

    /*
     * Lista somente os perfis que podem participar de grupos.
     * Usuários comuns são excluídos no banco e nunca chegam ao cliente.
     */
    async listarContatosParaGrupo(
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
                "Você não possui permissão para acessar grupos."
            );
        }

        const contatos =
            await this.prisma.cadastro.findMany({
                where: {
                    desativado_em: null,
                    id: {
                        not: usuarioLogado.id
                    },
                    tipo_usuario: {
                        not: "user"
                    }
                },

                select: {
                    id: true,
                    nome: true,
                    tipo_usuario: true,
                    foto_perfil_url: true,
                    setor: {
                        select: {
                            id: true,
                            setor: true,
                            sigla_setor: true
                        }
                    }
                },

                orderBy: {
                    nome: "asc"
                }
            });

        return contatos.map((contato) => ({
            id: contato.id,
            nome: contato.nome,
            tipoUsuario: contato.tipo_usuario,
            foto_perfil_url: contato.foto_perfil_url,
            setor: contato.setor
                ? {
                    id: contato.setor.id,
                    nome: contato.setor.setor,
                    sigla: contato.setor.sigla_setor
                }
                : null
        }));
    }

    async listarContatosParaComunidade(usuarioLogadoId: number) {
        const usuarioLogado = await this.prisma.cadastro.findUnique({
            where: {
                id: usuarioLogadoId
            },
            select: {
                id: true,
                tipo_usuario: true
            }
        })

        if (!usuarioLogado) {
            throw new NotFoundException(
                "Usuário autenticado não encontrado."
            );
        }

        const contatos = await this.prisma.cadastro.findMany({
            where: {
                desativado_em: null,
                id: {
                    not: usuarioLogado.id
                }
            },

            select: {
                id: true,
                nome: true,
                tipo_usuario: true,
                foto_perfil_url: true,
            },

            orderBy: {
                nome: "asc"
            }
        });

        return contatos.map((contato) => ({
            id: contato.id,
            nome: contato.nome,
            tipoUsuario: contato.tipo_usuario,
            foto_perfil_url: contato.foto_perfil_url,
        }));
    }

    async listarMeuPerfil(id: number) {
        return this.prisma.cadastro.findUnique({
            where: {
                id: id,
            },
            select: {
                id: true,
                nome: true,
                telefone: true,
                email: true,
                tipo_usuario: true,
                foto_perfil_url: true,
                setor: {
                    select: {
                        id: true,
                        setor: true,
                        sigla_setor: true,
                    },
                },
                secretaria: {
                    select: {
                        id: true,
                        secretaria: true,
                        sigla_secretaria: true,
                    },
                },
            }
        })
    }

    async atualizarMeuPerfil(
        id: number,
        dados: AtualizarMeuPerfilDto
    ) {
        const usuario =
            await this.prisma.cadastro.findUnique({
                where: {
                    id
                },

                select: {
                    id: true
                }
            });

        if (!usuario) {
            throw new NotFoundException(
                "Usuário não encontrado."
            );
        }

        const email =
            dados.email.trim().toLowerCase();

        const usuarioComMesmoEmail =
            await this.prisma.cadastro.findFirst({
                where: {
                    email,
                    id: {
                        not: id
                    }
                },

                select: {
                    id: true
                }
            });

        if (usuarioComMesmoEmail) {
            throw new ConflictException(
                "Já existe outro usuário com este e-mail."
            );
        }

        return this.prisma.cadastro.update({
            where: {
                id
            },

            data: {
                nome: dados.nome.trim(),
                email,
                telefone: dados.telefone.trim()
            },

            select: {
                id: true,
                nome: true,
                telefone: true,
                email: true,
                tipo_usuario: true,
                foto_perfil_url: true,
                setor: {
                    select: {
                        id: true,
                        setor: true,
                        sigla_setor: true
                    }
                },
                secretaria: {
                    select: {
                        id: true,
                        secretaria: true,
                        sigla_secretaria: true
                    }
                },
            }
        });
    }

    async atualizarFotoPerfil(
        id: number,
        foto?: ArquivoFotoPerfilUpload
    ) {
        if (!foto) {
            throw new BadRequestException(
                "Selecione uma foto para enviar."
            );
        }

        const usuario = await this.prisma.cadastro.findUnique({
            where: { id },
            select: { id: true }
        });

        if (!usuario) {
            throw new NotFoundException(
                "Usuário não encontrado."
            );
        }

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
            "perfis"
        );
        const nomeArquivo = `${randomUUID()}${extensao}`;
        const caminhoArquivo = join(diretorioUploads, nomeArquivo);
        const urlFoto = `/uploads/perfis/${nomeArquivo}`;

        await mkdir(diretorioUploads, { recursive: true });
        await writeFile(caminhoArquivo, foto.buffer);

        try {
            return await this.prisma.cadastro.update({
                where: { id },
                data: {
                    foto_perfil_url: urlFoto
                },
                select: {
                    id: true,
                    nome: true,
                    telefone: true,
                    email: true,
                    tipo_usuario: true,
                    foto_perfil_url: true,
                    setor: {
                        select: {
                            id: true,
                            setor: true,
                            sigla_setor: true
                        }
                    }
                }
            });
        } catch (erro) {
            await unlink(caminhoArquivo).catch(() => undefined);
            throw erro;
        }
    }

    async listarTodos() {
        return this.prisma.cadastro.findMany({
            select: {
                id: true,
                nome: true,
                telefone: true,
                email: true,
                tipo_usuario: true,
                setor_id: true,
                secretaria_id: true,
                desativado_em: true,
                motivo_desativacao: true,
            },

            orderBy: {
                id: "asc"
            }
        });
    }

    async atualizar(
        id: number,
        responsavelId: number,
        dados: AtualizarUsuarioDto
    ) {
        return this.prisma.$transaction(async (transacao) => {
            const [responsavel, usuario] = await Promise.all([
                transacao.cadastro.findUnique({
                    where: {
                        id: responsavelId
                    },
                    select: {
                        id: true,
                        tipo_usuario: true,
                        desativado_em: true
                    }
                }),
                transacao.cadastro.findUnique({
                    where: {
                        id
                    },
                    select: {
                        id: true,
                        tipo_usuario: true,
                        desativado_em: true
                    }
                })
            ]);

            if (
                !responsavel ||
                responsavel.desativado_em ||
                responsavel.tipo_usuario !== "superAdmin"
            ) {
                throw new ForbiddenException(
                    "Você não possui permissão para editar usuários."
                );
            }

            if (!usuario) {
                throw new NotFoundException(
                    "Usuário não encontrado."
                );
            }

            if (usuario.desativado_em) {
                throw new ConflictException(
                    "Reative o usuário antes de alterar seus dados."
                );
            }

            if (
                id === responsavelId &&
                dados.tipo_usuario !== "superAdmin"
            ) {
                throw new ForbiddenException(
                    "Um super administrador não pode alterar o próprio cargo."
                );
            }

            if (
                usuario.tipo_usuario === "superAdmin" &&
                dados.tipo_usuario !== "superAdmin"
            ) {
                const superAdministradoresAtivos =
                    await transacao.$queryRaw<Array<{ id: number }>>`
                        SELECT id
                        FROM cadastro
                        WHERE tipo_usuario = 'superAdmin'
                          AND desativado_em IS NULL
                        FOR UPDATE
                    `;

                if (superAdministradoresAtivos.length <= 1) {
                    throw new ConflictException(
                        "O último super administrador ativo não pode perder o cargo."
                    );
                }
            }

            const email = dados.email.trim().toLowerCase();

            const usuarioComMesmoEmail =
                await transacao.cadastro.findFirst({
                    where: {
                        email,
                        id: {
                            not: id
                        }
                    },
                    select: {
                        id: true
                    }
                });

            if (usuarioComMesmoEmail) {
                throw new ConflictException(
                    "Já existe outro usuário com este e-mail."
                );
            }

            if (
                dados.tipo_usuario === "funcionario" &&
                dados.setor_id != null
            ) {
                const setor = await transacao.setores.findUnique({
                    where: {
                        id: dados.setor_id
                    },
                    select: {
                        id: true
                    }
                });

                if (!setor) {
                    throw new BadRequestException(
                        "Setor não encontrado."
                    );
                }
            }

            if (
                dados.tipo_usuario === "admin" &&
                dados.secretaria_id != null
            ) {
                const secretaria = await transacao.secretaria.findUnique({
                    where: {
                        id: dados.secretaria_id
                    },
                    select: {
                        id: true
                    }
                });

                if (!secretaria) {
                    throw new BadRequestException(
                        "Secretaria não encontrada."
                    );
                }
            }

            const cargoAlterado =
                usuario.tipo_usuario !== dados.tipo_usuario;

            return transacao.cadastro.update({
                where: {
                    id
                },
                data: {
                    telefone: dados.telefone.trim(),
                    email,
                    tipo_usuario: dados.tipo_usuario,
                    setor_id:
                        dados.tipo_usuario === "funcionario"
                            ? dados.setor_id ?? null
                            : null,
                    secretaria_id:
                        dados.tipo_usuario === "admin"
                            ? dados.secretaria_id ?? null
                            : null,
                    ...(cargoAlterado
                        ? {
                            versao_token: {
                                increment: 1
                            }
                        }
                        : {})
                },
                select: {
                    id: true,
                    nome: true,
                    telefone: true,
                    email: true,
                    tipo_usuario: true,
                    setor_id: true,
                    secretaria_id: true
                }
            });
        });
    }

    async desativarUsuario(
        id: number,
        administradorId: number,
        motivo: string
    ) {
        const motivoNormalizado = motivo.trim();

        if (
            motivoNormalizado.length < 3 ||
            motivoNormalizado.length > 500
        ) {
            throw new BadRequestException(
                "O motivo da desativação deve ter entre 3 e 500 caracteres."
            );
        }

        return this.prisma.$transaction(async (transacao) => {
            await transacao.$queryRaw<Array<{ id: number }>>`
                SELECT id
                FROM cadastro
                WHERE id = ${id}
                FOR UPDATE
            `;

            const [administrador, usuario] = await Promise.all([
                transacao.cadastro.findUnique({
                    where: {
                        id: administradorId
                    },
                    select: {
                        id: true,
                        tipo_usuario: true,
                        desativado_em: true
                    }
                }),
                transacao.cadastro.findUnique({
                    where: {
                        id
                    },
                    select: {
                        id: true,
                        nome: true,
                        tipo_usuario: true,
                        setor_id: true,
                        secretaria_id: true,
                        desativado_em: true
                    }
                })
            ]);

            if (!administrador) {
                throw new NotFoundException(
                    "Administrador não encontrado."
                );
            }

            if (
                administrador.tipo_usuario !== "superAdmin" ||
                administrador.desativado_em
            ) {
                throw new ForbiddenException(
                    "Somente um super administrador ativo pode desativar usuários."
                );
            }

            if (id === administradorId) {
                throw new ForbiddenException(
                    "Um super administrador não pode desativar a própria conta."
                );
            }

            if (!usuario) {
                throw new NotFoundException(
                    "Usuário não encontrado."
                );
            }

            if (usuario.desativado_em) {
                return transacao.cadastro.findUniqueOrThrow({
                    where: {
                        id
                    },
                    select: {
                        id: true,
                        tipo_usuario: true,
                        setor_id: true,
                        secretaria_id: true,
                        desativado_em: true,
                        desativado_por: true,
                        motivo_desativacao: true,
                        versao_token: true
                    }
                });
            }

            if (usuario.tipo_usuario === "superAdmin") {
                const superAdministradoresAtivos =
                    await transacao.$queryRaw<Array<{ id: number }>>`
                        SELECT id
                        FROM cadastro
                        WHERE tipo_usuario = 'superAdmin'
                          AND desativado_em IS NULL
                        FOR UPDATE
                    `;

                if (superAdministradoresAtivos.length <= 1) {
                    throw new ConflictException(
                        "O último super administrador ativo não pode ser desativado."
                    );
                }
            }

            const desativadoEm = new Date();

            const alteracao = await transacao.cadastro.updateMany({
                where: {
                    id,
                    desativado_em: null
                },
                data: {
                    desativado_em: desativadoEm,
                    desativado_por: administradorId,
                    motivo_desativacao: motivoNormalizado,
                    tipo_usuario: "user",
                    setor_id: null,
                    secretaria_id: null,
                    versao_token: {
                        increment: 1
                    },
                    token_recuperacao: null,
                    token_recuperacao_expira_em: null
                }
            });

            if (alteracao.count === 0) {
                const usuarioAtual =
                    await transacao.cadastro.findUnique({
                        where: {
                            id
                        },
                        select: {
                            id: true,
                            tipo_usuario: true,
                            setor_id: true,
                            secretaria_id: true,
                            desativado_em: true,
                            desativado_por: true,
                            motivo_desativacao: true,
                            versao_token: true
                        }
                    });

                if (usuarioAtual?.desativado_em) {
                    return usuarioAtual;
                }

                throw new ConflictException(
                    "O usuário foi alterado por outra operação."
                );
            }

            await transacao.login_evento.updateMany({
                where: {
                    usuario_id: id,
                    saiu_em: null
                },
                data: {
                    saiu_em: desativadoEm
                }
            });

            await transacao.desafio_login_2fa.updateMany({
                where: {
                    usuario_id: id,
                    usado_em: null
                },
                data: {
                    usado_em: desativadoEm
                }
            });

            // A conversa privada permanece para os demais participantes,
            // mas deixa de existir para o perfil que virou usuário comum.
            await transacao.conversa_participante.updateMany({
                where: {
                    usuario_id: id,
                    conversa: {
                        tipo: "privada"
                    }
                },
                data: {
                    ocultada_em: desativadoEm,
                    visivel_desde_mensagem_id: null
                }
            });

            const gruposDoUsuario =
                await transacao.conversa_participante.findMany({
                    where: {
                        usuario_id: id,
                        conversa: {
                            tipo: "grupo"
                        }
                    },
                    select: {
                        conversa_id: true
                    }
                });

            // Em grupos, remove o vínculo e registra no histórico visível
            // aos demais participantes por que o perfil saiu.
            await transacao.conversa_participante.deleteMany({
                where: {
                    usuario_id: id,
                    conversa: {
                        tipo: "grupo"
                    }
                }
            });

            if (gruposDoUsuario.length > 0) {
                await transacao.mensagem.createMany({
                    data: gruposDoUsuario.map((grupo) => ({
                        conversa_id: grupo.conversa_id,
                        remetente_id: administradorId,
                        origem: "usuario",
                        conteudo: this.criptografiaMensagens.criptografar(
                            `${usuario.nome} foi removido do grupo porque seu perfil foi desativado.`,
                            grupo.conversa_id
                        ),
                        enviada_em: desativadoEm
                    }))
                });
            }

            // O atendimento continua disponível ao setor, mas não
            // volta a aparecer para a conta que foi desativada.
            await transacao.conversa_setor.updateMany({
                where: {
                    usuario_id: id,
                    ocultada_para_usuario_em: null
                },
                data: {
                    ocultada_para_usuario_em: desativadoEm
                }
            });

            await transacao.conversa_leitura.deleteMany({
                where: {
                    usuario_id: id
                }
            });

            await transacao.historico_administrativo.create({
                data: {
                    administrador_id: administradorId,
                    usuario_alvo_id: id,
                    acao: "usuario_desativado",
                    motivo: motivoNormalizado,
                    tipo_usuario_anterior: usuario.tipo_usuario,
                    setor_id_anterior: usuario.setor_id,
                    secretaria_id_anterior: usuario.secretaria_id,
                    criado_em: desativadoEm
                }
            });

            await transacao.comunidade_usuarios.updateMany({
                where: {
                    usuario_id: id
                },
                data: {
                    tipo_funcao: "membro"
                }
            });

            return transacao.cadastro.findUniqueOrThrow({
                where: {
                    id
                },
                select: {
                    id: true,
                    tipo_usuario: true,
                    setor_id: true,
                    secretaria_id: true,
                    desativado_em: true,
                    desativado_por: true,
                    motivo_desativacao: true,
                    versao_token: true
                }
            });
        });
    }

    async reativarUsuario(
        id: number,
        administradorId: number
    ) {
        return this.prisma.$transaction(async (transacao) => {
            const [administrador, usuario] = await Promise.all([
                transacao.cadastro.findUnique({
                    where: {
                        id: administradorId
                    },
                    select: {
                        id: true,
                        tipo_usuario: true,
                        desativado_em: true
                    }
                }),
                transacao.cadastro.findUnique({
                    where: {
                        id
                    },
                    select: {
                        id: true,
                        tipo_usuario: true,
                        setor_id: true,
                        secretaria_id: true,
                        desativado_em: true
                    }
                })
            ]);

            if (!administrador) {
                throw new NotFoundException(
                    "Administrador não encontrado."
                );
            }

            if (
                administrador.tipo_usuario !== "superAdmin" ||
                administrador.desativado_em
            ) {
                throw new ForbiddenException(
                    "Somente um super administrador ativo pode reativar usuários."
                );
            }

            if (!usuario) {
                throw new NotFoundException(
                    "Usuário não encontrado."
                );
            }

            if (!usuario.desativado_em) {
                throw new ConflictException(
                    "O usuário já está ativo."
                );
            }

            const reativadoEm = new Date();

            const alteracao = await transacao.cadastro.updateMany({
                where: {
                    id,
                    desativado_em: {
                        not: null
                    }
                },
                data: {
                    desativado_em: null,
                    desativado_por: null,
                    motivo_desativacao: null,
                    tipo_usuario: "user",
                    setor_id: null,
                    secretaria_id: null,
                    versao_token: {
                        increment: 1
                    }
                }
            });

            if (alteracao.count === 0) {
                throw new ConflictException(
                    "O usuário foi alterado por outra operação."
                );
            }

            await transacao.historico_administrativo.create({
                data: {
                    administrador_id: administradorId,
                    usuario_alvo_id: id,
                    acao: "usuario_reativado",
                    tipo_usuario_anterior: usuario.tipo_usuario,
                    setor_id_anterior: usuario.setor_id,
                    secretaria_id_anterior: usuario.secretaria_id,
                    criado_em: reativadoEm
                }
            });

            return transacao.cadastro.findUniqueOrThrow({
                where: {
                    id
                },
                select: {
                    id: true,
                    tipo_usuario: true,
                    setor_id: true,
                    secretaria_id: true,
                    desativado_em: true,
                    versao_token: true,
                    dois_fatores_email_ativo: true,
                    dois_fatores_email_confirmado_em: true
                }
            });
        });
    }

}
