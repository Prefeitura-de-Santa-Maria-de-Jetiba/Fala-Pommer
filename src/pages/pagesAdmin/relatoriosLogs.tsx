// Exibe os registros de acesso para consulta administrativa.
import { useEffect, useState } from "react";
import { obterItensPaginacao } from "../../library/paginacao";
import { apiFetch } from "../../services/api";

// Representa um registro de entrada e saída retornado pela API.
type RelatorioLog = {
    id: number;
    usuario: string;
    tipoUsuario: "admin" | "user" | "funcionario" | "superAdmin";
    entrada: string;
    saida: string | null;
};

// Mantém a apresentação das datas no padrão e no fuso horário brasileiros.
const FORMATADOR_DATA = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "medium",
});

const ITENS_POR_PAGINA = 20;

// Converte os identificadores de perfil em nomes legíveis na tabela.
const NOMES_PERFIS: Record<RelatorioLog["tipoUsuario"], string> = {
    admin: "Administrador",
    superAdmin: "Super administrador",
    user: "Usuário",
    funcionario: "Funcionário",
};

export function formatarData(data: string) {
    return FORMATADOR_DATA.format(new Date(data));
}

function RelatoriosLogs() {
    const [relatorios, setRelatorios] = useState<RelatorioLog[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");
    const [paginaAtual, setPaginaAtual] = useState(1);

    // Seleciona apenas os registros que pertencem à página atual.
    const totalPaginas = Math.ceil(relatorios.length / ITENS_POR_PAGINA);
    const inicioPagina = (paginaAtual - 1) * ITENS_POR_PAGINA;
    const relatoriosPaginados = relatorios.slice(
        inicioPagina,
        inicioPagina + ITENS_POR_PAGINA,
    );

    useEffect(() => {
        // Permite cancelar a requisição quando o componente for desmontado.
        const controlador = new AbortController();

        async function carregarRelatorios() {
            try {
                const resposta = await apiFetch(
                    "/auth/relatorios-logs",
                    {
                        signal: controlador.signal,
                    },
                );

                if (!resposta.ok) {
                    throw new Error("Não foi possível consultar os relatórios.");
                }

                // Armazena os acessos retornados para exibição e paginação.
                const dados = await resposta.json() as RelatorioLog[];
                setRelatorios(dados);
            } catch (error) {
                if (error instanceof DOMException && error.name === "AbortError") {
                    return;
                }

                setErro("Não foi possível carregar o histórico de acessos.");
            } finally {
                if (!controlador.signal.aborted) {
                    setCarregando(false);
                }
            }
        }

        void carregarRelatorios();

        // Impede atualizações de estado após a saída desta tela.
        return () => controlador.abort();
    }, []);

    return (
        <section className="relatorios-logs" aria-labelledby="titulo-relatorios-logs">
            <header className="relatorios-logs__header">
                <div>
                    <span>CONTROLE DE ACESSOS</span>
                    <h2 id="titulo-relatorios-logs">Entradas e saídas do sistema</h2>
                    <p>Acompanhe o histórico de acesso dos usuários.</p>
                </div>
            </header>

            <div className="relatorios-logs__tabela-container">
                <table className="relatorios-logs__tabela">
                    <thead>
                        <tr>
                            <th scope="col">Usuário</th>
                            <th scope="col">Perfil</th>
                            <th scope="col">Entrada</th>
                            <th scope="col">Saída</th>
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
                        {!carregando && !erro && relatorios.length === 0 && (
                            <tr>
                                <td className="relatorios-logs__mensagem" colSpan={5}>
                                    Nenhum acesso registrado.
                                </td>
                            </tr>
                        )}

                        {/* Renderiza somente os acessos correspondentes à página selecionada. */}
                        {!carregando && !erro && relatoriosPaginados.map((relatorio) => (
                            <tr key={relatorio.id}>
                                <td>
                                    <strong className="relatorios-logs__usuario">
                                        {relatorio.usuario}
                                    </strong>
                                </td>
                                <td>{NOMES_PERFIS[relatorio.tipoUsuario]}</td>
                                <td>{formatarData(relatorio.entrada)}</td>
                                <td>
                                    {/* Sinaliza os acessos cuja saída ainda não foi registrada. */}
                                    {relatorio.saida
                                        ? formatarData(relatorio.saida)
                                        : "Não registrada"}
                                </td>
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

export default RelatoriosLogs;
