import { useEffect, useState } from "react";
import { obterItensPaginacao } from "../../library/paginacao";
import { apiFetch } from "../../services/api";
import { formatarData } from "./relatoriosLogs";

type PromocoesComunidades = {
    promovido_por: string,
    pessoa_promovida: string,
    comunidade: string,
    promovido_em: string
}

const ITENS_POR_PAGINA = 20;

//formatar data e hora da expiração e da criação
function RelatorioPromocaoComunidade() {
    const [promocoesComunidades, setPromocoesComunidades] = useState<PromocoesComunidades[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");
    const [paginaAtual, setPaginaAtual] = useState(1);

    // Seleciona apenas os registros que pertencem à página atual.
    const totalPaginas = Math.ceil(promocoesComunidades.length / ITENS_POR_PAGINA);
    const inicioPagina = (paginaAtual - 1) * ITENS_POR_PAGINA;
    const promocoesComunidadesPaginados = promocoesComunidades.slice(
        inicioPagina,
        inicioPagina + ITENS_POR_PAGINA,
    );

    useEffect(() => {

        const controlador = new AbortController();

        const carregar = async () => {

            try {
                const resposta = await apiFetch('/comunidades/promovidoPor', {
                    signal: controlador.signal,
                });

                if (!resposta.ok) {
                    throw new Error(`Falha ao buscar as promoções (status ${resposta.status})`);
                }

                const dados = await resposta.json() as PromocoesComunidades[];

                setPromocoesComunidades(dados)
            } catch (erro) {
                if (controlador.signal.aborted) return;

                console.error(erro);
                setErro("Não foi possível carregar o histórico de promoções.");
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
        <section className="relatorios-logs" aria-labelledby="titulo-relatorios-promocoes">
            <header className="relatorios-logs__header">
                <div>
                    <span>CONTROLE DE PROMOÇÕES</span>
                    <h2 id="titulo-relatorios-erros">Logs de promoções</h2>
                    <p>Acompanhe as promoções de membros das comunidades</p>
                </div>
            </header>

            <div className="relatorios-logs__tabela-container">
                <table className="relatorios-logs__info">
                    <thead>
                        <tr>
                            <th scope="col">Promovido Por</th>
                            <th scope="col">Pessoa promovida</th>
                            <th scope="col">Comunidade</th>
                            <th scope="col">Data da promoção</th>
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
                        {!carregando && !erro && promocoesComunidades.length === 0 && (
                            <tr>
                                <td className="relatorios-logs__mensagem" colSpan={4}>
                                    Nenhum acesso registrado.
                                </td>
                            </tr>
                        )}

                        {/* Renderiza apenas os relatórios correspondentes à página atual. */}
                        {!carregando && !erro && promocoesComunidadesPaginados.map((promocao) => (
                            <tr>
                                <td>{promocao.promovido_por}</td>
                                <td>{promocao.pessoa_promovida}</td>
                                <td>{promocao.comunidade}</td>
                                <td>{formatarData(promocao.promovido_em)}</td>
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

export default RelatorioPromocaoComunidade;