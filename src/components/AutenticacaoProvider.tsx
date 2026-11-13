import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  apiFetch,
  limparSessaoLocal,
  observarSessaoEncerrada,
  registrarTokensSessao,
  revogarSessaoAtual,
} from "../services/api";
import {
  AutenticacaoContext,
  type TokensAutenticacao,
  type UsuarioAutenticado,
} from "./AutenticacaoContext";
import { desregistrarNotificacoes } from "../services/notificacoes.service";
import { autenticarComBiometria } from "../services/biometria.service";
import {
  obterBiometriaHabilitada,
  obterRefreshTokenSeguro,
} from "../services/armazenamentoSessao";

const TEMPO_LIMITE_RESTAURACAO_MS = 15000;
const ERRO_TEMPO_ESGOTADO = "tempo_esgotado";

// Evita que a tela fique presa em "Restaurando sessão" se a API não responder.
function comTempoLimite<T>(promessa: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = window.setTimeout(
      () => reject(new Error(ERRO_TEMPO_ESGOTADO)),
      ms,
    );

    promessa.then(
      (valor) => {
        window.clearTimeout(id);
        resolve(valor);
      },
      (erro) => {
        window.clearTimeout(id);
        reject(erro);
      },
    );
  });
}

// Limpa a sessão local sem deixar a interface presa se o cofre nativo travar.
function limparSemTravar() {
  return comTempoLimite(limparSessaoLocal(), 5000).catch(() => undefined);
}

interface AutenticacaoProviderProps {
  children: ReactNode;
}

export function AutenticacaoProvider({
  children,
}: AutenticacaoProviderProps) {
  const [usuario, setUsuario] = useState<UsuarioAutenticado | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [biometriaPendente, setBiometriaPendente] = useState(false);

  useEffect(() => {
    let ativo = true;

    // Sincroniza a interface quando o cliente HTTP encerra uma sessão inválida.
    const removerObservador = observarSessaoEncerrada(() => {
      if (ativo) {
        setUsuario(null);
        setBiometriaPendente(false);
        setCarregando(false);
      }
    });

    async function restaurarSessao() {
      try {
        const biometriaHabilitada = await obterBiometriaHabilitada();
        const possuiSessaoNativa = biometriaHabilitada
          ? Boolean(await obterRefreshTokenSeguro())
          : false;

        if (possuiSessaoNativa) {
          try {
            await autenticarComBiometria();
          } catch {
            if (ativo) {
              setBiometriaPendente(true);
            }
            return;
          }
        }

        // Também tenta renovar via cookie web ou cofre nativo quando o JWT sumiu.
        const resposta = await comTempoLimite(
          apiFetch("/auth/perfil"),
          TEMPO_LIMITE_RESTAURACAO_MS,
        );

        if (!resposta.ok) {
          await limparSemTravar();
          return;
        }

        const perfil = (await resposta.json()) as UsuarioAutenticado;

        if (ativo) {
          setUsuario(perfil);
          setBiometriaPendente(false);
        }
      } catch (erro) {
        // Falha de rede (sem resposta ou "Failed to fetch") não é motivo para
        // apagar a sessão salva: apenas libera a interface para tentar de novo.
        if (
          erro instanceof TypeError ||
          (erro instanceof Error && erro.message === ERRO_TEMPO_ESGOTADO)
        ) {
          console.error("Falha de rede ao restaurar a sessão.", erro);
          return;
        }

        // O cancelamento do prompt é tratado acima e não apaga o refresh token.
        await limparSemTravar();
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    void restaurarSessao();

    return () => {
      ativo = false;
      removerObservador();
    };
  }, []);

  const entrarComBiometria = useCallback(async () => {
    setCarregando(true);

    try {
      await autenticarComBiometria();

      const resposta = await apiFetch("/auth/perfil");

      if (!resposta.ok) {
        await limparSessaoLocal();
        throw new Error("Sua sessão expirou. Entre novamente com e-mail e senha.");
      }

      const perfil = (await resposta.json()) as UsuarioAutenticado;
      setUsuario(perfil);
      setBiometriaPendente(false);
    } finally {
      setCarregando(false);
    }
  }, []);

  const iniciarSessao = useCallback(
    async (
      tokens: TokensAutenticacao,
      usuarioLogado: UsuarioAutenticado,
    ) => {
      // Disponibiliza os tokens ao cliente HTTP e libera as rotas protegidas.
      await registrarTokensSessao(tokens);
      setUsuario(usuarioLogado);
      setBiometriaPendente(false);
      setCarregando(false);
    },
    [],
  );

  const encerrarSessao = useCallback(async () => {
    // Remove o token push enquanto a sessão ainda pode autenticar a requisição.
    await desregistrarNotificacoes();
    await revogarSessaoAtual();
    setUsuario(null);
    setCarregando(false);
  }, []);

  const valor = useMemo(
    () => ({
      situacao: carregando
        ? ("carregando" as const)
        : usuario
          ? ("autenticado" as const)
          : ("deslogado" as const),
      usuario,
      biometriaPendente,
      entrarComBiometria,
      iniciarSessao,
      encerrarSessao,
    }),
    [
      biometriaPendente,
      carregando,
      encerrarSessao,
      entrarComBiometria,
      iniciarSessao,
      usuario,
    ],
  );

  return (
    <AutenticacaoContext.Provider value={valor}>
      {children}
    </AutenticacaoContext.Provider>
  );
}