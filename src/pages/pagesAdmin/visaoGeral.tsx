// Exibe um resumo geral das informações administrativas.
import { useEffect, useMemo, useState, useRef } from "react";
import { Bar, Line } from "react-chartjs-2";
import gsap from 'gsap';
import { apiFetch } from "../../services/api";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    type ChartData,
    type ChartOptions,
    BarElement,
} from "chart.js";

// Registra os recursos do Chart.js utilizados pelos gráficos desta página.
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler,
);

// Tipos usados pelas respostas das APIs exibidas no painel.
type MesLogin = {
    mes: number;
    nome: string;
    quantidade: number;
};

type RespostaLoginsMensais = {
    ano: number;
    meses: MesLogin[];
};

type QuantUsuarioCategoria = {
    tipo_usuario: "admin" | "user" | "funcionario" | "superAdmin";
    _count: {
        id: number;
    };
};

type UsuarioResumo = {
    desativado_em?: string | null;
};

type EventoAdministrativoResumo = {
    acao: "usuario_desativado" | "usuario_reativado";
    criado_em: string;
};

type MesDesativacao = {
    chave: string;
    nome: string;
    quantidade: number;
};

// Os agrupamentos mensais seguem o horário oficial usado pelo sistema.
const FUSO_HORARIO = "America/Sao_Paulo";
const formatadorAnoMes = new Intl.DateTimeFormat("en-US", {
    timeZone: FUSO_HORARIO,
    year: "numeric",
    month: "2-digit",
});
const formatadorNomeMes = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    month: "short",
});

// Extrai ano e mês de uma data e cria uma chave estável no formato AAAA-MM.
function obterAnoMes(data: Date) {
    const partes = formatadorAnoMes.formatToParts(data);
    const ano = partes.find((parte) => parte.type === "year")?.value;
    const mes = partes.find((parte) => parte.type === "month")?.value;

    if (!ano || !mes) return null;

    return {
        ano: Number(ano),
        mes: Number(mes),
        chave: `${ano}-${mes}`,
    };
}

// Cria os seis meses mais recentes e contabiliza somente eventos de desativação.
function criarHistoricoDesativacoes(eventos: EventoAdministrativoResumo[]): MesDesativacao[] {
    const atual = obterAnoMes(new Date());

    if (!atual) return [];

    const meses = Array.from({ length: 6 }, (_, indice) => {
        const data = new Date(Date.UTC(atual.ano, atual.mes - 1 - (5 - indice), 1));
        const ano = data.getUTCFullYear();
        const mes = data.getUTCMonth() + 1;
        const nomeFormatado = formatadorNomeMes.format(data).replace(".", "");

        return {
            chave: `${ano}-${String(mes).padStart(2, "0")}`,
            nome: nomeFormatado.charAt(0).toUpperCase() + nomeFormatado.slice(1),
            quantidade: 0,
        };
    });

    // Facilita o acesso ao mês correto durante a contagem dos eventos.
    const mesesPorChave = new Map(meses.map((mes) => [mes.chave, mes]));

    for (const evento of eventos) {
        if (evento.acao !== "usuario_desativado") continue;

        const dataDesativacao = new Date(evento.criado_em);
        if (Number.isNaN(dataDesativacao.getTime())) continue;

        const anoMes = obterAnoMes(dataDesativacao);
        const mes = anoMes ? mesesPorChave.get(anoMes.chave) : undefined;

        if (mes) mes.quantidade += 1;
    }

    return meses;
}

// Define os valores necessários para animar os indicadores numéricos.
interface CounterProps {
    endValue: number;
    duration?: number;
}

interface Avaliacao {
    id: number;
    nota: number;
    descricao: string | null;
    criadaEm: string;
    setor: {
        id: number;
        nome: string;
        sigla: string;
    };
}

// Permite que o painel solicite a abertura da área de usuários.
interface VisaoGeralProps {
    onVerUsuarios: () => void;
    onVerAvaliacoes: () => void;
}

