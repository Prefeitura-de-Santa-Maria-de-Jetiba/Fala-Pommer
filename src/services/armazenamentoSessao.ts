import { Capacitor } from "@capacitor/core";

const CHAVE_REFRESH_TOKEN = "refresh_token";
const PREFIXO_ARMAZENAMENTO = "fala-pommer_";
const CHAVE_BIOMETRIA_HABILITADA = "biometria_habilitada";

type ArmazenamentoSeguro = typeof import("@aparajita/capacitor-secure-storage").SecureStorage;

// O plugin é guardado dentro de um objeto comum de propósito: o objeto do plugin
// (proxy do Capacitor) nunca pode ser devolvido por uma Promise ou função async.
// Se for, o JavaScript tenta chamar `plugin.then()` como método nativo, a Promise
// nunca resolve e o app fica travado.
interface ArmazenamentoCarregado {
  armazenamento: ArmazenamentoSeguro;
}

let carregamentoArmazenamento: Promise<ArmazenamentoCarregado> | null = null;

// Impede o uso do fallback web do plugin, que utiliza localStorage sem criptografia.
export function ehClienteCapacitor() {
  return Capacitor.isNativePlatform();
}

async function obterArmazenamentoSeguro() {
  if (!ehClienteCapacitor()) {
    throw new Error("O armazenamento seguro só está disponível no aplicativo.");
  }

  // Carrega o plugin apenas no APK e mantém uma única inicialização compartilhada.
  if (!carregamentoArmazenamento) {
    carregamentoArmazenamento = import(
      "@aparajita/capacitor-secure-storage"
    )
      .then(async ({ SecureStorage }) => {
        await SecureStorage.setKeyPrefix(PREFIXO_ARMAZENAMENTO);
        return { armazenamento: SecureStorage };
      })
      .catch((erro) => {
        // Permite tentar de novo se a primeira inicialização falhar.
        carregamentoArmazenamento = null;
        throw erro;
      });
  }

  return carregamentoArmazenamento;
}

// Persiste somente o refresh token no cofre protegido pelo Android Keystore.
export async function salvarRefreshTokenSeguro(refreshToken: string) {
  const { armazenamento } = await obterArmazenamentoSeguro();
  await armazenamento.setItem(CHAVE_REFRESH_TOKEN, refreshToken);
}

export async function obterRefreshTokenSeguro() {
  const { armazenamento } = await obterArmazenamentoSeguro();
  return armazenamento.getItem(CHAVE_REFRESH_TOKEN);
}

export async function removerRefreshTokenSeguro() {
  if (!ehClienteCapacitor()) {
    return;
  }

  try {
    const { armazenamento } = await obterArmazenamentoSeguro();
    await armazenamento.removeItem(CHAVE_REFRESH_TOKEN);
  } catch (erro) {
    // O logout local deve continuar mesmo se o cofre nativo estiver indisponível.
    console.error("Não foi possível limpar o refresh token seguro.", erro);
  }
}

export async function salvarBiometriaHabilitada() {
  const { armazenamento } = await obterArmazenamentoSeguro();
  await armazenamento.setItem(CHAVE_BIOMETRIA_HABILITADA, "true");
}

export async function obterBiometriaHabilitada() {
  if (!ehClienteCapacitor()) {
    return false;
  }

  const { armazenamento } = await obterArmazenamentoSeguro();
  return (await armazenamento.getItem(CHAVE_BIOMETRIA_HABILITADA)) === "true";
}

export async function removerBiometriaHabilitada() {
  if (!ehClienteCapacitor()) {
    return;
  }

  const { armazenamento } = await obterArmazenamentoSeguro();
  await armazenamento.removeItem(CHAVE_BIOMETRIA_HABILITADA);
}