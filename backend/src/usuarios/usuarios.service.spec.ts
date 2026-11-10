import { PrismaService } from '../prisma/prisma.service';
import { UsuariosService } from './usuarios.service';
import { EmailService } from '../email/email.service';
import { MensagensCriptografiaService } from '../criptografia/mensagens-criptografia.service';

describe('UsuariosService - desativação', () => {
  const transacaoMock = {
    $queryRaw: jest.fn(),
    cadastro: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      updateMany: jest.fn(),
    },
    login_evento: {
      updateMany: jest.fn(),
    },
    desafio_login_2fa: {
      updateMany: jest.fn(),
    },
    conversa_participante: {
      updateMany: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    mensagem: {
      createMany: jest.fn(),
    },
    conversa_setor: {
      updateMany: jest.fn(),
    },
    conversa_leitura: {
      deleteMany: jest.fn(),
    },
    historico_administrativo: {
      create: jest.fn(),
    },
  };

  const prismaMock = {
    $transaction: jest.fn(),
  };

  let service: UsuariosService;
  const criptografiaMock = {
    criptografar: jest.fn((conteudo: string) => conteudo),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (operacao) =>
      operacao(transacaoMock),
    );
    transacaoMock.$queryRaw.mockResolvedValue([{ id: 8 }]);
    transacaoMock.cadastro.findUnique
      .mockResolvedValueOnce({
        id: 1,
        tipo_usuario: 'superAdmin',
        desativado_em: null,
      })
      .mockResolvedValueOnce({
        id: 8,
        nome: 'Funcionário Teste',
        tipo_usuario: 'funcionario',
        setor_id: 3,
        secretaria_id: null,
        desativado_em: null,
      });
    transacaoMock.conversa_participante.findMany.mockResolvedValue([
      { conversa_id: 30 },
      { conversa_id: 31 },
    ]);
    transacaoMock.cadastro.updateMany.mockResolvedValue({ count: 1 });
    transacaoMock.cadastro.findUniqueOrThrow.mockResolvedValue({
      id: 8,
      tipo_usuario: 'user',
      setor_id: null,
      secretaria_id: null,
      desativado_em: new Date(),
    });

    service = new UsuariosService(
      prismaMock as unknown as PrismaService,
      undefined as unknown as EmailService,
      criptografiaMock as unknown as MensagensCriptografiaService,
    );
  });

  it('transforma em user, remove grupos e oculta as conversas antigas', async () => {
    await service.desativarUsuario(8, 1, 'Mudança de função');

    expect(transacaoMock.cadastro.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tipo_usuario: 'user',
          setor_id: null,
          secretaria_id: null,
          desativado_em: expect.any(Date),
        }),
      }),
    );
    expect(transacaoMock.conversa_participante.updateMany).toHaveBeenCalledWith(
      {
        where: {
          usuario_id: 8,
          conversa: { tipo: 'privada' },
        },
        data: {
          ocultada_em: expect.any(Date),
          visivel_desde_mensagem_id: null,
        },
      },
    );
    expect(transacaoMock.conversa_participante.deleteMany).toHaveBeenCalledWith(
      {
        where: {
          usuario_id: 8,
          conversa: { tipo: 'grupo' },
        },
      },
    );
    expect(transacaoMock.mensagem.createMany).toHaveBeenCalledWith({
      data: [
        {
          conversa_id: 30,
          remetente_id: 1,
          origem: 'usuario',
          conteudo:
            'Funcionário Teste foi removido do grupo porque seu perfil foi desativado.',
          enviada_em: expect.any(Date),
        },
        {
          conversa_id: 31,
          remetente_id: 1,
          origem: 'usuario',
          conteudo:
            'Funcionário Teste foi removido do grupo porque seu perfil foi desativado.',
          enviada_em: expect.any(Date),
        },
      ],
    });
    expect(transacaoMock.conversa_setor.updateMany).toHaveBeenCalledWith({
      where: {
        usuario_id: 8,
        ocultada_para_usuario_em: null,
      },
      data: {
        ocultada_para_usuario_em: expect.any(Date),
      },
    });
    expect(transacaoMock.conversa_leitura.deleteMany).toHaveBeenCalledWith({
      where: { usuario_id: 8 },
    });
  });
});
