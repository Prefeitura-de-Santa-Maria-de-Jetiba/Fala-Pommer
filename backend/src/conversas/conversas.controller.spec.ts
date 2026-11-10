// Testa o encaminhamento dos filtros de mensagens pelo controlador.
import { type RequisicaoAutenticada } from "../auth/auth.guard";
import { ConversasController } from "./conversas.controller";
import { ConversasService } from "./conversas.service";

describe("ConversasController", () => {
  const conversasServiceMock = {
    listarMensagens: jest.fn(),
    obterStatusLeitura: jest.fn(),
    sairDoGrupo: jest.fn(),
  };

  const controller = new ConversasController(
    conversasServiceMock as unknown as ConversasService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("encaminha usuário, conversa e paginação ao serviço", () => {
    const requisicao = {
      usuario: {
        sub: 7,
      },
    } as RequisicaoAutenticada;
    const consulta = {
      depoisDe: 100,
      limite: 50,
    };

    controller.listarMensagens(requisicao, 15, consulta);

    expect(conversasServiceMock.listarMensagens).toHaveBeenCalledWith(
      7,
      15,
      consulta,
    );
  });

  it("encaminha o usuário e o grupo ao sair", () => {
    const requisicao = {
      usuario: {
        sub: 7,
      },
    } as RequisicaoAutenticada;

    controller.sairDoGrupo(requisicao, 30);

    expect(conversasServiceMock.sairDoGrupo).toHaveBeenCalledWith(7, 30);
  });

  it("encaminha a consulta do status de leitura", () => {
    const requisicao = {
      usuario: {
        sub: 7,
      },
    } as RequisicaoAutenticada;

    controller.obterStatusLeitura(requisicao, 15);

    expect(conversasServiceMock.obterStatusLeitura).toHaveBeenCalledWith(
      7,
      15,
    );
  });
});
