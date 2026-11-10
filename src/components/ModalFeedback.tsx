// Exibe mensagens de retorno para o usuário.
import "./ModalFeedback.css";

type ModalFeedbackProps = {
    aberto: boolean;
    tipo: "erro" | "sucesso";
    mensagem: string;
    aoFechar: () => void;
};

export function ModalFeedback({
    aberto,
    tipo,
    mensagem,
    aoFechar
}: ModalFeedbackProps) {
    if (!aberto) {
        return null;
    }

    const titulo = tipo === "erro"
        ? "Erro"
        : "Concluído";

    return (
        <div className="modal-fundo" onClick={aoFechar}>
            <div
                className={`modal-feedback modal-${tipo}`}
                role="alertdialog"
                aria-modal="true"
                onClick={(evento) => evento.stopPropagation()}
            >
                <div className="modal-icone">
                    {tipo === "erro" ? "!" : "✓"}
                </div>

                <h2>{titulo}</h2>

                <p>{mensagem}</p>

                <button type="button" onClick={aoFechar}>
                    {tipo === "erro" ? "Tentar novamente" : "Continuar"}
                </button>
            </div>
        </div>
    );
}
