// Estrutura vazia para o formulário de conclusão do cadastro com Google.
import { useEffect } from "react";
import type { ReactNode } from "react";
import "./ModalCadastroGoogle.css";

interface ModalCadastroGoogleProps {
  aberto: boolean;
  children?: ReactNode;
  aoFechar: () => void;
}

export function ModalCadastroGoogle({
  aberto,
  children,
  aoFechar,
}: ModalCadastroGoogleProps) {
  useEffect(() => {
    if (!aberto) return;

    function fecharComEscape(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        aoFechar();
      }
    }

    window.addEventListener("keydown", fecharComEscape);
    return () => window.removeEventListener("keydown", fecharComEscape);
  }, [aberto, aoFechar]);

  if (!aberto) return null;

  return (
    <div className="modal-cadastro-google-fundo" onClick={aoFechar}>
      <div
        className="modal-cadastro-google"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-cadastro-google-titulo"
        onClick={(evento) => evento.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