export const NumberCounter: React.FC<CounterProps> = ({ endValue, duration = 2 }) => {
    // Referência usada para atualizar o número durante a animação.
    const numberRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const element = numberRef.current;
        if (!element) return;

        // Objeto proxy para o GSAP animar o valor numérico
        const proxy = { val: 0 };

        const tween = gsap.to(proxy, {
        val: endValue,
        duration: duration,
        ease: 'power1.out',
        onUpdate: () => {
            // Atualiza o textContent diretamente no DOM a cada frame
            element.textContent = Math.round(proxy.val).toLocaleString('pt-BR');
        },
        });

        return () => {
        tween.kill(); // Limpa a animação ao desmontar o componente
        };
    }, [endValue, duration]);

    return <strong ref={numberRef}>0</strong>;
}

// Configuração do gráfico anual de acessos ao sistema.
const opcoesLogin: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false, // Permite que o gráfico use toda a altura do container pai
    animations: {
        tension: {
            duration: 1000,
            easing: "easeOutQuart",
            from: .6,
            to: 0,
            loop: true         
        },
    },
    plugins: {
        legend: {
            position: "top", // Posição da legenda ('top', 'bottom', 'left', 'right')
        },
        tooltip: {
            enabled: true, // Ativa os balões com informações ao passar o mouse
            callbacks: {
                label: (contexto) => `${contexto.parsed.y} login${contexto.parsed.y === 1 ? "" : "s"}`,
            },
        },
    },
    scales: {
        y: {
            beginAtZero: true, // Garante que o eixo vertical comece sempre no número 0
            ticks: {
                precision: 0,
            },
            title: {
                display: true,
                text: "Quantidade de logins",
            },
        },
    },
};

// Configuração do gráfico que compara a quantidade por categoria de usuário.
const opcoesUsuarios: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    // Ignora valores nulos para centralizar cada barra na categoria correspondente.
    skipNull: true,

    plugins: {
        legend: {
            position: "top"
        },

        tooltip: {
            enabled: true
        }
    },

    scales: {
        y: {
            beginAtZero: true,

            ticks: {
                precision: 0
            },

            title: {
                display: true,
                text: "Quantidade de usuários"
            }
        }
    }
};

// Configuração do minigráfico responsivo do histórico de desativações.
const opcoesHistoricoDesativacoes: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            display: false,
        },
        tooltip: {
            callbacks: {
                label: (contexto) => (
                    `${contexto.parsed.y} desativação${contexto.parsed.y === 1 ? "" : "ões"}`
                ),
            },
        },
    },
    layout: {
        padding: {
            top: 18,
            left: 8,
            right: 8,
        },
    },
    scales: {
        x: {
            border: {
                display: false,
            },
            grid: {
                display: false,
            },
            ticks: {
                color: "#6e7e99",
                font: {
                    size: 13,
                    weight: 600,
                },
                maxRotation: 0,
                minRotation: 0,
            },
        },
        y: {
            display: false,
            beginAtZero: true,
            grace: "25%",
        },
    },
};

