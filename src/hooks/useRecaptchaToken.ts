import { useCallback } from "react";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";

export type AcaoRecaptcha = "login" | "cadastro" | "recuperar_senha";

export function useRecaptchaToken() {
  const { executeRecaptcha } = useGoogleReCaptcha();

  return useCallback(
    async (acao: AcaoRecaptcha) => {
      if (!executeRecaptcha) {
        throw new Error(
          "A verificação de segurança ainda não está disponível. Tente novamente.",
        );
      }

      return executeRecaptcha(acao);
    },
    [executeRecaptcha],
  );
}
