// Permite consultar e gerenciar as secretarias cadastradas.
import { useEffect, useState } from "react";
import { ModalConfirmacao } from "../../../components/ModalConfirmacao";
import { ModalFeedback } from "../../../components/ModalFeedback";
import { obterItensPaginacao } from "../../../library/paginacao";
import { apiFetch } from "../../../services/api";

// Representa uma secretaria retornada pela API.
type SecretariaCadastrada = {
    id: number;
    secretaria: string;
    sigla_secretaria: string;
};

const ITENS_POR_PAGINA = 20;

function Secretaria() {
    // Mantém os dados da listagem e os estados das operações da tela.
    const [secretarias, setSecretarias] = useState<SecretariaCadastrada[]>([]);
    const [paginaAtual, setPaginaAtual] = useState(1);
    const [carregando, setCarregando] = useState(true);
    const [enviando, setEnviando] = useState(false);
    const [secretariaParaApagar, setSecretariaParaApagar] =
        useState<SecretariaCadastrada | null>(null);
    const [secretariaSendoApagada, setSecretariaSendoApagada] =
        useState<number | null>(null);
    const [feedback, setFeedback] = useState({
        aberto: false,
        tipo: "erro" as "erro" | "sucesso",
        mensagem: "",
    });

    // Seleciona as secretarias que pertencem à página atual.
    const totalPaginas = Math.ceil(secretarias.length / ITENS_POR_PAGINA);
    const inicioPagina = (paginaAtual - 1) * ITENS_POR_PAGINA;
    const secretariasPaginadas = secretarias.slice(
        inicioPagina,
        inicioPagina + ITENS_POR_PAGINA,
    );

    useEffect(() => {
        // Carrega a lista inicial de secretarias ao abrir a tela.
        async function carregarSecretarias() {
            try {
                const resposta = await apiFetch("/secretaria");

                if (!resposta.ok) {
                    throw new Error("Falha ao carregar as secretarias.");
                }

                const secretariasCadastradas: SecretariaCadastrada[] =
                    await resposta.json();
                setSecretarias(secretariasCadastradas);
            } catch (erro) {
                console.error("Falha ao carregar as secretarias:", erro);
                setFeedback({
                    aberto: true,
                    tipo: "erro",
                    mensagem: "Não foi possível carregar as secretarias.",
                });
            } finally {
                setCarregando(false);
            }
        }

        void carregarSecretarias();
    }, []);

    useEffect(() => {
        // Reposiciona a paginação quando uma exclusão reduz o total de páginas.
        if (totalPaginas > 0 && paginaAtual > totalPaginas) {
            setPaginaAtual(totalPaginas);
        }
    }, [paginaAtual, totalPaginas]);

    async function criar(evento: React.SubmitEvent<HTMLFormElement>) {
        // Envia os dados do formulário sem recarregar a página.
        evento.preventDefault();

        const formulario = evento.currentTarget;
        const dadosFormulario = new FormData(formulario);
        const dados = Object.fromEntries(dadosFormulario.entries());

        setEnviando(true);

        try {
            const resposta = await apiFetch(
                "/secretaria",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(dados),
                },
            );
            const resultado = await resposta.json();

            if (!resposta.ok) {
                setFeedback({
                    aberto: true,
                    tipo: "erro",
                    mensagem: Array.isArray(resultado.message)
                        ? resultado.message.join(", ")
                        : resultado.message ?? "Não foi possível cadastrar a secretaria.",
                });
                return;
            }

            // Inclui a nova secretaria localmente e preserva a ordem alfabética.
            const secretariaCriada = resultado as SecretariaCadastrada;
            setSecretarias((secretariasAtuais) =>
                [...secretariasAtuais, secretariaCriada].sort((itemA, itemB) =>
                    itemA.secretaria.localeCompare(itemB.secretaria, "pt-BR"),
                ),
            );
            formulario.reset();
            setFeedback({
                aberto: true,
                tipo: "sucesso",
                mensagem: "A secretaria foi cadastrada com sucesso.",
            });
        } catch (erro) {
            console.error("Falha ao cadastrar a secretaria:", erro);
            setFeedback({
                aberto: true,
                tipo: "erro",
                mensagem: "Não foi possível conectar com o servidor.",
            });
        } finally {
            setEnviando(false);
        }
    }

    async function apagar() {
        // A exclusão só prossegue após a escolha de uma secretaria.
        if (!secretariaParaApagar) return;

        setSecretariaSendoApagada(secretariaParaApagar.id);

        try {
            const resposta = await apiFetch(
                `/secretaria/${secretariaParaApagar.id}`,
                {
                    method: "DELETE",
                },
            );
            const resultado = await resposta.json();

            if (!resposta.ok) {
                throw new Error(
                    resultado.message ?? "Não foi possível apagar a secretaria.",
                );
            }

            // Remove da listagem local a secretaria excluída pela API.
            setSecretarias((secretariasAtuais) =>
                secretariasAtuais.filter(
                    (secretariaAtual) =>
                        secretariaAtual.id !== secretariaParaApagar.id,
                ),
            );
            setFeedback({
                aberto: true,
                tipo: "sucesso",
                mensagem: "A secretaria foi apagada com sucesso.",
            });
        } catch (erro) {
            setFeedback({
                aberto: true,
                tipo: "erro",
                mensagem:
                    erro instanceof Error
                        ? erro.message
                        : "Não foi possível apagar a secretaria.",
            });
        } finally {
            setSecretariaSendoApagada(null);
            setSecretariaParaApagar(null);
        }
    }

    // Indicador visual reutilizado nos campos obrigatórios.
    const estiloObrigatorio: React.CSSProperties = {
        color: "red",
    };
    const obrigatorio = <span style={estiloObrigatorio}>*</span>;

    return (
        <section className="secretaria">
            <header className="secretaria__header">
                <div>
                    <span>CONTROLE DE SECRETARIA</span>
                    <h2 id="titulo-secretaria">Criação e controle das secretarias</h2>
                    <p>Crie e acompanhe as secretarias do sistema</p>
                </div>
            </header>

            <div className="formulario-secretaria">
                {/* Formulário responsável pelo cadastro de novas secretarias. */}
                <form method="POST" className="secretaria-form" onSubmit={criar}>
                    <div className="container-campo-secretaria">
                        <div className="campo-form-secretaria">
                            <label htmlFor="secretaria">Secretaria{obrigatorio}</label>
                            <input
                                name="secretaria"
                                id="secretaria"
                                type="text"
                                autoComplete="off"
                                required
                            />
                        </div>
                        <div className="campo-form-secretaria">
                            <label htmlFor="sigla_secretaria">
                                Sigla da secretaria{obrigatorio}
                            </label>
                            <input
                                name="sigla_secretaria"
                                id="sigla_secretaria"
                                type="text"
                                autoComplete="off"
                                required
                            />
                        </div>
                    </div>

                    <button
                        className="botao-enviar-secretaria"
                        type="submit"
                        disabled={enviando}
                    >
                        {enviando ? "Enviando..." : "Enviar"}
                    </button>
                </form>
            </div>

            <div className="setores__tabela-container">
                <table className="setores__tabela">
                    <thead>
                        <tr>
                            <th scope="col">Sigla</th>
                            <th scope="col">Secretaria</th>
                            <th scope="col">Ações</th>
                        </tr>
                    </thead>

                    <tbody>
                        {/* Exibe somente as secretarias da página selecionada. */}
                        {secretariasPaginadas.map((item) => (
                            <tr key={item.id}>
                                <td>{item.sigla_secretaria}</td>
                                <td>{item.secretaria}</td>
                                <td className="setores__acoes">
                                    <button
                                        className="setores__botao-apagar"
                                        type="button"
                                        onClick={() => setSecretariaParaApagar(item)}
                                        disabled={secretariaSendoApagada === item.id}
                                    >
                                        {secretariaSendoApagada === item.id
                                            ? "Apagando..."
                                            : "Apagar"}
                                    </button>
                                </td>
                            </tr>
                        ))}

                        {/* Informa quando o carregamento termina sem registros. */}
                        {!carregando && secretarias.length === 0 && (
                            <tr>
                                <td colSpan={3}>Nenhuma secretaria cadastrada.</td>
                            </tr>
                        )}

                        {/* Mantém um retorno visual durante a consulta inicial. */}
                        {carregando && (
                            <tr>
                                <td colSpan={3}>Carregando secretarias...</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mostra a navegação somente quando há mais de uma página. */}
            {totalPaginas > 1 && (
                <nav
                    aria-label="Paginação das secretarias"
                    className="relatorios-logs__paginacao"
                >
                    <button
                        type="button"
                        onClick={() => setPaginaAtual((pagina) => pagina - 1)}
                        disabled={paginaAtual === 1}
                    >
                        Anterior
                    </button>

                    {obterItensPaginacao(paginaAtual, totalPaginas).map((item) => {
                        // Itens textuais representam intervalos de páginas omitidas.
                        if (typeof item === "string") {
                            return (
                                <span key={item} aria-hidden="true">
                                    …
                                </span>
                            );
                        }

                        return (
                            <button
                                key={item}
                                type="button"
                                onClick={() => setPaginaAtual(item)}
                                aria-current={paginaAtual === item ? "page" : undefined}
                                disabled={paginaAtual === item}
                            >
                                {item}
                            </button>
                        );
                    })}

                    <button
                        type="button"
                        onClick={() => setPaginaAtual((pagina) => pagina + 1)}
                        disabled={paginaAtual === totalPaginas}
                    >
                        Próxima
                    </button>
                </nav>
            )}

            {/* Solicita confirmação antes de excluir uma secretaria. */}
            <ModalConfirmacao
                aberto={secretariaParaApagar !== null}
                titulo="Apagar secretaria?"
                mensagem={
                    secretariaParaApagar
                        ? `Deseja realmente apagar a secretaria ${secretariaParaApagar.secretaria}?`
                        : ""
                }
                carregando={secretariaSendoApagada !== null}
                aoCancelar={() => setSecretariaParaApagar(null)}
                aoConfirmar={() => void apagar()}
            />

            {/* Comunica o resultado das operações realizadas na tela. */}
            <ModalFeedback
                aberto={feedback.aberto}
                tipo={feedback.tipo}
                mensagem={feedback.mensagem}
                aoFechar={() => {
                    setFeedback((estadoAtual) => ({
                        ...estadoAtual,
                        aberto: false,
                    }));
                }}
            />
        </section>
    );
}

export default Secretaria;
