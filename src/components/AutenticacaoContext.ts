import { createContext, useContext } from "react";

// Tipos compartilhados pelas rotas, pelo login e pelo provedor de autenticação.
export type TipoUsuario = "user" | "admin" | "funcionario" | "superAdmin";

export interface UsuarioAutenticado {
  sub?: number;
  tipo: TipoUsuario;
}

export interface TokensAutenticacao {
  access_token: string;
  refresh_token?: string;
}

export type SituacaoAutenticacao =
  | "carregando"
  | "autenticado"
  | "deslogado";

interface ValorAutenticacaoContext {
  situacao: SituacaoAutenticacao;
  usuario: UsuarioAutenticado | null;
  biometriaPendente: boolean;
  entrarComBiometria: () => Promise<void>;
  iniciarSessao: (
    tokens: TokensAutenticacao,
    usuario: UsuarioAutenticado,
  ) => Promise<void>;
  encerrarSessao: () => Promise<void>;
}

export const AutenticacaoContext =
  createContext<ValorAutenticacaoContext | null>(null);

// Garante que os consumidores estejam dentro do provedor global.
export function useAutenticacao() {
  const contexto = useContext(AutenticacaoContext);

  if (!contexto) {
    throw new Error(
      "useAutenticacao deve ser usado dentro de AutenticacaoProvider.",
    );
  }

  return contexto;
}
