import {
  ehClienteCapacitor,
  obterRefreshTokenSeguro,
  removerBiometriaHabilitada,
  removerRefreshTokenSeguro,
  salvarRefreshTokenSeguro,
} from "./armazenamentoSessao";

// No navegador em desenvolvimento, usa o proxy local para o cookie ser first-party.
const API_URL = import.meta.env.DEV && !ehClienteCapacitor()
  ? ""
  : import.meta.env.VITE_API_URL;
const CHAVE_ACCESS_TOKEN_LEGADO = "access_token";
const EVENTO_SESSAO_ENCERRADA = "fala-pommer:sessao-encerrada";
const CABECALHO_CLIENTE = "X-Fala-Pommer-Cliente";

interface TokensSessao {
  access_token: string;
  refresh_token?: string;
}

let accessTokenEmMemoria: string | null = null;
let refreshTokenEmMemoria: string | null = null;
let renovacaoEmAndamento: Promise<boolean> | null = null;

// Apaga o JWT persistido por versões antigas; a sessão longa usa outra credencial.
localStorage.removeItem(CHAVE_ACCESS_TOKEN_LEGADO);

function obterAccessToken() {
  return accessTokenEmMemoria;
}

export async function registrarTokensSessao(tokens: TokensSessao) {
  if (ehClienteCapacitor()) {
    if (!tokens.refresh_token) {
      throw new Error("O aplicativo não recebeu o refresh token da sessão.");
    }

    // No APK, persiste a credencial longa antes de liberar a sessão na interface.
    await salvarRefreshTokenSeguro(tokens.refresh_token);
    refreshTokenEmMemoria = tokens.refresh_token;
  } else {
    // Na web, o refresh token permanece exclusivamente no cookie HttpOnly.
    refreshTokenEmMemoria = null;
  }

  // O access token é curto e permanece apenas na memória desta execução.
  accessTokenEmMemoria = tokens.access_token;
}

// Limpa os tokens e avisa o contexto para atualizar imediatamente a interface.
export async function limparSessaoLocal() {
  accessTokenEmMemoria = null;
  localStorage.removeItem(CHAVE_ACCESS_TOKEN_LEGADO);
  refreshTokenEmMemoria = null;
  await removerRefreshTokenSeguro();

  try {
    await removerBiometriaHabilitada();
  } catch (erro) {
    // A interface ainda deve encerrar a sessão se o cofre nativo falhar.
    console.error("Não foi possível limpar a preferência de biometria.", erro);
  }

  window.dispatchEvent(new Event(EVENTO_SESSAO_ENCERRADA));
}

export function observarSessaoEncerrada(aoEncerrar: () => void) {
  window.addEventListener(EVENTO_SESSAO_ENCERRADA, aoEncerrar);

  return () => {
    window.removeEventListener(EVENTO_SESSAO_ENCERRADA, aoEncerrar);
  };
}

export function requisicaoPublica(
  caminho: string,
  opcoes: RequestInit = {},
) {
  const headers = prepararCabecalhos(opcoes.headers);

  // Permite que o navegador envie o cookie HttpOnly nas rotas de autenticação.
  return fetch(`${API_URL}${caminho}`, {
    ...opcoes,
    headers,
    credentials: "include",
  });
}

function prepararCabecalhos(headersIniciais?: HeadersInit) {
  const headers = new Headers(headersIniciais);

  if (ehClienteCapacitor()) {
    // O backend usa esta marca para devolver o refresh token somente ao APK.
    headers.set(CABECALHO_CLIENTE, "capacitor");
  }

  return headers;
}

async function executarRequisicaoAutenticada(
  caminho: string,
  opcoes: RequestInit,
) {
  // Centraliza a inclusão do JWT em todas as requisições autenticadas novas.
  const headers = prepararCabecalhos(opcoes.headers);
  const accessToken = obterAccessToken();

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  return fetch(`${API_URL}${caminho}`, {
    ...opcoes,
    headers,
    credentials: "include",
  });
}

async function renovarAccessToken() {
  const clienteCapacitor = ehClienteCapacitor();
  const refreshToken = clienteCapacitor
    ? refreshTokenEmMemoria ?? (await obterRefreshTokenSeguro())
    : null;

  // O navegador usa o cookie; somente o APK precisa enviar o token no corpo.
  if (clienteCapacitor && !refreshToken) {
    return false;
  }

  const resposta = await requisicaoPublica("/auth/refresh", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      clienteCapacitor ? { refreshToken } : {},
    ),
  });

  if (!resposta.ok) {
    await limparSessaoLocal();
    return false;
  }

  const tokens = (await resposta.json()) as Partial<TokensSessao>;

  if (
    !tokens.access_token ||
    (clienteCapacitor && !tokens.refresh_token)
  ) {
    await limparSessaoLocal();
    return false;
  }

  try {
    await registrarTokensSessao({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });
  } catch {
    await limparSessaoLocal();
    return false;
  }

  return true;
}

function renovarAccessTokenUmaVez() {
  // Compartilha uma única renovação entre requisições que recebem 401 juntas.
  if (!renovacaoEmAndamento) {
    renovacaoEmAndamento = renovarAccessToken().finally(() => {
      renovacaoEmAndamento = null;
    });
  }

  return renovacaoEmAndamento;
}

export async function apiFetch(
  caminho: string,
  opcoes: RequestInit = {},
) {
  let resposta = await executarRequisicaoAutenticada(caminho, opcoes);

  if (resposta.status !== 401) {
    return resposta;
  }

  const renovado = await renovarAccessTokenUmaVez();

  if (!renovado) {
    await limparSessaoLocal();
    return resposta;
  }

  // Repete a requisição original com o novo access token.
  resposta = await executarRequisicaoAutenticada(caminho, opcoes);

  if (resposta.status === 401) {
    await limparSessaoLocal();
  }

  return resposta;
}

export async function revogarSessaoAtual() {
  // A limpeza local ocorre mesmo se o servidor estiver indisponível.
  try {
    await apiFetch("/auth/logout", {
      method: "POST",
    });
  } finally {
    await limparSessaoLocal();
  }
}
