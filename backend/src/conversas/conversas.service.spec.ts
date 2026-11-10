// Testa a paginação e a busca incremental de mensagens.
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { mkdir, writeFile } from "node:fs/promises";
import { PrismaService } from "../prisma/prisma.service";
import { ConversasService } from "./conversas.service";
import { NotificacoesService } from "../notificacoes/notificacoes.service";
import { MensagensCriptografiaService } from "../criptografia/mensagens-criptografia.service";

// Valida anexos sem criar arquivos reais durante os testes.
jest.mock("node:fs/promises", () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
}));

describe("ConversasService", () => {
  const mensagem = (id: number) => ({
    id,
    conversa_id: 10,
    remetente_id: 1,
    origem: "usuario",
    sistema: false,
    conteudo: `Mensagem ${id}`,
    enviada_em: new Date("2026-08-24T12:00:00.000Z"),
    arquivo_nome: null,
    arquivo_url: null,
    arquivo_tipo: null,
    arquivo_mime: null,
    arquivo_tamanho: null,
    remetente: {
      id: 1,
      nome: "Usuário",
      tipo_usuario: "user",
    },
  });

  const prismaMock = {
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
    cadastro: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    conversa: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    conversa_setor: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    conversa_participante: {
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    conversa_leitura: {
      deleteMany: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    mensagem: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      groupBy: jest.fn(),
      create: jest.fn(),
    },
    setores: {
      findUnique: jest.fn(),
    },
    conversa_transferencia: {
      create: jest.fn(),
    },
    avaliacao: {
      findMany: jest.fn(),
    },
  };

  let service: ConversasService;
  const notificacoesMock = {
    enviarNovaMensagem: jest.fn().mockResolvedValue(undefined),
  };
  const criptografiaMock = {
    criptografar: jest.fn((conteudo: string) => conteudo),
    descriptografar: jest.fn((conteudo: string) => conteudo),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (operacao) =>
      operacao(prismaMock),
    );
    prismaMock.$queryRaw.mockResolvedValue([{ id: 1 }]);
    prismaMock.conversa_participante.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.conversa_participante.delete.mockResolvedValue({});
    prismaMock.conversa_participante.count.mockResolvedValue(2);
    prismaMock.conversa_leitura.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.conversa_leitura.findMany.mockResolvedValue([]);
    prismaMock.cadastro.findUnique.mockResolvedValue({
      id: 1,
      nome: "Usuário",
      tipo_usuario: "user",
      setor_id: null,
    });
    prismaMock.conversa.findUnique.mockResolvedValue({
      id: 10,
      tipo: "privada",
      conversa_participante: [{ usuario_id: 1, ocultada_em: null }],
      atendimento_setor: null,
    });
    prismaMock.conversa_setor.findMany.mockResolvedValue([]);
    prismaMock.mensagem.groupBy.mockResolvedValue([]);
    service = new ConversasService(
      prismaMock as unknown as PrismaService,
      notificacoesMock as unknown as NotificacoesService,
      criptografiaMock as unknown as MensagensCriptografiaService,
    );
  });

  it("lista as avaliações dos últimos 30 dias com seus setores", async () => {
    const criadaEmFinancas = new Date("2026-09-03T15:00:00.000Z");
    const criadaEmTributos = new Date("2026-09-02T15:00:00.000Z");

    prismaMock.avaliacao.findMany.mockResolvedValue([
      {
        id: 11,
        nota: 5,
        descricao: "Atendimento excelente",
        criada_em: criadaEmFinancas,
        avaliador: { id: 20, nome: "Ana Souza" },
        finalizacao: {
          conversa: {
            atendimento_setor: {
              setor: {
                id: 2,
                setor: "Finanças",
                sigla_setor: "FIN",
                secretaria: { secretaria: "Secretaria da Fazenda" },
              },
            },
          },
        },
      },
      {
        id: 10,
        nota: 4,
        descricao: null,
        criada_em: criadaEmTributos,
        avaliador: { id: 21, nome: "Carlos Lima" },
        finalizacao: {
          conversa: {
            atendimento_setor: {
              setor: {
                id: 3,
                setor: "Tributos",
                sigla_setor: "TRI",
                secretaria: { secretaria: "Secretaria da Fazenda" },
              },
            },
          },
        },
      },
    ]);

    await expect(service.listarAvaliacoes()).resolves.toEqual([
      {
        id: 11,
        nota: 5,
        descricao: "Atendimento excelente",
        criadaEm: criadaEmFinancas,
        avaliador: { id: 20, nome: "Ana Souza" },
        setor: {
          id: 2,
          nome: "Finanças",
          sigla: "FIN",
          secretaria: "Secretaria da Fazenda",
        },
      },
      {
        id: 10,
        nota: 4,
        descricao: null,
        criadaEm: criadaEmTributos,
        avaliador: { id: 21, nome: "Carlos Lima" },
        setor: {
          id: 3,
          nome: "Tributos",
          sigla: "TRI",
          secretaria: "Secretaria da Fazenda",
        },
      },
    ]);
    expect(prismaMock.avaliacao.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          criada_em: {
            gte: expect.any(Date),
          },
        },
        orderBy: [
          { criada_em: "desc" },
          { id: "desc" },
        ],
      }),
    );
  });

  it("carrega as 50 mensagens mais recentes em ordem cronológica", async () => {
    prismaMock.mensagem.findMany.mockResolvedValue([
      mensagem(3),
      mensagem(2),
      mensagem(1),
    ]);

    const resultado = await service.listarMensagens(1, 10);

    expect(prismaMock.mensagem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { conversa_id: 10 },
        orderBy: { id: "desc" },
        take: 50,
      }),
    );
    expect(resultado.map((item) => item.id)).toEqual([1, 2, 3]);
  });

  it("informa a última mensagem visualizada pelo outro participante", async () => {
    prismaMock.conversa.findUnique.mockResolvedValue({
      id: 10,
      tipo: "privada",
      conversa_participante: [
        {
          usuario_id: 1,
          ocultada_em: null,
          visivel_desde_mensagem_id: null,
          cadastro: { tipo_usuario: "user" },
        },
        {
          usuario_id: 2,
          ocultada_em: null,
          visivel_desde_mensagem_id: null,
          cadastro: { tipo_usuario: "admin" },
        },
      ],
      atendimento_setor: null,
    });
    prismaMock.conversa_leitura.findMany.mockResolvedValue([
      {
        usuario_id: 2,
        ultima_mensagem_lida_id: 18,
      },
    ]);

    await expect(service.obterStatusLeitura(1, 10)).resolves.toEqual({
      conversaId: 10,
      ultimaMensagemVisualizadaId: 18,
    });
    expect(prismaMock.conversa_leitura.findMany).toHaveBeenCalledWith({
      where: {
        conversa_id: 10,
        usuario_id: { in: [2] },
        ultima_mensagem_lida_id: { not: null },
      },
      select: {
        usuario_id: true,
        ultima_mensagem_lida_id: true,
      },
    });
  });

  it("identifica o aviso de saída como mensagem do sistema", async () => {
    prismaMock.mensagem.findMany.mockResolvedValue([
      {
        ...mensagem(1),
        conteudo: "Funcionário Teste saiu do grupo.",
        sistema: true,
      },
    ]);

    const resultado = await service.listarMensagens(1, 10);

    expect(resultado[0]).toEqual(
      expect.objectContaining({
        conteudo: "Funcionário Teste saiu do grupo.",
        sistema: true,
      }),
    );
  });

  it("carrega somente mensagens posteriores ao último ID", async () => {
    prismaMock.mensagem.findMany.mockResolvedValue([
      mensagem(11),
      mensagem(12),
    ]);

    const resultado = await service.listarMensagens(1, 10, {
      depoisDe: 10,
      limite: 100,
    });

    expect(prismaMock.mensagem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          conversa_id: 10,
          id: { gt: 10 },
        },
        orderBy: { id: "asc" },
        take: 100,
      }),
    );
    expect(resultado.map((item) => item.id)).toEqual([11, 12]);
  });

  it("carrega mensagens anteriores e devolve em ordem cronológica", async () => {
    prismaMock.mensagem.findMany.mockResolvedValue([
      mensagem(9),
      mensagem(8),
    ]);

    const resultado = await service.listarMensagens(1, 10, {
      antesDe: 10,
      limite: 25,
    });

    expect(prismaMock.mensagem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          conversa_id: 10,
          id: { lt: 10 },
        },
        orderBy: { id: "desc" },
        take: 25,
      }),
    );
    expect(resultado.map((item) => item.id)).toEqual([8, 9]);
  });

  it("impede abrir uma conversa privada ocultada para o usuário", async () => {
    prismaMock.conversa.findUnique.mockResolvedValue({
      id: 10,
      tipo: "privada",
      conversa_participante: [
        {
          usuario_id: 1,
          ocultada_em: new Date("2026-09-02T12:00:00.000Z"),
          cadastro: { tipo_usuario: "user" },
        },
        {
          usuario_id: 2,
          ocultada_em: null,
          cadastro: { tipo_usuario: "admin" },
        },
      ],
      atendimento_setor: null,
    });

    await expect(service.listarMensagens(1, 10)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prismaMock.mensagem.findMany).not.toHaveBeenCalled();
  });

  it("mostra somente mensagens privadas posteriores à reabertura", async () => {
    prismaMock.conversa.findUnique.mockResolvedValue({
      id: 10,
      tipo: "privada",
      conversa_participante: [
        {
          usuario_id: 1,
          ocultada_em: null,
          visivel_desde_mensagem_id: 50,
          cadastro: { tipo_usuario: "user" },
        },
        {
          usuario_id: 2,
          ocultada_em: null,
          visivel_desde_mensagem_id: null,
          cadastro: { tipo_usuario: "admin" },
        },
      ],
      atendimento_setor: null,
    });
    prismaMock.mensagem.findMany.mockResolvedValue([]);

    await service.listarMensagens(1, 10);

    expect(prismaMock.mensagem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          conversa_id: 10,
          id: { gte: 50 },
        }),
      }),
    );
  });

  it("reabre a conversa para o usuário ao receber mensagem administrativa", async () => {
    prismaMock.cadastro.findUnique.mockResolvedValue({
      id: 2,
      nome: "Administrador",
      tipo_usuario: "admin",
      setor_id: null,
      secretaria_id: 7,
    });
    prismaMock.conversa.findUnique.mockResolvedValue({
      id: 10,
      tipo: "privada",
      conversa_participante: [
        {
          usuario_id: 2,
          ocultada_em: null,
          visivel_desde_mensagem_id: null,
          cadastro: { tipo_usuario: "admin" },
        },
        {
          usuario_id: 1,
          ocultada_em: new Date("2026-09-02T12:00:00.000Z"),
          visivel_desde_mensagem_id: null,
          cadastro: { tipo_usuario: "user" },
        },
      ],
      atendimento_setor: null,
    });
    prismaMock.mensagem.create.mockResolvedValue({
      id: 20,
      conversa_id: 10,
      remetente_id: 2,
      origem: "usuario",
      conteudo: "Nova mensagem",
      enviada_em: new Date("2026-09-02T13:00:00.000Z"),
      arquivo_nome: null,
      arquivo_url: null,
      arquivo_tipo: null,
      arquivo_mime: null,
      arquivo_tamanho: null,
      remetente: {
        id: 2,
        nome: "Administrador",
        tipo_usuario: "admin",
        foto_perfil_url: null,
      },
    });

    await service.enviarMensagem(2, 10, "Nova mensagem");

    expect(prismaMock.conversa_participante.updateMany).toHaveBeenCalledWith({
      where: {
        conversa_id: 10,
        ocultada_em: { not: null },
        cadastro: { tipo_usuario: "user" },
      },
      data: {
        ocultada_em: null,
        visivel_desde_mensagem_id: 20,
      },
    });
  });

  it("recusa filtros anterior e posterior ao mesmo tempo", async () => {
    await expect(
      service.listarMensagens(1, 10, {
        depoisDe: 10,
        antesDe: 20,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prismaMock.mensagem.findMany).not.toHaveBeenCalled();
  });

  it("lista para o admin somente atendimentos dos setores da sua secretaria", async () => {
    prismaMock.cadastro.findUnique.mockResolvedValue({
      id: 1,
      nome: "Administrador",
      tipo_usuario: "admin",
      setor_id: null,
      secretaria_id: 7,
    });

    await expect(service.listarAtendimentos(1)).resolves.toEqual([]);
    expect(prismaMock.conversa_setor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          setor: {
            secretaria_id: 7,
          },
        },
      }),
    );
  });

  it("não lista atendimentos antigos ocultados para o usuário comum", async () => {
    await expect(service.listarAtendimentos(1)).resolves.toEqual([]);

    expect(prismaMock.conversa_setor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          usuario_id: 1,
          ocultada_para_usuario_em: null,
        },
      }),
    );
  });

  it("impede abrir diretamente atendimento ocultado para o usuário", async () => {
    prismaMock.conversa.findUnique.mockResolvedValue({
      id: 10,
      tipo: "setor",
      conversa_participante: [],
      atendimento_setor: {
        setor_id: 2,
        usuario_id: 1,
        ocultada_para_usuario_em: new Date("2026-09-02T12:00:00.000Z"),
        setor: {
          id: 2,
          setor: "Atendimento",
          sigla_setor: "ATD",
          secretaria_id: 7,
        },
        usuario: {
          id: 1,
          nome: "Usuário",
        },
      },
    });

    await expect(service.listarMensagens(1, 10)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prismaMock.mensagem.findMany).not.toHaveBeenCalled();
  });

  it("retorna lista vazia para admin sem secretaria", async () => {
    prismaMock.cadastro.findUnique.mockResolvedValue({
      id: 1,
      nome: "Administrador",
      tipo_usuario: "admin",
      setor_id: null,
      secretaria_id: null,
    });

    await expect(service.listarAtendimentos(1)).resolves.toEqual([]);
    expect(prismaMock.conversa_setor.findMany).not.toHaveBeenCalled();
  });

  it("permite admin abrir atendimento de setor da sua secretaria", async () => {
    prismaMock.cadastro.findUnique.mockResolvedValue({
      id: 1,
      nome: "Administrador",
      tipo_usuario: "admin",
      setor_id: null,
      secretaria_id: 7,
    });
    prismaMock.conversa.findUnique.mockResolvedValue({
      id: 10,
      tipo: "setor",
      conversa_participante: [],
      atendimento_setor: {
        setor_id: 2,
        usuario_id: 3,
        setor: {
          id: 2,
          setor: "Atendimento",
          sigla_setor: "ATD",
          secretaria_id: 7,
        },
        usuario: {
          id: 3,
          nome: "Munícipe",
        },
      },
    });
    prismaMock.mensagem.findMany.mockResolvedValue([]);

    await expect(service.listarMensagens(1, 10)).resolves.toEqual([]);
  });

  it("impede admin sem secretaria de abrir atendimento diretamente", async () => {
    prismaMock.cadastro.findUnique.mockResolvedValue({
      id: 1,
      nome: "Administrador",
      tipo_usuario: "admin",
      setor_id: null,
      secretaria_id: null,
    });
    prismaMock.conversa.findUnique.mockResolvedValue({
      id: 10,
      tipo: "setor",
      conversa_participante: [],
      atendimento_setor: {
        setor_id: 2,
        usuario_id: 3,
        setor: {
          id: 2,
          setor: "Atendimento",
          sigla_setor: "ATD",
          secretaria_id: 7,
        },
        usuario: {
          id: 3,
          nome: "Munícipe",
        },
      },
    });

    await expect(service.listarMensagens(1, 10)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prismaMock.mensagem.findMany).not.toHaveBeenCalled();
  });

  it("impede admin de abrir atendimento de setor de outra secretaria", async () => {
    prismaMock.cadastro.findUnique.mockResolvedValue({
      id: 1,
      nome: "Administrador",
      tipo_usuario: "admin",
      setor_id: null,
      secretaria_id: 7,
    });
    prismaMock.conversa.findUnique.mockResolvedValue({
      id: 10,
      tipo: "setor",
      conversa_participante: [],
      atendimento_setor: {
        setor_id: 2,
        usuario_id: 3,
        setor: {
          id: 2,
          setor: "Atendimento",
          sigla_setor: "ATD",
          secretaria_id: 8,
        },
        usuario: {
          id: 3,
          nome: "Munícipe",
        },
      },
    });

    await expect(service.listarMensagens(1, 10)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prismaMock.mensagem.findMany).not.toHaveBeenCalled();
  });

  it("permite admin enviar mensagem em atendimento de setor da sua secretaria", async () => {
    prismaMock.cadastro.findUnique.mockResolvedValue({
      id: 1,
      nome: "Administrador",
      tipo_usuario: "admin",
      setor_id: null,
      secretaria_id: 7,
    });
    prismaMock.conversa.findUnique.mockResolvedValue({
      id: 10,
      tipo: "setor",
      conversa_participante: [],
      atendimento_setor: {
        setor_id: 2,
        usuario_id: 3,
        setor: {
          id: 2,
          setor: "Atendimento",
          sigla_setor: "ATD",
          secretaria_id: 7,
        },
        usuario: {
          id: 3,
          nome: "Munícipe",
        },
      },
    });
    prismaMock.mensagem.create.mockResolvedValue({
      id: 20,
      conversa_id: 10,
      remetente_id: 1,
      origem: "usuario",
      conteudo: "Resposta do administrador",
      enviada_em: new Date("2026-08-28T12:00:00.000Z"),
      arquivo_nome: null,
      arquivo_url: null,
      arquivo_tipo: null,
      arquivo_mime: null,
      arquivo_tamanho: null,
      remetente: {
        id: 1,
        nome: "Administrador",
        tipo_usuario: "admin",
      },
    });

    await expect(
      service.enviarMensagem(1, 10, "Resposta do administrador"),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 20,
        conversaId: 10,
        origem: "usuario",
        remetente: expect.objectContaining({
          tipo: "admin",
          id: 1,
        }),
      }),
    );
    expect(prismaMock.mensagem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          conversa_id: 10,
          remetente_id: 1,
          origem: "usuario",
          conteudo: "Resposta do administrador",
        }),
      }),
    );
  });

  it("permite admin sinalizar digitação em atendimento da sua secretaria", async () => {
    prismaMock.cadastro.findUnique.mockResolvedValue({
      id: 1,
      nome: "Administrador",
      tipo_usuario: "admin",
      setor_id: null,
      secretaria_id: 7,
    });
    prismaMock.conversa.findUnique.mockResolvedValue({
      id: 10,
      tipo: "setor",
      conversa_participante: [],
      atendimento_setor: {
        setor_id: 2,
        usuario_id: 3,
        setor: {
          id: 2,
          setor: "Atendimento",
          sigla_setor: "ATD",
          secretaria_id: 7,
        },
        usuario: {
          id: 3,
          nome: "Munícipe",
        },
      },
    });

    await expect(service.atualizarDigitacao(1, 10, true)).resolves.toEqual({
      conversaId: 10,
      digitando: true,
    });
  });

  it("permite superAdmin fiscalizar conversa privada entre perfis inferiores", async () => {
    prismaMock.cadastro.findUnique.mockResolvedValue({
      id: 9,
      nome: "Super administrador",
      tipo_usuario: "superAdmin",
      setor_id: null,
    });
    prismaMock.conversa.findUnique.mockResolvedValue({
      id: 10,
      tipo: "privada",
      conversa_participante: [
        { usuario_id: 2, cadastro: { tipo_usuario: "admin" } },
        { usuario_id: 3, cadastro: { tipo_usuario: "user" } },
      ],
      atendimento_setor: null,
    });
    prismaMock.mensagem.findMany.mockResolvedValue([]);

    await expect(service.listarMensagens(9, 10)).resolves.toEqual([]);
  });

  it("impede superAdmin de visualizar conversa privada de outro superAdmin", async () => {
    prismaMock.cadastro.findUnique.mockResolvedValue({
      id: 9,
      nome: "Super administrador",
      tipo_usuario: "superAdmin",
      setor_id: null,
    });
    prismaMock.conversa.findUnique.mockResolvedValue({
      id: 10,
      tipo: "privada",
      conversa_participante: [
        { usuario_id: 7, cadastro: { tipo_usuario: "superAdmin" } },
        { usuario_id: 3, cadastro: { tipo_usuario: "user" } },
      ],
      atendimento_setor: null,
    });

    await expect(service.listarMensagens(9, 10)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prismaMock.mensagem.findMany).not.toHaveBeenCalled();
  });

  it("lista conversas próprias e conversas inferiores para o superAdmin", async () => {
    prismaMock.cadastro.findUnique.mockResolvedValue({
      id: 9,
      nome: "Super administrador",
      tipo_usuario: "superAdmin",
      setor_id: null,
    });
    prismaMock.conversa.findMany.mockResolvedValue([]);

    await service.listar(9);

    expect(prismaMock.conversa.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            {
              conversa_participante: {
                some: { usuario_id: 9, ocultada_em: null },
              },
            },
            {
              conversa_participante: {
                none: {
                  cadastro: { tipo_usuario: "superAdmin" },
                },
              },
            },
          ],
        }),
      }),
    );
  });

  it("permite conversa privada entre dois superAdmins quando o solicitante participa", async () => {
    prismaMock.cadastro.findUnique.mockResolvedValue({
      id: 9,
      nome: "Super administrador",
      tipo_usuario: "superAdmin",
      setor_id: null,
    });
    prismaMock.conversa.findUnique.mockResolvedValue({
      id: 10,
      tipo: "privada",
      conversa_participante: [
        {
          usuario_id: 9,
          ocultada_em: null,
          cadastro: { tipo_usuario: "superAdmin" },
        },
        {
          usuario_id: 7,
          ocultada_em: null,
          cadastro: { tipo_usuario: "superAdmin" },
        },
      ],
      atendimento_setor: null,
    });
    prismaMock.mensagem.findMany.mockResolvedValue([]);

    await expect(service.listarMensagens(9, 10)).resolves.toEqual([]);
  });

  it("mantém a fiscalização de conversas privadas somente para leitura", async () => {
    prismaMock.cadastro.findUnique.mockResolvedValue({
      id: 9,
      nome: "Super administrador",
      tipo_usuario: "superAdmin",
      setor_id: null,
    });
    prismaMock.conversa.findUnique.mockResolvedValue({
      id: 10,
      tipo: "privada",
      conversa_participante: [
        { usuario_id: 2, cadastro: { tipo_usuario: "admin" } },
        { usuario_id: 3, cadastro: { tipo_usuario: "user" } },
      ],
      atendimento_setor: null,
    });

    await expect(
      service.enviarMensagem(9, 10, "Mensagem indevida"),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("cria grupo com o nome escolhido e inclui o criador", async () => {
    prismaMock.cadastro.findUnique.mockResolvedValue({
      id: 1,
      tipo_usuario: "admin",
      desativado_em: null,
    });
    prismaMock.cadastro.findMany.mockResolvedValue([
      { id: 2 },
      { id: 3 },
    ]);
    prismaMock.conversa.create.mockResolvedValue({
      id: 30,
      tipo: "grupo",
      nome: "Equipe de atendimento",
      criada_em: new Date("2026-09-01T12:00:00.000Z"),
      conversa_participante: [
        { usuario_id: 1, cadastro: { id: 1, nome: "Admin" } },
        { usuario_id: 2, cadastro: { id: 2, nome: "Contato A" } },
        { usuario_id: 3, cadastro: { id: 3, nome: "Contato B" } },
      ],
    });

    await expect(
      service.criarGrupo(1, "  Equipe de atendimento  ", [2, 3]),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 30,
        tipo: "grupo",
        nome: "Equipe de atendimento",
        totalParticipantes: 3,
      }),
    );

    expect(prismaMock.conversa.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tipo: "grupo",
          nome: "Equipe de atendimento",
          conversa_participante: {
            create: [
              { cadastro: { connect: { id: 1 } } },
              { cadastro: { connect: { id: 2 } } },
              { cadastro: { connect: { id: 3 } } },
            ],
          },
        }),
      }),
    );
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(3);
  });

  it("adiciona pelo menos um novo participante ao grupo", async () => {
    prismaMock.cadastro.findUnique.mockResolvedValue({
      id: 1,
      tipo_usuario: "admin",
      desativado_em: null,
    });
    prismaMock.cadastro.findMany.mockResolvedValue([{ id: 2 }]);
    prismaMock.conversa.findUnique.mockResolvedValue({
      id: 30,
      tipo: "grupo",
      conversa_participante: [{ usuario_id: 1 }],
    });
    prismaMock.conversa.update.mockResolvedValue({
      id: 30,
      conversa_participante: [
        { cadastro: { id: 1, nome: "Admin" } },
        { cadastro: { id: 2, nome: "Contato" } },
      ],
    });

    await expect(
      service.adicionarParticipantesGrupo(1, 30, [2]),
    ).resolves.toEqual({
      grupoId: 30,
      participantes: [
        { id: 1, nome: "Admin" },
        { id: 2, nome: "Contato" },
      ],
      totalParticipantes: 2,
    });

    expect(prismaMock.conversa.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 30 },
        data: {
          conversa_participante: {
            create: [
              { cadastro: { connect: { id: 2 } } },
            ],
          },
        },
      }),
    );
  });

  it("impede que quem não participa adicione pessoas ao grupo", async () => {
    prismaMock.cadastro.findUnique.mockResolvedValue({
      id: 1,
      tipo_usuario: "admin",
      desativado_em: null,
    });
    prismaMock.cadastro.findMany.mockResolvedValue([{ id: 2 }]);
    prismaMock.conversa.findUnique.mockResolvedValue({
      id: 30,
      tipo: "grupo",
      conversa_participante: [{ usuario_id: 3 }],
    });

    await expect(
      service.adicionarParticipantesGrupo(1, 30, [2]),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prismaMock.conversa.update).not.toHaveBeenCalled();
  });

  it("impede adicionar usuário comum ao grupo", async () => {
    prismaMock.cadastro.findUnique.mockResolvedValue({
      id: 1,
      tipo_usuario: "admin",
      desativado_em: null,
    });
    prismaMock.cadastro.findMany.mockResolvedValue([
      { id: 2 },
    ]);

    await expect(
      service.criarGrupo(1, "Grupo interno", [2, 3]),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prismaMock.conversa.create).not.toHaveBeenCalled();
  });

  it("impede criar o grupo se o criador for desativado durante a operação", async () => {
    prismaMock.cadastro.findUnique.mockResolvedValue({
      id: 1,
      tipo_usuario: "user",
      desativado_em: new Date("2026-09-02T12:00:00.000Z"),
    });

    await expect(
      service.criarGrupo(1, "Grupo interno", [2, 3]),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(3);
    expect(prismaMock.cadastro.findMany).not.toHaveBeenCalled();
    expect(prismaMock.conversa.create).not.toHaveBeenCalled();
  });

  it("lista para funcionário somente os grupos dos quais participa", async () => {
    prismaMock.cadastro.findUnique.mockResolvedValue({
      id: 1,
      tipo_usuario: "funcionario",
    });
    prismaMock.conversa.findMany.mockResolvedValue([]);

    await expect(service.listarGrupos(1)).resolves.toEqual([]);
    expect(prismaMock.conversa.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tipo: "grupo",
          conversa_participante: {
            some: { usuario_id: 1 },
          },
        },
      }),
    );
  });

  it("remove o participante e sua leitura ao sair do grupo", async () => {
    prismaMock.cadastro.findUnique.mockResolvedValue({
      id: 1,
      nome: "Funcionário Teste",
      tipo_usuario: "funcionario",
      desativado_em: null,
    });
    prismaMock.conversa.findUnique.mockResolvedValue({
      id: 30,
      tipo: "grupo",
      conversa_participante: [{ usuario_id: 1 }],
    });

    await expect(service.sairDoGrupo(1, 30)).resolves.toEqual({
      grupoId: 30,
      totalParticipantes: 2,
      somenteLeitura: false,
    });
    expect(prismaMock.conversa_leitura.deleteMany).toHaveBeenCalledWith({
      where: { conversa_id: 30, usuario_id: 1 },
    });
    expect(prismaMock.mensagem.create).toHaveBeenCalledWith({
      data: {
        conversa_id: 30,
        remetente_id: 1,
        origem: "usuario",
        sistema: true,
        conteudo: "Funcionário Teste saiu do grupo.",
      },
    });
    expect(prismaMock.conversa_participante.delete).toHaveBeenCalledWith({
      where: {
        conversa_id_usuario_id: {
          conversa_id: 30,
          usuario_id: 1,
        },
      },
    });
    expect(prismaMock.conversa_participante.count).toHaveBeenCalledWith({
      where: { conversa_id: 30 },
    });
  });

  it("mantém o grupo somente para leitura quando o superAdmin sai", async () => {
    prismaMock.cadastro.findUnique.mockResolvedValue({
      id: 9,
      nome: "Super administrador",
      tipo_usuario: "superAdmin",
      desativado_em: null,
    });
    prismaMock.conversa.findUnique.mockResolvedValue({
      id: 30,
      tipo: "grupo",
      conversa_participante: [{ usuario_id: 9 }],
    });

    await expect(service.sairDoGrupo(9, 30)).resolves.toEqual({
      grupoId: 30,
      totalParticipantes: 2,
      somenteLeitura: true,
    });
  });

  it("impede sair de um grupo do qual não participa", async () => {
    prismaMock.cadastro.findUnique.mockResolvedValue({
      id: 1,
      tipo_usuario: "admin",
      desativado_em: null,
    });
    prismaMock.conversa.findUnique.mockResolvedValue({
      id: 30,
      tipo: "grupo",
      conversa_participante: [],
    });

    await expect(service.sairDoGrupo(1, 30)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prismaMock.conversa_participante.delete).not.toHaveBeenCalled();
  });

  it("permite que superAdmin visualize grupo sem participar", async () => {
    prismaMock.cadastro.findUnique.mockResolvedValue({
      id: 9,
      nome: "Super administrador",
      tipo_usuario: "superAdmin",
      setor_id: null,
      secretaria_id: null,
    });
    prismaMock.conversa.findUnique.mockResolvedValue({
      id: 30,
      tipo: "grupo",
      conversa_participante: [
        { usuario_id: 2, cadastro: { tipo_usuario: "admin" } },
        { usuario_id: 3, cadastro: { tipo_usuario: "funcionario" } },
      ],
      atendimento_setor: null,
    });
    prismaMock.mensagem.findMany.mockResolvedValue([]);

    await expect(service.listarMensagens(9, 30)).resolves.toEqual([]);
  });

  it("mantém superAdmin não participante em somente leitura", async () => {
    prismaMock.cadastro.findUnique.mockResolvedValue({
      id: 9,
      nome: "Super administrador",
      tipo_usuario: "superAdmin",
      setor_id: null,
      secretaria_id: null,
    });
    prismaMock.conversa.findUnique.mockResolvedValue({
      id: 30,
      tipo: "grupo",
      conversa_participante: [
        { usuario_id: 2, cadastro: { tipo_usuario: "admin" } },
        { usuario_id: 3, cadastro: { tipo_usuario: "funcionario" } },
      ],
      atendimento_setor: null,
    });

    await expect(
      service.enviarMensagem(9, 30, "Mensagem indevida"),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prismaMock.mensagem.create).not.toHaveBeenCalled();
  });

  describe("comunidades no chat do Home", () => {
    beforeEach(() => {
      prismaMock.conversa.findUnique.mockResolvedValue({
        id: 10, tipo: 'comunidade', comunidade: { id: 4, ocultar_municipes: false },
        conversa_participante: [{ usuario_id: 1, ocultada_em: null }],
        atendimento_setor: null,
      });
      prismaMock.mensagem.findMany.mockResolvedValue([mensagem(1)]);
      prismaMock.mensagem.create.mockImplementation(async ({ data }) => ({ ...mensagem(2), ...data }));
    });

    it("permite ao participante ler e enviar texto com emoji na comunidade pública", async () => {
      await expect(service.listarMensagens(1, 10)).resolves.toHaveLength(1);
      await expect(service.enviarMensagem(1, 10, 'Olá 👋')).resolves.toMatchObject({
        conversaId: 10, conteudo: 'Olá 👋', origem: 'usuario',
      });
      expect(criptografiaMock.criptografar).toHaveBeenCalledWith('Olá 👋', 10);
    });

    it.each([
      ['image/png', 'foto.png', 'imagem'],
      ['video/mp4', 'video.mp4', 'video'],
      ['audio/webm', 'gravacao.webm', 'audio'],
      ['application/pdf', 'arquivo.pdf', 'documento'],
    ])("envia %s pela rota comum de mensagens", async (mime, nome, tipo) => {
      const buffer = Buffer.from('anexo de teste');
      await expect(service.enviarMensagem(1, 10, undefined, undefined, {
        mimetype: mime, originalname: nome, buffer, size: buffer.length,
      })).resolves.toMatchObject({
        conversaId: 10, arquivo: { nome, mime, tipo, tamanho: buffer.length },
      });
      expect(prismaMock.mensagem.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ conversa_id: 10, arquivo_nome: nome, arquivo_mime: mime, arquivo_tipo: tipo }),
      }));
      expect(mkdir).toHaveBeenCalled();
      expect(writeFile).toHaveBeenCalledWith(expect.any(String), buffer);
    });

    it("mantém as respostas vinculadas à conversa da comunidade", async () => {
      prismaMock.mensagem.findFirst.mockResolvedValue({ id: 1 });
      await service.enviarMensagem(1, 10, 'Respondendo', 1);
      expect(prismaMock.mensagem.findFirst).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ id: { equals: 1 }, conversa_id: 10 }),
      }));
      expect(prismaMock.mensagem.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ mensagem_respondida_id: 1 }),
      }));
    });

    it("permite consultar leitura e informar digitação", async () => {
      await expect(service.obterStatusLeitura(1, 10)).resolves.toMatchObject({ conversaId: 10 });
      await expect(service.atualizarDigitacao(1, 10, true)).resolves.toEqual({ conversaId: 10, digitando: true });
    });

    it.each([
      { participantes: [] },
      { participantes: [{ usuario_id: 1, ocultada_em: new Date() }] },
    ])("recusa acesso sem participação ativa (%j)", async ({ participantes }) => {
      prismaMock.conversa.findUnique.mockResolvedValue({
        id: 10, tipo: 'comunidade', comunidade: { id: 4, ocultar_municipes: false },
        conversa_participante: participantes,
      });
      await expect(service.listarMensagens(1, 10)).rejects.toThrow(ForbiddenException);
      await expect(service.enviarMensagem(1, 10, 'Não permitido')).rejects.toThrow(ForbiddenException);
      await expect(service.atualizarDigitacao(1, 10, true)).rejects.toThrow(ForbiddenException);
      expect(prismaMock.mensagem.findMany).not.toHaveBeenCalled();
      expect(prismaMock.mensagem.create).not.toHaveBeenCalled();
      expect(writeFile).not.toHaveBeenCalled();
    });

    it("bloqueia o acesso direto do munícipe à comunidade oculta", async () => {
      prismaMock.conversa.findUnique.mockResolvedValue({
        id: 10, tipo: 'comunidade', comunidade: { id: 4, ocultar_municipes: true },
        conversa_participante: [{ usuario_id: 1, ocultada_em: null }],
      });
      await expect(service.listarMensagens(1, 10)).rejects.toThrow(NotFoundException);
      await expect(service.enviarMensagem(1, 10, 'Não permitido')).rejects.toThrow(NotFoundException);
      expect(prismaMock.mensagem.create).not.toHaveBeenCalled();
    });
  });

  it("permite que participante envie mensagem no grupo como usuário", async () => {
    prismaMock.cadastro.findUnique.mockResolvedValue({
      id: 3,
      nome: "Funcionário participante",
      tipo_usuario: "funcionario",
      setor_id: 2,
      secretaria_id: null,
    });
    prismaMock.conversa.findUnique.mockResolvedValue({
      id: 30,
      tipo: "grupo",
      conversa_participante: [
        { usuario_id: 2, cadastro: { tipo_usuario: "admin" } },
        { usuario_id: 3, cadastro: { tipo_usuario: "funcionario" } },
      ],
      atendimento_setor: null,
    });
    prismaMock.mensagem.create.mockResolvedValue({
      id: 31,
      conversa_id: 30,
      remetente_id: 3,
      origem: "usuario",
      conteudo: "Olá, grupo",
      enviada_em: new Date("2026-09-01T13:00:00.000Z"),
      remetente: {
        id: 3,
        nome: "Funcionário participante",
        tipo_usuario: "funcionario",
      },
    });

    await expect(
      service.enviarMensagem(3, 30, "Olá, grupo"),
    ).resolves.toEqual(
      expect.objectContaining({
        conversaId: 30,
        origem: "usuario",
      }),
    );
    expect(prismaMock.mensagem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          conversa_id: 30,
          remetente_id: 3,
          origem: "usuario",
        }),
      }),
    );
  });

  it("impede contato fora do grupo de visualizar mensagens", async () => {
    prismaMock.cadastro.findUnique.mockResolvedValue({
      id: 8,
      nome: "Funcionário externo",
      tipo_usuario: "funcionario",
      setor_id: 2,
      secretaria_id: null,
    });
    prismaMock.conversa.findUnique.mockResolvedValue({
      id: 30,
      tipo: "grupo",
      conversa_participante: [
        { usuario_id: 2, cadastro: { tipo_usuario: "admin" } },
        { usuario_id: 3, cadastro: { tipo_usuario: "funcionario" } },
      ],
      atendimento_setor: null,
    });

    await expect(service.listarMensagens(8, 30)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prismaMock.mensagem.findMany).not.toHaveBeenCalled();
  });

  it("impede usuário comum de visualizar grupo mesmo se constar como participante", async () => {
    prismaMock.cadastro.findUnique.mockResolvedValue({
      id: 7,
      nome: "Usuário comum",
      tipo_usuario: "user",
      setor_id: null,
      secretaria_id: null,
    });
    prismaMock.conversa.findUnique.mockResolvedValue({
      id: 30,
      tipo: "grupo",
      conversa_participante: [
        { usuario_id: 7, cadastro: { tipo_usuario: "user" } },
        { usuario_id: 2, cadastro: { tipo_usuario: "admin" } },
      ],
      atendimento_setor: null,
    });

    await expect(service.listarMensagens(7, 30)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("permite que superAdmin sinalize digitação em atendimento de setor", async () => {
    prismaMock.cadastro.findUnique.mockResolvedValue({
      id: 9,
      nome: "Super administrador",
      tipo_usuario: "superAdmin",
      setor_id: null,
    });
    prismaMock.conversa.findUnique.mockResolvedValue({
      id: 10,
      tipo: "setor",
      conversa_participante: [],
      atendimento_setor: {
        setor_id: 2,
        usuario_id: 3,
        setor: {
          id: 2,
          setor: "Atendimento",
          sigla_setor: "ATD",
        },
        usuario: {
          id: 3,
          nome: "Munícipe",
        },
      },
    });

    await expect(service.atualizarDigitacao(9, 10, true)).resolves.toEqual({
      conversaId: 10,
      digitando: true,
    });
  });

  it("encaminha para a conversa já existente do setor sem alterar a origem", async () => {
    const transferidaEm = new Date("2026-09-17T12:00:00.000Z");

    prismaMock.cadastro.findUnique.mockResolvedValue({
      id: 1,
      nome: "Funcionário de origem",
      tipo_usuario: "funcionario",
      setor_id: 2,
      secretaria_id: null,
    });
    prismaMock.conversa.findUnique.mockResolvedValue({
      id: 10,
      tipo: "setor",
      conversa_participante: [],
      atendimento_setor: {
        conversa_id: 10,
        setor_id: 2,
        usuario_id: 7,
        ocultada_para_usuario_em: null,
        usuario_visivel_desde_mensagem_id: null,
        setor: {
          id: 2,
          setor: "Protocolo",
          sigla_setor: "PRO",
          secretaria_id: 4,
        },
        usuario: { id: 7, nome: "Cidadão" },
      },
    });
    prismaMock.conversa_setor.findUnique.mockResolvedValue({
      conversa_id: 10,
      setor_id: 2,
      usuario_id: 7,
      setor: {
        id: 2,
        setor: "Protocolo",
        sigla_setor: "PRO",
        secretaria_id: 4,
      },
      conversa: { tipo: "setor" },
    });
    prismaMock.setores.findUnique.mockResolvedValue({
      id: 3,
      setor: "Tributos",
      sigla_setor: "TRI",
      secretaria_id: 5,
      cadastros: [{ id: 8 }],
    });
    prismaMock.conversa_transferencia.create.mockResolvedValue({
      id: 20,
      transferida_em: transferidaEm,
    });
    prismaMock.conversa_setor.findFirst.mockResolvedValue({
      conversa_id: 40,
    });
    prismaMock.mensagem.create
      .mockResolvedValueOnce({ id: 30 })
      .mockResolvedValueOnce({ id: 31 });
    prismaMock.conversa_setor.update.mockResolvedValue({});

    await expect(
      service.transferirConversa(1, 10, {
        setorDestinoId: 3,
        motivo: "Necessita de análise tributária.",
      }),
    ).resolves.toEqual({
      conversaId: 10,
      conversaDestinoId: 40,
      conversaDestinoReutilizada: true,
      transferenciaId: 20,
      transferidaEm,
      setorOrigem: { id: 2, nome: "Protocolo", sigla: "PRO" },
      setorDestino: { id: 3, nome: "Tributos", sigla: "TRI" },
    });

    expect(prismaMock.mensagem.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          conversa_id: 40,
          visibilidade: "equipe",
          transferencia_id: 20,
          setor_id: 3,
          sistema: true,
        }),
      }),
    );
    expect(prismaMock.mensagem.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          conversa_id: 40,
          visibilidade: "cidadao",
          transferencia_id: 20,
          setor_id: 3,
          sistema: true,
        }),
      }),
    );
    expect(prismaMock.conversa_setor.create).not.toHaveBeenCalled();
    expect(prismaMock.conversa_setor.update).not.toHaveBeenCalled();
  });

  it("cria a conversa do setor de destino somente quando ainda não existe", async () => {
    prismaMock.cadastro.findUnique.mockResolvedValue({
      id: 1,
      nome: "Funcionário de origem",
      tipo_usuario: "funcionario",
      setor_id: 2,
      secretaria_id: null,
    });
    prismaMock.conversa.findUnique.mockResolvedValue({
      id: 10,
      tipo: "setor",
      conversa_participante: [],
      atendimento_setor: {
        conversa_id: 10,
        setor_id: 2,
        usuario_id: 7,
        ocultada_para_usuario_em: null,
        setor: {
          id: 2,
          setor: "Protocolo",
          sigla_setor: "PRO",
          secretaria_id: 4,
        },
        usuario: { id: 7, nome: "Cidadão" },
      },
    });
    prismaMock.conversa_setor.findUnique.mockResolvedValue({
      conversa_id: 10,
      setor_id: 2,
      usuario_id: 7,
      setor: {
        id: 2,
        setor: "Protocolo",
        sigla_setor: "PRO",
        secretaria_id: 4,
      },
      conversa: { tipo: "setor" },
    });
    prismaMock.setores.findUnique.mockResolvedValue({
      id: 3,
      setor: "Tributos",
      sigla_setor: "TRI",
      secretaria_id: 5,
      cadastros: [{ id: 8 }],
    });
    prismaMock.conversa_setor.findFirst.mockResolvedValue(null);
    prismaMock.conversa_setor.create.mockResolvedValue({
      conversa_id: 41,
    });
    prismaMock.conversa_transferencia.create.mockResolvedValue({
      id: 21,
      transferida_em: new Date("2026-09-17T13:00:00.000Z"),
    });
    prismaMock.mensagem.create
      .mockResolvedValueOnce({ id: 32 })
      .mockResolvedValueOnce({ id: 33 });

    await expect(
      service.transferirConversa(1, 10, {
        setorDestinoId: 3,
        motivo: "Necessita de análise tributária.",
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        conversaId: 10,
        conversaDestinoId: 41,
        conversaDestinoReutilizada: false,
      }),
    );
    expect(prismaMock.conversa_setor.findFirst).toHaveBeenCalledTimes(2);
    expect(prismaMock.conversa_setor.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          conversa: { create: { tipo: "setor" } },
          setor: { connect: { id: 3 } },
          usuario: { connect: { id: 7 } },
        },
      }),
    );
  });

  it("marca como lida somente a última mensagem visível para o cidadão", async () => {
    const lidaEm = new Date("2026-09-17T12:30:00.000Z");

    prismaMock.cadastro.findUnique.mockResolvedValue({
      id: 7,
      nome: "Cidadão",
      tipo_usuario: "user",
      setor_id: null,
      secretaria_id: null,
    });
    prismaMock.conversa.findUnique.mockResolvedValue({
      id: 10,
      tipo: "setor",
      conversa_participante: [],
      atendimento_setor: {
        setor_id: 3,
        usuario_id: 7,
        ocultada_para_usuario_em: null,
        usuario_visivel_desde_mensagem_id: 31,
        setor: {
          id: 3,
          setor: "Tributos",
          sigla_setor: "TRI",
          secretaria_id: 5,
        },
        usuario: { id: 7, nome: "Cidadão" },
      },
    });
    prismaMock.mensagem.findFirst.mockResolvedValue({ id: 35 });
    prismaMock.conversa_leitura.upsert.mockResolvedValue({
      conversa_id: 10,
      ultima_mensagem_lida_id: 35,
      lida_em: lidaEm,
    });

    await expect(service.marcarComoLida(7, 10)).resolves.toEqual({
      conversaId: 10,
      ultimaMensagemLidaId: 35,
      lidaEm,
      mensagensNaoLidas: 0,
    });
    expect(prismaMock.mensagem.findFirst).toHaveBeenCalledWith({
      where: {
        conversa_id: 10,
        visibilidade: { in: ["todos", "cidadao"] },
      },
      orderBy: { id: "desc" },
      select: { id: true },
    });
  });

  it("mantém todo o histórico da conversa de setor visível para o cidadão", async () => {
    prismaMock.cadastro.findUnique.mockResolvedValue({
      id: 7,
      nome: "Cidadão",
      tipo_usuario: "user",
      setor_id: null,
      secretaria_id: null,
    });
    prismaMock.conversa.findUnique.mockResolvedValue({
      id: 10,
      tipo: "setor",
      conversa_participante: [],
      atendimento_setor: {
        setor_id: 3,
        usuario_id: 7,
        ocultada_para_usuario_em: null,
        usuario_visivel_desde_mensagem_id: 31,
        setor: {
          id: 3,
          setor: "Tributos",
          sigla_setor: "TRI",
          secretaria_id: 5,
        },
        usuario: { id: 7, nome: "Cidadão" },
      },
    });
    prismaMock.mensagem.findMany.mockResolvedValue([]);

    await expect(service.listarMensagens(7, 10)).resolves.toEqual([]);

    const consulta =
      prismaMock.mensagem.findMany.mock.calls.at(-1)?.[0];
    expect(consulta.where).toEqual({
      conversa_id: 10,
      visibilidade: { in: ["todos", "cidadao"] },
    });
  });
});
