import { useEffect, useState } from "react";
import { obterItensPaginacao } from "../../../library/paginacao";
import { apiFetch } from "../../../services/api";

// Representa os dados básicos dos usuários envolvidos em cada ação.
interface UsuarioAlvo {
    id: number;
    nome: string;
}

// Define a estrutura de um registro do histórico administrativo.
interface Historico {
    id: number;
    administrador: UsuarioAlvo;
    usuario_alvo: UsuarioAlvo;
    acao: "usuario_desativado" | "usuario_reativado";
    motivo: string | null;
    criado_em: string;
    tipo_usuario_anterior: string | null;
}

const ITENS_POR_PAGINA = 20;

// Converte o identificador da ação em um texto legível.
function formatarAcao(acao: Historico["acao"]) {
    return acao === "usuario_desativado" ? "Desativação" : "Reativação";
}

// Traduz os tipos internos de usuário para os nomes exibidos na tabela.
function formatarTipoUsuario(tipo: string | null) {
    const tipos: Record<string, string> = {
        user: "Usuário",
        funcionario: "Funcionário",
        admin: "Administrador",
        superAdmin: "Super administrador",
    };

    return tipo ? tipos[tipo] ?? tipo : "—";
}

// Formata datas válidas conforme o padrão brasileiro.
function formatarData(data: string) {
    const dataConvertida = new Date(data);

    if (Number.isNaN(dataConvertida.getTime())) return "—";

    return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
    }).format(dataConvertida);
}

function HistoricoAdministrativo() {
    // Mantém os registros e os estados de pesquisa, paginação e carregamento.
    const [historicos, setHistoricos] = useState<Historico[]>([]);
    const [pesquisa, setPesquisa] = useState("");
    const [paginaAtual, setPaginaAtual] = useState(1);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");

    // Normaliza o termo e pesquisa nos principais campos do histórico.
    const termoPesquisa = pesquisa.trim().toLocaleLowerCase("pt-BR");
    const historicosFiltrados = historicos.filter((historico) => (
        String(historico.id).includes(termoPesquisa) ||
        String(historico.administrador.id).includes(termoPesquisa) ||
        historico.administrador.nome
            .toLocaleLowerCase("pt-BR")
            .includes(termoPesquisa) ||
        String(historico.usuario_alvo.id).includes(termoPesquisa) ||
        historico.usuario_alvo.nome
            .toLocaleLowerCase("pt-BR")
            .includes(termoPesquisa) ||
        formatarAcao(historico.acao)
            .toLocaleLowerCase("pt-BR")
            .includes(termoPesquisa) ||
        (historico.motivo ?? "")
            .toLocaleLowerCase("pt-BR")
            .includes(termoPesquisa)
    ));

    // Pagina somente os registros que correspondem à pesquisa atual.
    const totalPaginas = Math.ceil(
        historicosFiltrados.length / ITENS_POR_PAGINA,
    );
    const inicioPagina = (paginaAtual - 1) * ITENS_POR_PAGINA;
    const historicosPaginados = historicosFiltrados.slice(
        inicioPagina,
        inicioPagina + ITENS_POR_PAGINA,
    );

    useEffect(() => {
        // Evita atualizações de estado depois que o componente for desmontado.
        let componenteAtivo = true;

        async function carregarHistorico() {
            // Consulta o histórico pelo cliente que renova a sessão automaticamente.
            try {
                const resposta = await apiFetch(
                    "/usuarios/historico-administrativo",
                );

                if (!resposta.ok) {
                    throw new Error("Não foi possível carregar o histórico administrativo.");
                }

                const dados: Historico[] = await resposta.json();

                if (componenteAtivo) {
                    // Mantém os registros mais recentes no início da listagem.
                    setHistoricos(
                        dados.sort((primeiro, segundo) =>
                            segundo.criado_em.localeCompare(primeiro.criado_em),
                        ),
                    );
                }
            } catch (erroCarregamento) {
                if (componenteAtivo) {
                    setErro(
                        erroCarregamento instanceof Error
                            ? erroCarregamento.message
                            : "Não foi possível carregar o histórico administrativo.",
                    );
                }
            } finally {
                if (componenteAtivo) setCarregando(false);
            }
        }

        void carregarHistorico();

        return () => {
            componenteAtivo = false;
        };
    }, []);

    useEffect(() => {
        // Corrige a página atual quando a filtragem reduz o total de páginas.
        if (totalPaginas > 0 && paginaAtual > totalPaginas) {
            setPaginaAtual(totalPaginas);
        }
    }, [paginaAtual, totalPaginas]);

    return (
        <section className="usuarios">
            <header className="usuarios__header">
                <div>
                    <span>CONTROLE DE USUÁRIOS</span>
                    <h2 id="titulo-historico-administrativo">
                        Histórico de Ativação e Desativação
                    </h2>
                    <p>
                        Visualize quando e por quem os status dos usuários foram alterados.
                    </p>
                </div>
            </header>

            <div className="usuarios__pesquisa">
                {/* Reinicia a paginação sempre que o termo pesquisado muda. */}
                <input
                    type="search"
                    value={pesquisa}
                    onChange={(evento) => {
                        setPesquisa(evento.target.value);
                        setPaginaAtual(1);
                    }}
                    placeholder="Pesquisar no histórico..."
                    aria-label="Pesquisar no histórico administrativo"
                />
            </div>

            <div className="usuarios__tabela-container">
                <table className="usuarios__tabela">
                    <thead>
                        <tr>
                            <th scope="col">ID</th>
                            <th scope="col">Feito por</th>
                            <th scope="col">Usuário alvo</th>
                            <th scope="col">Ação</th>
                            <th scope="col">Motivo</th>
                            <th scope="col">Quando</th>
                            <th scope="col">Tipo anterior</th>
                        </tr>
                    </thead>

                    <tbody>
                        {/* Apresenta o estado da consulta inicial. */}
                        {carregando && (
                            <tr>
                                <td colSpan={7}>Carregando histórico...</td>
                            </tr>
                        )}

                        {/* Exibe uma falha ocorrida durante o carregamento. */}
                        {!carregando && erro && (
                            <tr>
                                <td colSpan={7}>{erro}</td>
                            </tr>
                        )}

                        {/* Informa quando não existem resultados para a pesquisa. */}
                        {!carregando && !erro && historicosPaginados.length === 0 && (
                            <tr>
                                <td colSpan={7}>Nenhum registro encontrado.</td>
                            </tr>
                        )}

                        {/* Renderiza apenas os registros pertencentes à página atual. */}
                        {!carregando && !erro && historicosPaginados.map((historico) => (
                            <tr key={historico.id}>
                                <td>{historico.id}</td>
                                <td>{historico.administrador.nome}</td>
                                <td>
                                    {historico.usuario_alvo.nome}
                                </td>
                                <td>
                                    <span
                                        className={`usuarios__status usuarios__status--${
                                            historico.acao === "usuario_desativado"
                                                ? "desativada"
                                                : "ativa"
                                        }`}
                                    >
                                        {formatarAcao(historico.acao)}
                                    </span>
                                </td>
                                <td>{historico.motivo || "—"}</td>
                                <td>{formatarData(historico.criado_em)}</td>
                                <td>{formatarTipoUsuario(historico.tipo_usuario_anterior)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mostra a navegação somente quando há mais de uma página. */}
            {totalPaginas > 1 && (
                <nav
                    aria-label="Paginação do histórico administrativo"
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
        </section>
    );
}

export default HistoricoAdministrativo;
