import { useEffect, useState } from "react";
import { obterItensPaginacao } from "../../library/paginacao";
import { apiFetch } from "../../services/api";
import { formatarData } from "./relatoriosLogs";

type RebaixamentoComunidades = {
    rebaixado_por: string,
    pessoa_rebaixada: string,
    comunidade: string,
    rebaixada_em: string
}

const ITENS_POR_PAGINA = 20;

//formatar data e hora da expiração e da criação
function RelatorioRebaixamentoComunidade() {
    const [rebaixamentoComunidades, setRebaixamentoComunidades] = useState<RebaixamentoComunidades[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");
    const [paginaAtual, setPaginaAtual] = useState(1);

    // Seleciona apenas os registros que pertencem à página atual.
    const totalPaginas = Math.ceil(rebaixamentoComunidades.length / ITENS_POR_PAGINA);
    const inicioPagina = (paginaAtual - 1) * ITENS_POR_PAGINA;
    const rebaixamentoComunidadesPaginados = rebaixamentoComunidades.slice(
        inicioPagina,
        inicioPagina + ITENS_POR_PAGINA,
    );

    useEffect(() => {

        const controlador = new AbortController();

        const carregar = async () => {

            try {
                const resposta = await apiFetch('/comunidades/rebaixadoPor', {
                    signal: controlador.signal,
                });

                if (!resposta.ok) {
                    throw new Error(`Falha ao buscar os rebaixamentos (status ${resposta.status})`);
                }

                const dados = await resposta.json() as RebaixamentoComunidades[];

                setRebaixamentoComunidades(dados)
            } catch (erro) {
                if (controlador.signal.aborted) return;

                console.error(erro);
                setErro("Não foi possível carregar o histórico de rebaixamentos.");
            } finally {
                if (!controlador.signal.aborted) {
                    setCarregando(false);
                }
            }
        };

        void carregar();

        return () => controlador.abort();
    }, []);

    return (
        <section className="relatorios-logs" aria-labelledby="titulo-relatorios-rebaixamento">
            <header className="relatorios-logs__header">
                <div>
                    <span>CONTROLE DE REBAIXAMENTOS</span>
                    <h2 id="titulo-relatorios-erros">Logs de rebaixamentos</h2>
                    <p>Acompanhe os rebaixamentos de membros das comunidades</p>
                </div>
            </header>

            <div className="relatorios-logs__tabela-container">
                <table className="relatorios-logs__info">
                    <thead>
                        <tr>
                            <th scope="col">Rebaixada Por</th>
                            <th scope="col">Pessoa rebaixada</th>
                            <th scope="col">Comunidade</th>
                            <th scope="col">Data do rebaixamento</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Informa que os registros ainda estão sendo carregados. */}
                        {carregando && (
                            <tr>
                                <td className="relatorios-logs__mensagem" colSpan={4}>
                                    Carregando relatórios...
                                </td>
                            </tr>
                        )}

                        {/* Apresenta falhas de autenticação ou de comunicação com a API. */}
                        {!carregando && erro && (
                            <tr>
                                <td className="relatorios-logs__mensagem relatorios-logs__mensagem--erro" colSpan={4}>
                                    {erro}
                                </td>
                            </tr>
                        )}

                        {/* Trata uma resposta válida que não contém registros de acesso. */}
                        {!carregando && !erro && rebaixamentoComunidades.length === 0 && (
                            <tr>
                                <td className="relatorios-logs__mensagem" colSpan={4}>
                                    Nenhum acesso registrado.
                                </td>
                            </tr>
                        )}

                        {/* Renderiza apenas os relatórios correspondentes à página atual. */}
                        {!carregando && !erro && rebaixamentoComunidadesPaginados.map((rebaixamento) => (
                            <tr>
                                <td>{rebaixamento.rebaixado_por}</td>
                                <td>{rebaixamento.pessoa_rebaixada}</td>
                                <td>{rebaixamento.comunidade}</td>
                                <td>{formatarData(rebaixamento.rebaixada_em)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Exibe os controles apenas quando existe mais de uma página. */}
            {!carregando && !erro && totalPaginas > 1 && (
                <nav
                    aria-label="Paginação dos relatórios de acesso"
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
                        // Itens textuais indicam um intervalo de páginas omitidas.
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

export default RelatorioRebaixamentoComunidade;