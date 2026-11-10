import { useEffect, useMemo, useState } from "react";
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

const ITENS_POR_PAGINA = 10;

function TodasAvaliacoesSectors() {
    const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");
    const [paginaAtual, setPaginaAtual] = useState(1);

    const avaliacoesPorSetor = useMemo(() => {
        const setores = new Map<number, {
            id: number;
            secretaria: string | null;
            nome: string;
            totalNotas: number;
        }>();

        for (const avaliacao of avaliacoes) {
            const setorExistente = setores.get(avaliacao.setor.id);

            if (setorExistente) {
                setorExistente.totalNotas += avaliacao.nota;
                continue;
            }

            setores.set(avaliacao.setor.id, {
                id: avaliacao.setor.id,
                secretaria: avaliacao.setor.secretaria,
                nome: avaliacao.setor.nome,
                totalNotas: avaliacao.nota,
            });
        }

        return [...setores.values()].sort(
            (primeiro, segundo) => segundo.totalNotas - primeiro.totalNotas,
        );
    }, [avaliacoes]);

    const totalPaginas = Math.ceil(avaliacoesPorSetor.length / ITENS_POR_PAGINA);
    const inicioPagina = (paginaAtual - 1) * ITENS_POR_PAGINA;
    const setoresPaginados = avaliacoesPorSetor.slice(
        inicioPagina,
        inicioPagina + ITENS_POR_PAGINA,
    );
    const mediaTodasNotas = avaliacoesPorSetor.length > 0
        ? avaliacoesPorSetor.reduce((total, setor) => total + setor.totalNotas, 0)
            / avaliacoesPorSetor.length
        : null;

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

    function obterValorMedia(totalNotasSetor: number) {
        if (mediaTodasNotas === null) {
            return {
                texto: "Sem média",
                modificador: "sem-media",
            };
        }

        const mediaArredondada = Math.round(mediaTodasNotas);

        if (totalNotasSetor < mediaArredondada) {
            return {
                texto: "Abaixo da média",
                modificador: "abaixo",
            };
        }

        if (totalNotasSetor === mediaArredondada) {
            return {
                texto: "Na média",
                modificador: "na-media",
            };
        }

        return {
            texto: "Acima da média",
            modificador: "acima",
        };
    }
    
    return (
        <section
            className="avaliacoes-setores"
            aria-labelledby="titulo-gerenciar-avaliacoes"
        >
            <header className="avaliacoes-setores__header">
                <div>
                    <span>NOTAS TOTAIS DOS SETORES</span>
                    <h2 id="titulo-gerenciar-avaliacoes">
                        Avaliações de Atendimento por Setor
                    </h2>
                    <p>Monitor e analise a satisfação dos cidadãos em relação aos setores.</p>
                </div>
                <strong>
                    Média geral: {mediaTodasNotas?.toLocaleString("pt-BR", {
                        maximumFractionDigits: 0,
                    }) ?? "—"}
                </strong>
            </header>

            <div className="avaliacoes-setores__tabela-container">
                <table className="avaliacoes-setores__tabela">
                    <thead>
                        <tr>
                            <th scope="col">Secretaria</th>
                            <th scope="col">Setor</th>
                            <th scope="col">Notas totais</th>
                            <th scope="col">Desempenho</th>
                        </tr>
                    </thead>

                    <tbody>
                        {carregando && (
                            <tr>
                                <td className="avaliacoes-setores__mensagem" colSpan={4}>
                                    Carregando avaliações...
                                </td>
                            </tr>
                        )}

                        {!carregando && erro && (
                            <tr>
                                <td
                                    className="avaliacoes-setores__mensagem avaliacoes-setores__mensagem--erro"
                                    colSpan={3}
                                >
                                    {erro}
                                </td>
                            </tr>
                        )}

                        {!carregando && !erro && avaliacoes.length === 0 && (
                            <tr>
                                <td className="avaliacoes-setores__mensagem" colSpan={4}>
                                    Nenhuma avaliação registrada nos últimos 30 dias.
                                </td>
                            </tr>
                        )}

                        {!carregando && !erro && setoresPaginados.map((setor) => {
                            const situacaoMedia = obterValorMedia(setor.totalNotas);

                            return (
                                <tr key={setor.id}>
                                    <td>{setor.secretaria?.trim() || "Sem secretaria"}</td>
                                    <td>
                                        <strong className="avaliacoes-setores__usuario">
                                            {setor.nome}
                                        </strong>
                                    </td>
                                    <td>{setor.totalNotas}</td>
                                    <td>
                                        <span
                                            className={`avaliacoes-setores__desempenho avaliacoes-setores__desempenho--${situacaoMedia.modificador}`}
                                            title={`Total do setor: ${setor.totalNotas}. Média geral: ${Math.round(mediaTodasNotas ?? 0)}.`}
                                        >
                                            {situacaoMedia.texto}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {!carregando && !erro && totalPaginas > 1 && (
                <nav
                    aria-label="Paginação das avaliações"
                    className="avaliacoes-setores__paginacao"
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

export default TodasAvaliacoesSectors;
