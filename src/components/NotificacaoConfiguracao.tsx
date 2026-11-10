import { useEffect, useRef } from "react";
import "./NotificacaoConfiguracao.css";

type NotificacaoConfiguracaoProps = {
    aoFechar: () => void;
    estado: "ativado" | "desativado";
};

export function NotificacaoConfiguracao({
    aoFechar,
    estado,
}: NotificacaoConfiguracaoProps) {
    const aoFecharRef = useRef(aoFechar);

    useEffect(() => {
        aoFecharRef.current = aoFechar;
    }, [aoFechar]);

    useEffect(() => {
        const temporizador = window.setTimeout(
            () => aoFecharRef.current(),
            5_000,
        );

        return () => window.clearTimeout(temporizador);
    }, []);

    return (
        <aside
            className="notificacao-configuracao"
            role="status"
            aria-live="polite"
        >
            <div className="notificacao-configuracao__icone" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                    <path d="m5 12.5 4.2 4L19 7" />
                </svg>
            </div>

            <div className="notificacao-configuracao__conteudo">
                <strong>Recurso {estado}</strong>
                <p>
                    A configuração foi {estado === "ativado" ? "ativada" : "desativada"} com sucesso.
                </p>
                <span>Agora</span>
            </div>

            <button
                className="notificacao-configuracao__fechar"
                type="button"
                aria-label="Fechar notificaÃ§Ã£o"
                onClick={aoFechar}
            >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m6 6 12 12M18 6 6 18" />
                </svg>
            </button>

            <span className="notificacao-configuracao__progresso" aria-hidden="true" />
        </aside>
    );
}
