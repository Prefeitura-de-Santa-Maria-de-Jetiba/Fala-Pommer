// Permite consultar e gerenciar os setores cadastrados.
import { useEffect, useState } from "react";
import { obterItensPaginacao } from "../../../library/paginacao";
import { ModalConfirmacao } from "../../../components/ModalConfirmacao";
import { ModalFeedback } from "../../../components/ModalFeedback";
import { apiFetch } from "../../../services/api";

// Representa um setor e sua possível associação com uma secretaria.
type Setor = {
    id: number;
    setor: string;
    sigla_setor: string;
    secretaria_id: number | null;
    secretaria: Secretaria | null;
}

// Define os dados de secretaria usados na seleção e na listagem.
type Secretaria = {
    id: number;
    secretaria: string;
    sigla_secretaria: string;
}

const ITENS_POR_PAGINA = 20;

function Setores() {
    // Mantém as listas e os estados das operações realizadas na tela.
    const [setores, setSetores] = useState<Setor[]>([]);
    const [secretarias, setSecretarias] = useState<Secretaria[]>([]);
    const [carregandoSecretarias, setCarregandoSecretarias] = useState(true);
    const [paginaAtual, setPaginaAtual] = useState(1);
    const [setorParaApagar, setSetorParaApagar] = useState<Setor | null>(null);
    const [setorSendoApagado, setSetorSendoApagado] = useState<number | null>(null);
    const [feedback, setFeedback] = useState({
        aberto: false,
        tipo: "erro" as "erro" | "sucesso",
        mensagem: ""
    });

    // Seleciona apenas os setores correspondentes à página atual.
    const totalPaginas = Math.ceil(setores.length / ITENS_POR_PAGINA);
    const inicioPagina = (paginaAtual - 1) * ITENS_POR_PAGINA;
    const setoresPaginados = setores.slice(
        inicioPagina,
        inicioPagina + ITENS_POR_PAGINA,
    );

    useEffect(() => {
        // Carrega os setores cadastrados ao abrir a tela.
        async function carregarSetores() {
            try {
                const resposta = await apiFetch("/setores");

                if (!resposta.ok) {
                    throw new Error("Falha ao carregar os setores.");
                }

                const setoresCadastrados: Setor[] = await resposta.json();
                setSetores(setoresCadastrados);
            } catch (erro) {
                console.error("Falha ao carregar os setores:", erro);
            }
        }

        carregarSetores();
    }, []);

    useEffect(() => {
        // Carrega as secretarias disponíveis para associação com o setor.
        async function carregarSecretarias() {
            try {
                const resposta = await apiFetch("/secretaria");

                if (!resposta.ok) {
                    throw new Error("Falha ao carregar as secretarias.");
                }

                const secretariasCadastradas: Secretaria[] = await resposta.json();
                setSecretarias(secretariasCadastradas);
            } catch (erro) {
                console.error("Falha ao carregar as secretarias:", erro);
                setFeedback({
                    aberto: true,
                    tipo: "erro",
                    mensagem: "Não foi possível carregar as secretarias.",
                });
            } finally {
                setCarregandoSecretarias(false);
            }
        }

        void carregarSecretarias();
    }, []);

    useEffect(() => {
        // Ajusta a página atual quando uma exclusão reduz o total de páginas.
        if (totalPaginas > 0 && paginaAtual > totalPaginas) {
            setPaginaAtual(totalPaginas);
        }
    }, [paginaAtual, totalPaginas]);

    async function criar(
    event: React.SubmitEvent<HTMLFormElement>,
    ) {
        event.preventDefault(); //Evita que a página recarregue ao clicar no botão de envio

        const formulario = event.currentTarget;
        const dadosFormulario = new FormData(formulario);
        const secretariaId = dadosFormulario.get("secretaria_id");

        // Normaliza os valores do formulário antes do envio para a API.
        const dados = {
            setor: String(dadosFormulario.get("setor") ?? ""),
            sigla_setor: String(dadosFormulario.get("sigla_setor") ?? ""),
            secretaria_id: secretariaId ? Number(secretariaId) : null,
        };

        try {
            const resposta = await apiFetch("/setores", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dados),
            });

            const resultado = await resposta.json();

            if (!resposta.ok) {
                setFeedback({
                    aberto: true,
                    tipo: "erro",
                    mensagem: Array.isArray(resultado.message)
                        ? resultado.message.join(", ")
                        : resultado.message
                });

                return;
            }

            setFeedback({
                aberto: true,
                tipo: "sucesso",
                mensagem: "O setor foi cadastrado com sucesso"
            });

            // Acrescenta o setor criado à listagem sem realizar uma nova consulta.
            setSetores((setoresAtuais) => [...setoresAtuais, resultado]);
            formulario.reset();
        } catch(erro) {
            console.error("Falha ao enviar o formulario:", erro);

            setFeedback({
                aberto: true,
                tipo: "erro",
                mensagem: "Não foi possível conectar com o servidor."
            });
        }

    }

    async function apagar() {
        // A exclusão só prossegue quando um setor foi selecionado.
        if (!setorParaApagar) return;

        setSetorSendoApagado(setorParaApagar.id);

        try {
            const resposta = await apiFetch(
                `/setores/${setorParaApagar.id}`,
                {
                    method: "DELETE",
                },
            );
            const resultado = await resposta.json();

            if (!resposta.ok) {
                throw new Error(resultado.message ?? "Não foi possível apagar o setor.");
            }

            // Remove da listagem local o setor excluído pela API.
            setSetores((setoresAtuais) =>
                setoresAtuais.filter((setorAtual) => setorAtual.id !== setorParaApagar.id),
            );
            setFeedback({
                aberto: true,
                tipo: "sucesso",
                mensagem: "O setor foi apagado com sucesso"
            });
        } catch (erro) {
            setFeedback({
                aberto: true,
                tipo: "erro",
                mensagem: erro instanceof Error
                    ? erro.message
                    : "Não foi possível apagar o setor."
            });
        } finally {
            setSetorSendoApagado(null);
            setSetorParaApagar(null);
        }
    }

    // Indicador visual reutilizado nos campos obrigatórios.
    const estiloObrigatorio: React.CSSProperties = {
        color: 'red',
    }
    const obrigatorio = <span style={estiloObrigatorio}>*</span>;

    return (
        <section className="setores">
            <header className="setores__header">
                <div>
                    <span>CONTROLE DE SETORES</span>
                    <h2 id="titulo-setores">Criação e controle dos setores</h2>
                    <p>Crie e acompanhe os setores do sistema</p>
                </div>
            </header>

            <div className="formulario-setor">
                {/* Formulário responsável pelo cadastro de novos setores. */}
                <form method="POST" className="setor-form" onSubmit={criar}>
                    <div className="container-campo-setor">
                        <div className="campo-form-setor campo-form-setor--secretaria">
                            <label htmlFor="campo-add-secretaria">Secretaria{obrigatorio}</label>
                            <select
                                name="secretaria_id"
                                id="campo-add-secretaria"
                                defaultValue=""
                                disabled={carregandoSecretarias}
                            >
                                <option value="">
                                    {carregandoSecretarias
                                        ? "Carregando secretarias..."
                                        : secretarias.length === 0
                                            ? "Sem secretaria cadastrada"
                                            : "Sem secretaria"}
                                </option>

                                {/* Disponibiliza as secretarias carregadas como opções. */}
                                {secretarias.map((secretaria) => (
                                    <option key={secretaria.id} value={secretaria.id}>
                                        {secretaria.sigla_secretaria} — {secretaria.secretaria}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="campo-form-setor">
                            <label htmlFor="setor">Setor{obrigatorio}</label>
                            <input
                            name="setor"
                            id="setor"
                            type="text"
                            autoComplete="off"
                            required
                            />
                        </div>
                        <div className="campo-form-setor">
                            <label htmlFor="sigla_setor">Sigla do setor{obrigatorio}</label>
                            <input
                            name="sigla_setor"
                            id="sigla_setor"
                            type="text"
                            autoComplete="off"
                            required
                            />
                        </div>
                    </div>

                    <button
                        className="botao-enviar-setor"
                        type="submit"
                    >
                        Enviar
                    </button>
                </form>
            </div>

            <div className="setores__tabela-container">
                <table className="setores__tabela">
                    <thead>
                        <tr>
                            <th scope="col">Sigla</th>
                            <th scope="col">Setor</th>
                            <th scope="col">Secretaria</th>
                            <th scope="col">Ações</th>
                        </tr>
                    </thead>

                    <tbody>
                        {/* Exibe somente os setores da página selecionada. */}
                        {setoresPaginados.map((setor) => (
                            <tr key={setor.id}>
                                <td>{setor.sigla_setor}</td>
                                <td>{setor.setor}</td>
                                <td>
                                    {setor.secretaria
                                        ? `${setor.secretaria.sigla_secretaria} — ${setor.secretaria.secretaria}`
                                        : "Sem secretaria"}
                                </td>
                                <td className="setores__acoes">
                                    <button
                                        className="setores__botao-apagar"
                                        type="button"
                                        onClick={() => setSetorParaApagar(setor)}
                                        disabled={setorSendoApagado === setor.id}
                                    >
                                        {setorSendoApagado === setor.id ? "Apagando..." : "Apagar"}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mostra a navegação somente quando há mais de uma página. */}
            {totalPaginas > 1 && (
                <nav
                    aria-label="Paginação dos setores"
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

            {/* Solicita confirmação antes de excluir um setor. */}
            <ModalConfirmacao
                aberto={setorParaApagar !== null}
                titulo="Apagar setor?"
                mensagem={setorParaApagar
                    ? `Deseja realmente apagar o setor ${setorParaApagar.setor}?`
                    : ""}
                carregando={setorSendoApagado !== null}
                aoCancelar={() => setSetorParaApagar(null)}
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
                        aberto: false
                    }));
                }}
            />
        </section>
    )
}

export default Setores;
