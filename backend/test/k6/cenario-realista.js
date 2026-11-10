import http from "k6/http";
import { check, group, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const TOKEN = __ENV.K6_TOKEN || "";
const INCLUIR_ESCRITAS = __ENV.INCLUIR_ESCRITAS === "true";

export const options = {
  stages: [
    { duration: "30s", target: 25 },
    { duration: "30s", target: 50 },
    { duration: "1m", target: 100 },
    { duration: "30s", target: 200 },
    { duration: "30s", target: 220 },
    { duration: "1m", target: 220 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    checks: ["rate>0.99"],
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<750", "p(99)<1500"],
    "http_req_duration{name:listar_conversas_privadas}": ["p(95)<1000"],
    "http_req_duration{name:listar_conversas_setor}": ["p(95)<1000"],
    "http_req_duration{name:listar_mensagens}": ["p(95)<800"],
    "http_req_duration{name:consultar_digitacao}": ["p(95)<500"],
  },
};

function parametros(nome) {
  return {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/json",
    },
    tags: { name: nome },
    timeout: "10s",
  };
}

function lerArray(resposta) {
  if (!resposta || resposta.status !== 200) {
    return [];
  }

  try {
    const dados = resposta.json();
    return Array.isArray(dados) ? dados : [];
  } catch {
    return [];
  }
}

function atualizarUltimaMensagem(resposta, ultimaMensagemId) {
  const mensagens = lerArray(resposta);

  for (const mensagem of mensagens) {
    if (Number.isInteger(mensagem.id) && mensagem.id > ultimaMensagemId) {
      ultimaMensagemId = mensagem.id;
    }
  }

  return ultimaMensagemId;
}

function escolherConversa(conversas) {
  const validas = conversas.filter(
    (conversa) => Number.isInteger(conversa?.id) && conversa.id > 0,
  );

  if (validas.length === 0) {
    return null;
  }

  return validas[Math.floor(Math.random() * validas.length)];
}

function carregarConversas(tipoUsuario) {
  const requisicoes = [
    [
      "GET",
      `${BASE_URL}/conversas`,
      null,
      parametros("listar_conversas_privadas"),
    ],
    [
      "GET",
      `${BASE_URL}/conversas/setor`,
      null,
      parametros("listar_conversas_setor"),
    ],
  ];

  if (tipoUsuario !== "user") {
    requisicoes.push([
      "GET",
      `${BASE_URL}/conversas/grupos`,
      null,
      parametros("listar_grupos"),
    ]);
  }

  const respostas = http.batch(requisicoes);

  check(respostas[0], {
    "conversas privadas: status 200": (resposta) => resposta.status === 200,
  });
  check(respostas[1], {
    "atendimentos de setor: status 200": (resposta) => resposta.status === 200,
  });

  if (tipoUsuario !== "user") {
    check(respostas[2], {
      "grupos: status 200": (resposta) => resposta.status === 200,
    });
  }

  return respostas.flatMap((resposta) => lerArray(resposta));
}

export function setup() {
  if (!TOKEN) {
    throw new Error(
      "K6_TOKEN nao foi definido. Informe um access token antes de iniciar.",
    );
  }

  const resposta = http.get(
    `${BASE_URL}/auth/perfil`,
    parametros("carregar_perfil"),
  );

  const perfilValido = check(resposta, {
    "token aceito e perfil carregado": (resultado) => resultado.status === 200,
  });

  if (!perfilValido) {
    throw new Error(
      `O token foi recusado pela API (status ${resposta.status}). Gere um novo access token.`,
    );
  }

  const perfil = resposta.json();

  return {
    tipoUsuario: perfil.tipo,
  };
}

export default function (dados) {
  let conversaId = null;
  let ultimaMensagemId = 0;
  let historicoCarregado = false;

  group("sessao de chat", () => {
    // Cada ciclo representa aproximadamente seis segundos com a tela aberta.
    for (let ciclo = 0; ciclo < 3; ciclo += 1) {
      const conversas = carregarConversas(dados.tipoUsuario);

      if (conversaId === null) {
        conversaId = escolherConversa(conversas)?.id ?? null;
      }

      if (conversaId === null) {
        // Com uma conta sem conversas, simula a abertura do seletor de contato/setor.
        const rota = dados.tipoUsuario === "user"
          ? "/setores/com-funcionarios"
          : "/usuarios/conversas";
        const nome = dados.tipoUsuario === "user"
          ? "listar_setores_disponiveis"
          : "listar_usuarios_conversa";
        const resposta = http.get(`${BASE_URL}${rota}`, parametros(nome));

        check(resposta, {
          "opcoes para nova conversa: status 200": (resultado) =>
            resultado.status === 200,
        });
        sleep(6);
        continue;
      }

      if (!historicoCarregado) {
        const historico = http.get(
          `${BASE_URL}/conversas/${conversaId}/mensagens?limite=50`,
          parametros("listar_mensagens"),
        );

        check(historico, {
          "historico de mensagens: status 200": (resposta) =>
            resposta.status === 200,
        });

        ultimaMensagemId = atualizarUltimaMensagem(
          historico,
          ultimaMensagemId,
        );
        historicoCarregado = true;

        if (INCLUIR_ESCRITAS) {
          const leitura = http.post(
            `${BASE_URL}/conversas/${conversaId}/leitura`,
            null,
            parametros("marcar_conversa_lida"),
          );

          check(leitura, {
            "marcacao de leitura: status 200": (resposta) =>
              resposta.status === 200,
          });
        }
      }

      // O frontend consulta digitacao a cada 1,5 s e mensagens a cada 3 s.
      for (let consulta = 1; consulta <= 4; consulta += 1) {
        sleep(1.3 + Math.random() * 0.4);

        const digitacao = http.get(
          `${BASE_URL}/conversas/${conversaId}/digitando`,
          parametros("consultar_digitacao"),
        );

        check(digitacao, {
          "consulta de digitacao: status 200": (resposta) =>
            resposta.status === 200,
        });

        if (consulta % 2 === 0) {
          const novasMensagens = http.get(
            `${BASE_URL}/conversas/${conversaId}/mensagens?depoisDe=${ultimaMensagemId}&limite=100`,
            parametros("listar_mensagens"),
          );

          check(novasMensagens, {
            "consulta de novas mensagens: status 200": (resposta) =>
              resposta.status === 200,
          });

          const ultimaMensagemAnterior = ultimaMensagemId;
          ultimaMensagemId = atualizarUltimaMensagem(
            novasMensagens,
            ultimaMensagemId,
          );

          if (INCLUIR_ESCRITAS && ultimaMensagemId > ultimaMensagemAnterior) {
            http.post(
              `${BASE_URL}/conversas/${conversaId}/leitura`,
              null,
              parametros("marcar_conversa_lida"),
            );
          }
        }
      }
    }
  });
}
