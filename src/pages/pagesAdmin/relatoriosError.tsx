import { useEffect, useState } from "react";
import { obterItensPaginacao } from "../../library/paginacao";
import { apiFetch } from "../../services/api";

// Representa cada registro de erro retornado pela API.
type RelatorioErro = {
    id: number;
    usuario: string;
    tipoUsuario: "admin" | "user" | "funcionario" | "superAdmin";
    erro: "login" | "verificacao";
    horario: string;
};

// Formatadores reutilizados para exibir data e horário no padrão brasileiro.
const FORMATADOR_HORARIO = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
});

const FORMATADOR_DATA = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
});

const ITENS_POR_PAGINA = 20;

// Converte os valores internos da API em textos amigáveis para a tabela.
const NOMES_PERFIS: Record<RelatorioErro["tipoUsuario"], string> = {
    admin: "Administrador",
    superAdmin: "Super administrador",
    user: "Usuário",
    funcionario: "Funcionário",
};

const NOMES_ERROS: Record<RelatorioErro["erro"], string> = {
    login: "Login",
    verificacao: "Verificação",
};

function formatarHorario(data: string) {
    return FORMATADOR_HORARIO.format(new Date(data));
}

function formatarData(data: string) {
    return FORMATADOR_DATA.format(new Date(data));
}

function RelatorioError() {
    const [relatorios, setRelatorios] = useState<RelatorioErro[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");
    const [paginaAtual, setPaginaAtual] = useState(1);

    // Separa somente os registros pertencentes à página selecionada.
    const totalPaginas = Math.ceil(relatorios.length / ITENS_POR_PAGINA);
    const inicioPagina = (paginaAtual - 1) * ITENS_POR_PAGINA;
    const relatoriosPaginados = relatorios.slice(
        inicioPagina,
        inicioPagina + ITENS_POR_PAGINA,
    );

    useEffect(() => {
        // Permite cancelar a requisição caso o componente seja desmontado.
        const controlador = new AbortController();

        async function carregarRelatorios() {
            try {
                const resposta = await apiFetch(
                    "/auth/relatorios-erros",
                    {
                        signal: controlador.signal,
                    },
                );

                if (!resposta.ok) {
                    throw new Error("Não foi possível consultar os relatórios.");
                }

                // Armazena os registros retornados para renderização e paginação.
                const dados = await resposta.json() as RelatorioErro[];
                setRelatorios(dados);
            } catch (error) {
                if (error instanceof DOMException && error.name === "AbortError") {
                    return;
                }

                setErro("Não foi possível carregar o relatório de erros.");
            } finally {
                if (!controlador.signal.aborted) {
                    setCarregando(false);
                }
            }
        }

        void carregarRelatorios();

        // Evita atualizar o estado depois que o componente deixa a tela.
        return () => controlador.abort();
    }, []);

    return (
        <section className="relatorios-logs" aria-labelledby="titulo-relatorios-erros">
            <header className="relatorios-logs__header">
                <div>
                    <span>AUDITORIA DE ERROS</span>
                    <h2 id="titulo-relatorios-erros">Erros de acesso e autenticação (2FA)</h2>
                    <p>Acompanhe o histórico de falhas de login e verificação dos usuários.</p>
                </div>
            </header>

            <div className="relatorios-logs__tabela-container">
                <table className="relatorios-logs__tabela">
                    <thead>
                        <tr>
                            <th scope="col">Usuário</th>
                            <th scope="col">Perfil</th>
                            <th scope="col">Erro</th>
                            <th scope="col">Data e Hora</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Exibe uma única mensagem enquanto os dados estão sendo buscados. */}
                        {carregando && (
                            <tr>
                                <td className="relatorios-logs__mensagem" colSpan={4}>
                                    Carregando relatórios...
                                </td>
                            </tr>
                        )}

                        {/* Informa falhas de autenticação ou de comunicação com a API. */}
                        {!carregando && erro && (
                            <tr>
                                <td className="relatorios-logs__mensagem relatorios-logs__mensagem--erro" colSpan={4}>
                                    {erro}
                                </td>
                            </tr>
                        )}

                        {/* Trata o retorno válido quando ainda não existem registros. */}
                        {!carregando && !erro && relatorios.length === 0 && (
                            <tr>
                                <td className="relatorios-logs__mensagem" colSpan={4}>
                                    Nenhum erro registrado.
                                </td>
                            </tr>
                        )}

                        {/* Renderiza apenas os relatórios correspondentes à página atual. */}
                        {!carregando && !erro && relatoriosPaginados.map((relatorio) => (
                            <tr key={relatorio.id}>
                                <td>
                                    <strong className="relatorios-logs__usuario">
                                        {relatorio.usuario}
                                    </strong>
                                </td>
                                <td>{NOMES_PERFIS[relatorio.tipoUsuario]}</td>
                                <td>{NOMES_ERROS[relatorio.erro]}</td>
                                <td>{formatarHorario(relatorio.horario)} - {formatarData(relatorio.horario)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* A navegação só é necessária quando os registros ocupam mais de uma página. */}
            {!carregando && !erro && totalPaginas > 1 && (
                <nav
                    aria-label="Paginação dos relatórios de erros"
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

export default RelatorioError;
