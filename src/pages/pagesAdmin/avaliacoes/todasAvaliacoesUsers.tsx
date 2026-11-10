import { useEffect, useState } from "react";
import { obterItensPaginacao } from "../../../library/paginacao";
import { apiFetch } from "../../../services/api";

interface Avaliacao {
    id: number;
    nota: number;
    descricao: string | null;
    criadaEm: string;
    avaliador: {
        id: number;
        nome: string;
    };
    setor: {
        id: number;
        nome: string;
        sigla: string;
        secretaria: string | null;
    };
}

const FORMATADOR_DATA = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
});

const ITENS_POR_PAGINA = 20;

function formatarData(data: string) {
    return FORMATADOR_DATA.format(new Date(data));
}

function TodasAvaliacoesUsers() {
    const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");
    const [paginaAtual, setPaginaAtual] = useState(1);

    const totalPaginas = Math.ceil(avaliacoes.length / ITENS_POR_PAGINA);
    const inicioPagina = (paginaAtual - 1) * ITENS_POR_PAGINA;
    const avaliacoesPaginadas = avaliacoes.slice(
        inicioPagina,
        inicioPagina + ITENS_POR_PAGINA,
    );

    useEffect(() => {
        const controlador = new AbortController();

        async function carregarAvaliacoes() {
            try {
                const resposta = await apiFetch(
                    "/conversas/avaliacoes",
                    {
                        signal: controlador.signal,
                    },
                );

                if (!resposta.ok) {
                    throw new Error("Não foi possível buscar as avaliações.");
                }

                const dados = await resposta.json() as Avaliacao[];
                setAvaliacoes(dados);
            } catch (error) {
                if (error instanceof DOMException && error.name === "AbortError") {
                    return;
                }

                setErro("Não foi possível carregar as avaliações.");
            } finally {
                if (!controlador.signal.aborted) {
                    setCarregando(false);
                }
            }
        }

        void carregarAvaliacoes();

        return () => controlador.abort();
    }, []);

    return (
        <section
            className="relatorios-logs avaliacoes"
            aria-labelledby="titulo-gerenciar-avaliacoes"
        >
            <header className="relatorios-logs__header">
                <div>
                    <span>AVALIAÇÕES DE USUÁRIOS</span>
                    <h2 id="titulo-gerenciar-avaliacoes">
                        Avaliações dos atendimentos
                    </h2>
                    <p>Acompanhe as avaliações recebidas por cada setor.</p>
                </div>
            </header>

            <div className="relatorios-logs__tabela-container">
                <table className="relatorios-logs__tabela">
                    <thead>
                        <tr>
                            <th scope="col">ID</th>
                            <th scope="col">Avaliador</th>
                            <th scope="col">Nota</th>
                            <th scope="col">Descrição</th>
                            <th scope="col">Data</th>
                            <th scope="col">Setor avaliado</th>
                        </tr>
                    </thead>

                    <tbody>
                        {carregando && (
                            <tr>
                                <td className="relatorios-logs__mensagem" colSpan={6}>
                                    Carregando avaliações...
                                </td>
                            </tr>
                        )}

                        {!carregando && erro && (
                            <tr>
                                <td
                                    className="relatorios-logs__mensagem relatorios-logs__mensagem--erro"
                                    colSpan={6}
                                >
                                    {erro}
                                </td>
                            </tr>
                        )}

                        {!carregando && !erro && avaliacoes.length === 0 && (
                            <tr>
                                <td className="relatorios-logs__mensagem" colSpan={6}>
                                    Nenhuma avaliação registrada nos últimos 30 dias.
                                </td>
                            </tr>
                        )}

                        {!carregando && !erro && avaliacoesPaginadas.map((avaliacao) => (
                            <tr key={avaliacao.id}>
                                <td>{avaliacao.id}</td>
                                <td>
                                    <strong className="relatorios-logs__usuario">
                                        {avaliacao.avaliador.nome}
                                    </strong>
                                </td>
                                <td aria-label={`${avaliacao.nota} de 5`}>
                                    {avaliacao.nota}/5
                                </td>
                                <td>{avaliacao.descricao?.trim() || "Sem descrição"}</td>
                                <td>{formatarData(avaliacao.criadaEm)}</td>
                                <td>
                                    <strong className="relatorios-logs__usuario">
                                        {avaliacao.setor.nome}
                                    </strong>
                                    {avaliacao.setor.secretaria && (
                                        ` (${avaliacao.setor.secretaria})`
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {!carregando && !erro && totalPaginas > 1 && (
                <nav
                    aria-label="Paginação das avaliações"
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

export default TodasAvaliacoesUsers;
