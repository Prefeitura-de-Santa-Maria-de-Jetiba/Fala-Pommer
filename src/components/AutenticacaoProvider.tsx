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
        const resposta = await apiFetch("/auth/perfil");

        if (!resposta.ok) {
          await limparSessaoLocal();
          return;
        }

        const perfil = (await resposta.json()) as UsuarioAutenticado;

        if (ativo) {
          setUsuario(perfil);
          setBiometriaPendente(false);
        }
      } catch {
        // O cancelamento do prompt é tratado acima e não apaga o refresh token.
        await limparSessaoLocal();
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
