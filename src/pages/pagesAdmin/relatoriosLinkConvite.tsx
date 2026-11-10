import { useEffect, useState } from "react";
import { obterItensPaginacao } from "../../library/paginacao";
import { apiFetch } from "../../services/api";
import { formatarData } from "./relatoriosLogs";

type CriacaoLinkConvite = {
    id: number,
    comunidade: string,
    usuario: string,
    expira_em: string,
    usado: boolean,
    criado_em: string
}

const ITENS_POR_PAGINA = 20;

//formatar data e hora da expiração e da criação
function RelatorioLinkConvite() {
    const [criacaoLinkConvite, setCriacaoLinkConvite] = useState<CriacaoLinkConvite[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");
    const [paginaAtual, setPaginaAtual] = useState(1);

    // Seleciona apenas os registros que pertencem à página atual.
    const totalPaginas = Math.ceil(criacaoLinkConvite.length / ITENS_POR_PAGINA);
    const inicioPagina = (paginaAtual - 1) * ITENS_POR_PAGINA;
    const linkConvitePaginados = criacaoLinkConvite.slice(
        inicioPagina,
        inicioPagina + ITENS_POR_PAGINA,
    );

    useEffect(() => {

        const controlador = new AbortController();

        const carregar = async () => {

            try {
                const resposta = await apiFetch('/comunidades/convites', {
                    signal: controlador.signal,
                });

                if (!resposta.ok) {
                    throw new Error(`Falha ao buscar convites (status ${resposta.status})`);
                }

                const dados = await resposta.json() as CriacaoLinkConvite[];

                setCriacaoLinkConvite(dados)
            } catch (erro) {
                if (controlador.signal.aborted) return;

                console.error(erro);
                setErro("Não foi possível carregar o histórico de criação de links.");
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
        <section className="relatorios-logs" aria-labelledby="titulo-relatorios-links">
            <header className="relatorios-logs__header">
                <div>
                    <span>CONTROLE DE LINKS</span>
                    <h2 id="titulo-relatorios-erros">Criações de links de convite</h2>
                    <p>Acompanhe a criação de links de convite das comunidades</p>
                </div>
            </header>

            <div className="relatorios-logs__tabela-container">
                <table className="relatorios-logs__info">
                    <thead>
                        <tr>
                            <th scope="col">Criador</th>
                            <th scope="col">Comunidade</th>
                            <th scope="col">Data da criação</th>
                            <th scope="col">Expira em</th>
                            <th scope="col">Usado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Informa que os registros ainda estão sendo carregados. */}
                        {carregando && (
                            <tr>
                                <td className="relatorios-logs__mensagem" colSpan={5}>
                                    Carregando relatórios...
                                </td>
                            </tr>
                        )}

                        {/* Apresenta falhas de autenticação ou de comunicação com a API. */}
                        {!carregando && erro && (
                            <tr>
                                <td className="relatorios-logs__mensagem relatorios-logs__mensagem--erro" colSpan={5}>
                                    {erro}
                                </td>
                            </tr>
                        )}

                        {/* Trata uma resposta válida que não contém registros de acesso. */}
                        {!carregando && !erro && criacaoLinkConvite.length === 0 && (
                            <tr>
                                <td className="relatorios-logs__mensagem" colSpan={5}>
                                    Nenhum acesso registrado.
                                </td>
                            </tr>
                        )}

                        {/* Renderiza apenas os relatórios correspondentes à página atual. */}
                        {!carregando && !erro && linkConvitePaginados.map((convite) => (
                            <tr>
                                <td>{convite.usuario}</td>
                                <td>{convite.comunidade}</td>
                                <td>{formatarData(convite.criado_em)}</td>
                                <td>{formatarData(convite.expira_em)}</td>
                                <td>{convite.usado === true ? "Sim" : "Não"}</td>
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

export default RelatorioLinkConvite;