function VisaoGeral({ onVerUsuarios, onVerAvaliacoes }: VisaoGeralProps) {
    // Estados alimentados pelas consultas da visão geral.
    const [resultado, setResultado] = useState<RespostaLoginsMensais | null>(null);
    const [carregando, setCarregando] = useState(true);
    const [quantUsuarios, setQuantUsuarios] = useState(0);
    const [usuarios, setUsuarios] = useState<UsuarioResumo[]>([]);
    const [eventosAdministrativos, setEventosAdministrativos] = useState<EventoAdministrativoResumo[]>([]);
    const [avaliacao, setAvaliacao] = useState<Avaliacao[]>([]);
    const [quantSetores, setQuantSetores] = useState(0);
    const [quantSecretarias, setQuantSecretarias] = useState(0);
    const [quantUsuariosCategoria, setQuantUsuariosCategoria] = useState<QuantUsuarioCategoria[]>([]);
    const [erro, setErro] = useState("");
    // Calcula o ano conforme o fuso horário oficial adotado pelo sistema.
    const anoAtual = Number(
        new Intl.DateTimeFormat("pt-BR", {
            timeZone: "America/Sao_Paulo",
            year: "numeric",
        }).format(new Date()),
    );

    // Busca os logins mensais do ano atual e cancela a requisição ao desmontar.
    useEffect(() => {
        const controlador = new AbortController();

        async function carregarLoginsMensais() {
            try {
                const resposta = await apiFetch(
                    `/auth/logins-por-mes?ano=${anoAtual}`,
                    {
                        signal: controlador.signal,
                    },
                );

                if (!resposta.ok) {
                    throw new Error("Não foi possível consultar os logins mensais.");
                }

                const dados = await resposta.json() as RespostaLoginsMensais;
                setResultado(dados);
                setErro("");
            } catch (error) {
                if (error instanceof DOMException && error.name === "AbortError") {
                    return;
                }

                setErro("Não foi possível carregar a quantidade de logins.");
            } finally {
                if (!controlador.signal.aborted) {
                    setCarregando(false);
                }
            }
        }

        void carregarLoginsMensais();

        return () => controlador.abort();
    }, [anoAtual]);

    // Busca o total geral de usuários cadastrados.
    useEffect(() => {
        async function carregarQuantUsuarios() {
            try {
                const resposta = await apiFetch("/auth/quantidade-usuarios");

                if (!resposta.ok) {
                    throw new Error("Não foi possível buscar os usuários.");
                }

                const total: number = await resposta.json();
                setQuantUsuarios(total);
            } catch (erro) {
                console.error("Erro ao buscar quantidade de usuários:", erro);
            }
        }

        void carregarQuantUsuarios();
    }, []);

    // Busca as secretarias e usa o tamanho da lista como total.
    useEffect(() => {
        async function carregarQuantSecretarias() {
            try {
                const resposta = await apiFetch("/secretaria");

                if (!resposta.ok) {
                    throw new Error("Não foi possível buscar as secretarias.");
                }

                const secretaria = await resposta.json() as unknown[];
                setQuantSecretarias(secretaria.length);
            } catch (erro) {
                console.error("Erro ao buscar quantidade de secretarias:", erro);
            }
        }

        void carregarQuantSecretarias();
    }, []);

    // Busca os setores e usa o tamanho da lista como total.
    useEffect(() => {
        async function carregarQuantSetores() {
            try {
                const resposta = await apiFetch("/setores");

                if (!resposta.ok) {
                    throw new Error("Não foi possível buscar os setores.");
                }

                const setores = await resposta.json() as unknown[];
                setQuantSetores(setores.length);
            } catch (erro) {
                console.error("Erro ao buscar quantidade de setores:", erro);
            }
        }

        void carregarQuantSetores();
    }, []);

    // Busca os totais agrupados por perfil para o gráfico de barras.
    useEffect(() => {
        async function carregarQuantUsuariosCategoria() {
            try {
                const resposta = await apiFetch(
                    "/auth/quantidade-usuarios-categoria",
                );

                if (!resposta.ok) {
                    throw new Error("Não foi possível buscar os usuários.");
                }

                const dados = await resposta.json() as QuantUsuarioCategoria[];
                setQuantUsuariosCategoria(dados);
            } catch (erro) {
                console.log("Erro ao buscar quantidade de usuarios por categoria:", erro);
            }
        }

        void carregarQuantUsuariosCategoria();
    }, []);

    // Busca todos os usuários para identificar quais permanecem desativados.
    useEffect(() => {
        async function carregarUsuariosDesativados() {
            try {
                const resposta = await apiFetch("/usuarios");

                if (!resposta.ok) {
                    throw new Error("Não foi possível buscar os usuários desativados.");
                }

                const dados = await resposta.json() as UsuarioResumo[];
                setUsuarios(dados);
                setQuantUsuarios(dados.length);
            } catch (erro) {
                console.error("Erro ao buscar usuários desativados:", erro);
            }
        }

        void carregarUsuariosDesativados();
    }, []);

    // Preserva no gráfico desativações de usuários que já foram reativados.
    useEffect(() => {
        async function carregarHistoricoDesativacoes() {
            try {
                const resposta = await apiFetch(
                    "/usuarios/historico-administrativo",
                );

                if (!resposta.ok) {
                    throw new Error("Não foi possível buscar o histórico de desativações.");
                }

                const dados = await resposta.json() as EventoAdministrativoResumo[];
                setEventosAdministrativos(dados);
            } catch (erro) {
                console.error("Erro ao buscar histórico de desativações:", erro);
            }
        }

        void carregarHistoricoDesativacoes();
    }, []);

    useEffect(() => {
        async function carregarAvaliacoes() {
            try {
                const resposta = await apiFetch("/conversas/avaliacoes");

                if (!resposta.ok) {
                    throw new Error("Não foi possivel buscar as avaliações")
                }

                const dados = await resposta.json() as Avaliacao[];
                setAvaliacao(dados);
            } catch (erro) {
                console.error("Erro ao buscar as avaliações:", erro);
            }
        }

        void carregarAvaliacoes();
    }, [])

    const avaliacoesPorSetor = useMemo(() => {
        const setores = new Map<number, {
            id: number;
            nome: string;
            totalAvaliacoes: number;
        }>();

        for (const item of avaliacao) {
            const setorExistente = setores.get(item.setor.id);

            if (setorExistente) {
                setorExistente.totalAvaliacoes += item.nota;
                continue;
            }

            setores.set(item.setor.id, {
                id: item.setor.id,
                nome: item.setor.nome,
                totalAvaliacoes: item.nota,
            });
        }

        return [...setores.values()].sort(
            (primeiro, segundo) => segundo.totalAvaliacoes - primeiro.totalAvaliacoes,
        );
    }, [avaliacao]);

    const quatroSetoresMaisBemAvaliados = avaliacoesPorSetor.slice(0, 4);
    const totalOutrosSetores = avaliacoesPorSetor
        .slice(4)
        .reduce(
            (total, setor) => total + setor.totalAvaliacoes,
            0,
        );
    const maiorTotalAvaliacoes = Math.max(
        quatroSetoresMaisBemAvaliados[0]?.totalAvaliacoes ?? 0,
        totalOutrosSetores,
    );
    const quantidadeAtendimentosCincoEstrelas = avaliacao.filter(
        (item) => item.nota === 5,
    ).length;
    const quantidadePioresAvaliacoes = avaliacao.filter(
        (item) => item.nota === 1 || item.nota === 2,
    ).length;
    const quantidadeMelhoresAvaliacoes = avaliacao.filter(
        (item) => item.nota === 4 || item.nota === 5,
    ).length;
    const porcentagemAtendimentosCincoEstrelas = avaliacao.length > 0
        ? Math.round(
            (quantidadeAtendimentosCincoEstrelas / avaliacao.length) * 100,
        )
        : 0;

    // Mantém apenas usuários cujo campo de desativação está preenchido.
    const usuariosDesativados = useMemo(
        () => usuarios.filter((usuario) => Boolean(usuario.desativado_em)),
        [usuarios],
    );
    const quantUsuariosDesativados = usuariosDesativados.length;

    // Monta a série mensal usada no gráfico e na comparação entre os meses.
    const historicoDesativacoes = useMemo(
        () => criarHistoricoDesativacoes(eventosAdministrativos),
        [eventosAdministrativos],
    );

    // Os dois últimos itens representam, respectivamente, o mês atual e o anterior.
    const desativacoesMesAtual = historicoDesativacoes.at(-1)?.quantidade ?? 0;
    const desativacoesMesAnterior = historicoDesativacoes.at(-2)?.quantidade ?? 0;

    // Define a tendência visual a partir da diferença entre os dois meses.
    const tendencia = desativacoesMesAtual < desativacoesMesAnterior
        ? "diminuindo"
        : desativacoesMesAtual > desativacoesMesAnterior
            ? "aumentando"
            : "estavel";
    const rotuloTendencia = tendencia === "diminuindo"
        ? "Diminuindo"
        : tendencia === "aumentando"
            ? "Aumentando"
            : "Estável";
    const iconeTendencia = tendencia === "diminuindo"
        ? "↓"
        : tendencia === "aumentando"
            ? "↑"
            : "→";

    // Calcula a variação percentual absoluta em relação ao mês anterior.
    // Se o mês anterior for zero, não existe uma base válida para a divisão.
    const variacaoPercentualDesativacoes = desativacoesMesAnterior > 0
        ? Math.abs(
            ((desativacoesMesAtual - desativacoesMesAnterior) / desativacoesMesAnterior) * 100,
        )
        : desativacoesMesAtual === 0
            ? 0
            : null;
    const porcentagemFormatada = variacaoPercentualDesativacoes === null
        ? null
        : new Intl.NumberFormat("pt-BR", {
            maximumFractionDigits: 1,
        }).format(variacaoPercentualDesativacoes);
    const textoVariacaoPercentual = porcentagemFormatada === null
        ? "Sem base no mês anterior"
        : tendencia === "aumentando"
            ? `${porcentagemFormatada}% de aumento`
            : tendencia === "diminuindo"
                ? `${porcentagemFormatada}% de redução`
                : "0% de variação";

    // Limita o preenchimento do círculo a 100%, mesmo em aumentos superiores.
    const preenchimentoVariacao = Math.min(
        variacaoPercentualDesativacoes ?? 0,
        100,
    );
    // Gera uma descrição textual do gráfico para tecnologias assistivas.
    const descricaoHistorico = historicoDesativacoes
        .map((mes) => `${mes.nome}: ${mes.quantidade}`)
        .join(", ");

    // Converte o histórico para o formato esperado pelo Chart.js.
    const dadosHistoricoDesativacoes = useMemo<ChartData<"line">>(() => ({
        labels: historicoDesativacoes.map((mes) => mes.nome),
        datasets: [
            {
                data: historicoDesativacoes.map((mes) => mes.quantidade),
                borderColor: "#1351b4",
                backgroundColor: "rgba(19, 81, 180, 0.14)",
                borderWidth: 4,
                fill: true,
                tension: 0,
                pointRadius: 5,
                pointHoverRadius: 7,
                pointBackgroundColor: "#ffffff",
                pointBorderColor: "#1351b4",
                pointBorderWidth: 4,
            },
        ],
    }), [historicoDesativacoes]);

    // Retorna zero enquanto uma categoria não estiver presente na resposta da API.
    function obterQuantidadeCategoria(
        tipo: QuantUsuarioCategoria["tipo_usuario"],
    ) {
        return quantUsuariosCategoria.find(
            (categoria) => categoria.tipo_usuario === tipo,
        )?._count.id ?? 0;
    }

    // Converte os logins mensais para a série do gráfico anual.
    const dadosLogin = useMemo<ChartData<"line">>(() => ({
        labels: resultado?.meses.map((mes) => mes.nome) ?? [],
        datasets: [
            {
                label: `Logins em ${resultado?.ano ?? anoAtual}`, //Título da legenda
                data: resultado?.meses.map((mes) => mes.quantidade) ?? [], //Eixo Y (valores numéricos)
                borderColor: "rgb(59, 130, 246)",
                backgroundColor: "rgba(59, 130, 246, 0.18)",
                fill: true, //Define se a área sob a linha deve ser preenchida
                tension: 0.3, //Curvatura da linha (0 = linhas retas, valores maiores = mais curvas)
                pointRadius: 5, //Tamanho dos pontos nos nós dos dados
                pointHoverRadius: 7, //Tamanho do ponto quando o mouse passa por cima
            },
        ],
    }), [anoAtual, resultado]);

    // Cada dataset preenche somente a posição da categoria que representa.
    const dadosUsuarios: ChartData<"bar"> = {
        labels: [
            "Super Administrador",
            "Administrador",
            "Funcionário",
            "Usuário"
        ],

        datasets: [
            {
                label: "Super administradores",

                data: [
                    obterQuantidadeCategoria("superAdmin"), //super admin
                    null,     // Admin
                    null,  // Funcionário
                    null   // Usuário
                ],

                backgroundColor: "rgba(52, 99, 175, 0.25)",
                borderColor: "rgb(52, 99, 175)",
                borderWidth: 1,
                borderRadius: 6
            },
            {
                label: "Administradores",

                data: [
                    null,  // super admin
                    obterQuantidadeCategoria("admin"),     // Admin
                    null,  // Funcionário
                    null   // Usuário
                ],

                backgroundColor: "rgba(175, 122, 52, 0.25)",
                borderColor: "rgb(175, 111, 52)",
                borderWidth: 1,
                borderRadius: 6
            },
            {
                label: "Funcionários",

                data: [
                    null,  //super admin
                    null,  // Admin
                    obterQuantidadeCategoria("funcionario"),   // Funcionário
                    null  // Usuário
                ],

                backgroundColor: "rgba(26, 151, 10, 0.25)",
                borderColor: "rgb(26, 151, 10)",
                borderWidth: 1,
                borderRadius: 6
            },
            {
                label: "Usuários",

                data: [
                    null,  //super admin
                    null,  // Admin
                    null,   // Funcionário
                    obterQuantidadeCategoria("user")    // Usuário
                ],

                backgroundColor: "rgba(187, 17, 17, 0.25)",
                borderColor: "rgb(187, 17, 17)",
                borderWidth: 1,
                borderRadius: 6
            }
        ]
    };

    return (
        <>
            {/* Cards com os totais principais do painel. */}
            <div className="container-cards">
                <div className="cards card-usuarios">
                    <div className="icone-card">
                        <svg width="24" height="24" fill="currentColor" className="icone bi bi-people" viewBox="0 0 16 16">
                            <path d="M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1zm-7.978-1L7 12.996c.001-.264.167-1.03.76-1.72C8.312 10.629 9.282 10 11 10c1.717 0 2.687.63 3.24 1.276.593.69.758 1.457.76 1.72l-.008.002-.014.002zM11 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4m3-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0M6.936 9.28a6 6 0 0 0-1.23-.247A7 7 0 0 0 5 9c-4 0-5 3-5 4q0 1 1 1h4.216A2.24 2.24 0 0 1 5 13c0-1.01.377-2.042 1.09-2.904.243-.294.526-.569.846-.816M4.92 10A5.5 5.5 0 0 0 4 13H1c0-.26.164-1.03.76-1.724.545-.636 1.492-1.256 3.16-1.275ZM1.5 5.5a3 3 0 1 1 6 0 3 3 0 0 1-6 0m3-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4"/>
                        </svg>
                    </div>
                    <div className="info-cards">
                        <small>USUÁRIOS</small>
                        <NumberCounter endValue={quantUsuarios} />
                    </div>
                </div>

                <div className="cards card-setores">
                    <div className="icone-card">
                        <svg width="24" height="24" fill="white" className="bi bi-building" viewBox="0 0 16 16">
                            <path d="M4 2.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5zm3.5-.5a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5zM4 5.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5zM7.5 5a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5zm2.5.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5zM4.5 8a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5zm2.5.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5zm3.5-.5a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5z"/>
                            <path d="M2 1a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1zm11 0H3v14h3v-2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5V15h3z"/>
                        </svg>
                    </div>
                    <div className="info-cards">
                        <small>SECRETARIAS</small>
                        <NumberCounter endValue={quantSecretarias} />
                    </div>
                </div>

                <div className="cards card-setores">
                    <div className="icone-card">
                        <svg width="24" height="24" fill="currentColor" className="icone bi bi-buildings" viewBox="0 0 16 16">
                            <path d="M14.763.075A.5.5 0 0 1 15 .5v15a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5V14h-1v1.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V10a.5.5 0 0 1 .342-.474L6 7.64V4.5a.5.5 0 0 1 .276-.447l8-4a.5.5 0 0 1 .487.022M6 8.694 1 10.36V15h5zM7 15h2v-1.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5V15h2V1.309l-7 3.5z"/>
                            <path d="M2 11h1v1H2zm2 0h1v1H4zm-2 2h1v1H2zm2 0h1v1H4zm4-4h1v1H8zm2 0h1v1h-1zm-2 2h1v1H8zm2 0h1v1h-1zm2-2h1v1h-1zm0 2h1v1h-1zM8 7h1v1H8zm2 0h1v1h-1zm2 0h1v1h-1zM8 5h1v1H8zm2 0h1v1h-1zm2 0h1v1h-1zm0-2h1v1h-1z"/>
                        </svg>
                    </div>
                    <div className="info-cards">
                        <small>SETORES</small>
                        <NumberCounter endValue={quantSetores} />
                    </div>
                </div>
            </div>

            {/* Total atual, variação mensal e histórico de desativações. */}
            <div className="container-dashboard">
                <section className="usuarios-desativados-card" aria-labelledby="titulo-desativados">
                    {/* Indicador circular da variação em relação ao mês anterior. */}
                    <div className="indicador-desativados">
                        <svg
                            className="grafico-circular"
                            viewBox="0 0 120 120"
                            role="img"
                            aria-label={`${textoVariacaoPercentual} em relação ao mês anterior`}
                        >
                            <circle
                                className="circulo-fundo"
                                cx="60"
                                cy="60"
                                r="52"
                            />
                            <circle
                                className="circulo-progresso"
                                cx="60"
                                cy="60"
                                r="52"
                                pathLength="100"
                                strokeDasharray={`${preenchimentoVariacao} ${100 - preenchimentoVariacao}`}
                            />
                        </svg>
                        <div className="icone-usuario-desativado">
                            <svg
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                            >
                                <circle cx="10" cy="7" r="4"></circle>
                                <path d="M3 21v-2a7 7 0 0 1 7-7c1.2 0 2.4.3 3.4.8"></path>
                                <circle cx="18" cy="18" r="4"></circle>
                                <path d="M16.5 18h3"></path>
                            </svg>
                        </div>
                    </div>
                    <div className="informacoes-desativados">
                        <p className="categoria-card">CONTROLE DE ACESSOS</p>
                        <h2 id="titulo-desativados">
                            Usuários desativados
                        </h2>
                        <strong className="quantidade-desativados">
                            <NumberCounter endValue={quantUsuariosDesativados} />
                        </strong>
                        <div className="detalhes-desativados">
                            <span className="porcentagem-desativados">
                                {textoVariacaoPercentual}
                            </span>
                            <span className={`variacao-desativados variacao-desativados--${tendencia}`}>
                                <span aria-hidden="true">{iconeTendencia}</span>
                                <NumberCounter endValue={desativacoesMesAtual} /> neste mês
                            </span>
                        </div>
                    </div>
                    {/* Série dos últimos seis meses e atalho para consultar usuários. */}
                    <div className="historico-desativados">
                        <div className="cabecalho-historico">
                            <div>
                                <p className="titulo-historico">
                                    Últimos 6 meses
                                </p>
                                <span className="descricao-historico">
                                    Histórico de desativações
                                </span>
                            </div>
                            <span className={`status-historico status-historico--${tendencia}`}>
                                {rotuloTendencia}
                            </span>
                        </div>
                        <div
                            className="grafico-historico"
                            role="img"
                            aria-label={`Desativações nos últimos seis meses. ${descricaoHistorico}`}
                        >
                            <Line
                                data={dadosHistoricoDesativacoes}
                                options={opcoesHistoricoDesativacoes}
                            />
                        </div>
                        <button
                            className="botao-ver-usuarios"
                            type="button"
                            onClick={onVerUsuarios}
                        >
                            <span>Ver usuários</span>
                            <svg
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                            >
                                <path d="M9 18l6-6-6-6"></path>
                            </svg>
                        </button>
                    </div>
                </section>
                {/* Gráfico de logins realizados durante o ano atual. */}
                <div className="grafico-card grafico-card--logins">
                    <div className="grafico-card-header">
                        <div>
                            <span className="grafico-card-legenda">ACESSOS AO SISTEMA</span>
                            <h2>Logins mensais</h2>
                        </div>
                        <strong>{resultado?.ano ?? anoAtual}</strong>
                    </div>
                    {/* Alterna entre os estados de carregamento, erro e gráfico pronto. */}
                    {carregando && <p className="grafico-status">Carregando dados do gráfico...</p>}
                    {erro && <p className="grafico-status grafico-status-erro" role="alert">{erro}</p>}
                    {!carregando && !erro && (
                        <div className="grafico-container">
                            <Line data={dadosLogin} options={opcoesLogin} />
                        </div>
                    )}
                </div>
                {/* Distribuição do total de usuários por categoria. */}
                <div className="grafico-card grafico-card--usuarios">
                    <div className="grafico-card-header">
                        <div>
                            <span className="grafico-card-legenda">
                                TOTAL DE USUÁRIOS
                            </span>
                            <h2>Categorias de usuários</h2>
                        </div>
                        <NumberCounter endValue={quantUsuarios}/>
                    </div>
                    <div className="grafico-container grafico-container--barras">
                        <Bar
                            data={dadosUsuarios}
                            options={opcoesUsuarios}
                        />
                    </div>
                </div>

                <section
                    className="atendimentos-setor-card"
                    aria-labelledby="titulo-atendimentos-setor"
                >
                    <header className="atendimentos-cabecalho">
                        <div className="atendimentos-titulos">
                            <span className="atendimentos-categoria">
                                AVALIAÇÕES DE USUÁRIOS
                            </span>

                            <h2 id="titulo-atendimentos-setor">
                                Avaliações de atendimentos
                            </h2>

                            <p>
                                Avaliações nos ultimos 30 dias
                            </p>
                        </div>

                        <button className="botao-periodo" type="button">
                            <svg
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                            >
                                <rect x="3" y="5" width="18" height="16" rx="2"></rect>
                                <path d="M16 3v4M8 3v4M3 10h18"></path>
                            </svg>

                            <span>Últimos 30 dias</span>
                        </button>
                    </header>

                    <div className="atendimentos-conteudo">

                        <div className="ranking-setores">
                            <h3>Avaliações dos setores</h3>

                            <ul className="lista-setores">
                                {quatroSetoresMaisBemAvaliados.map((setor) => (
                                    <li className="setor-item" key={setor.id}>
                                        <div className="setor-informacoes">
                                            <span>{setor.nome}</span>
                                            <strong>{setor.totalAvaliacoes}</strong>
                                        </div>

                                        <div
                                            className="barra-fundo"
                                            role="progressbar"
                                            aria-label={`${setor.nome}: ${setor.totalAvaliacoes} pontos em avaliações`}
                                            aria-valuemin={0}
                                            aria-valuemax={maiorTotalAvaliacoes}
                                            aria-valuenow={setor.totalAvaliacoes}
                                        >
                                            <span
                                                className="barra-preenchimento"
                                                style={{
                                                    width: maiorTotalAvaliacoes > 0
                                                        ? `${(setor.totalAvaliacoes / maiorTotalAvaliacoes) * 100}%`
                                                        : "0%",
                                                }}
                                            ></span>
                                        </div>
                                    </li>
                                ))}

                                {totalOutrosSetores > 0 && (
                                    <li className="setor-item">
                                        <div className="setor-informacoes">
                                            <span>Outros</span>
                                            <strong>{totalOutrosSetores}</strong>
                                        </div>

                                        <div
                                            className="barra-fundo"
                                            role="progressbar"
                                            aria-label={`Outros: ${totalOutrosSetores} pontos em avaliações`}
                                            aria-valuemin={0}
                                            aria-valuemax={maiorTotalAvaliacoes}
                                            aria-valuenow={totalOutrosSetores}
                                        >
                                            <span
                                                className="barra-preenchimento"
                                                style={{
                                                    width: maiorTotalAvaliacoes > 0
                                                        ? `${(totalOutrosSetores / maiorTotalAvaliacoes) * 100}%`
                                                        : "0%",
                                                }}
                                            ></span>
                                        </div>
                                    </li>
                                )}

                            </ul>
                        </div>

                        <aside className="resumo-atendimentos">
                            <div className="resolucao">
                                <h3>Atendimentos perfeitos</h3>

                                <div className="grafico-resolucao">
                                    <svg
                                        viewBox="0 0 120 120"
                                        role="img"
                                        aria-label={`${porcentagemAtendimentosCincoEstrelas}% dos atendimentos receberam 5 estrelas`}
                                    >
                                        <circle
                                            className="circulo-resolucao-fundo"
                                            cx="60"
                                            cy="60"
                                            r="50"
                                        ></circle>

                                        <circle
                                            className="circulo-resolucao-progresso"
                                            cx="60"
                                            cy="60"
                                            r="50"
                                            pathLength="100"
                                            strokeDasharray={`${porcentagemAtendimentosCincoEstrelas} ${100 - porcentagemAtendimentosCincoEstrelas}`}
                                        ></circle>
                                    </svg>

                                    <strong>{porcentagemAtendimentosCincoEstrelas}%</strong>
                                </div>
                            </div>

                            <div className="metricas-atendimentos">

                                <div className="metrica-item">
                                    <span
                                        className="metrica-icone metrica-icone-piores"
                                        aria-hidden="true"
                                    ></span>

                                    <div>
                                        <strong>{quantidadePioresAvaliacoes}</strong>
                                        <span>Piores avaliações</span>
                                    </div>
                                </div>

                                <div className="metrica-item">
                                    <span
                                        className="metrica-icone metrica-icone-melhores"
                                        aria-hidden="true"
                                    ></span>

                                    <div>
                                        <strong>{quantidadeMelhoresAvaliacoes}</strong>
                                        <span>Melhores avaliações</span>
                                    </div>
                                </div>

                            </div>

                            <button
                                className="botao-ver-atendimentos"
                                type="button"
                                onClick={onVerAvaliacoes}
                            >
                                <span>Ver avaliações</span>

                                <svg
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
                                >
                                    <path d="M9 18l6-6-6-6"></path>
                                </svg>
                            </button>
                        </aside>

                    </div>
                </section>

            </div>
        </>
    );
}

export default VisaoGeral;
