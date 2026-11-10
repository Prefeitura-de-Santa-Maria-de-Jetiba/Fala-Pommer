// Coleta a avaliação do usuário antes de finalizar uma conversa.
import { useEffect, useState, type FormEvent } from "react";
import "./ModalFinalizarConversa.css";

type DadosFinalizacao = {
    avaliacao: number;
    descricao: string;
};

type ModalFinalizarConversaProps = {
    aberto: boolean;
    enviando?: boolean;
    aoEnviar: (dados: DadosFinalizacao) => void;
};

export function ModalFinalizarConversa({
    aberto,
    enviando = false,
    aoEnviar,
}: ModalFinalizarConversaProps) {
    const [avaliacao, setAvaliacao] = useState(0);
    const [avaliacaoEmDestaque, setAvaliacaoEmDestaque] = useState<number | null>(null);
    const [descricao, setDescricao] = useState("");

    useEffect(() => {
        if (!aberto) {
            return;
        }

        setAvaliacao(0);
        setAvaliacaoEmDestaque(null);
        setDescricao("");
    }, [aberto]);

    if (!aberto) {
        return null;
    }

    function enviar(evento: FormEvent<HTMLFormElement>) {
        evento.preventDefault();

        if (avaliacao === 0 || enviando) {
            return;
        }

        aoEnviar({
            avaliacao,
            descricao: descricao.trim(),
        });
    }

    return (
        <div
            className="modal-finalizar-fundo"
            role="presentation"
        >
            <form
                className="modal-finalizar"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-finalizar-titulo"
                onSubmit={enviar}
            >
                <header className="modal-finalizar__cabecalho">
                    <div>
                            <span>AVALIAÇÃO DO ATENDIMENTO</span>
                        <h2 id="modal-finalizar-titulo">Finalizar conversa</h2>
                    </div>
                </header>

                <div className="modal-finalizar__conteudo">
                    <div className="modal-finalizar__introducao">
                            <p>Sua opinião é muito importante! Qual nota você dá para o nosso atendimento?</p>
                    </div>

                    <fieldset className="modal-finalizar__avaliacao">
                            <legend>Como você avalia este atendimento?</legend>
                        <div
                            className="modal-finalizar__estrelas"
                            role="radiogroup"
                            aria-label="Avaliação de uma a cinco estrelas"
                            onMouseLeave={() => setAvaliacaoEmDestaque(null)}
                        >
                            {[1, 2, 3, 4, 5].map((estrela) => (
                                <button
                                    key={estrela}
                                    type="button"
                                    role="radio"
                                    aria-checked={avaliacao === estrela}
                                    aria-label={estrela === 1
                                        ? "1 estrela"
                                        : `${estrela} estrelas`}
                                    className={estrela <= (avaliacaoEmDestaque ?? avaliacao)
                                        ? "modal-finalizar__estrela modal-finalizar__estrela--ativa"
                                        : "modal-finalizar__estrela"}
                                    onClick={() => setAvaliacao(estrela)}
                                    onMouseEnter={() => setAvaliacaoEmDestaque(estrela)}
                                    disabled={enviando}
                                >
                                    ★
                                </button>
                            ))}
                        </div>
                    </fieldset>

                    <label className="modal-finalizar__descricao">
                        <span>Descrição</span>
                        <textarea
                            value={descricao}
                            onChange={(evento) => setDescricao(evento.target.value)}
                            placeholder="Conte como foi o atendimento..."
                            rows={5}
                            maxLength={500}
                            disabled={enviando}
                        />
                    </label>
                </div>

                <footer className="modal-finalizar__acoes">
                    <button
                        type="submit"
                        className="modal-finalizar__enviar"
                        disabled={avaliacao === 0 || enviando}
                    >
                        {enviando ? "Enviando..." : "Enviar"}
                    </button>
                </footer>
            </form>
        </div>
    );
}
