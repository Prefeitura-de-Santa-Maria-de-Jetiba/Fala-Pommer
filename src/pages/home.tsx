// Exibe a área principal de conversas do sistema.
import brasao from "../assets/img/brasao.webp";
import imgFrida from "../assets/img/Frida.png";
import somNovaMensagem from "../assets/audio/notificacao.mp3";
import "./css/home.css";
import {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type ChangeEvent,
    type RefObject,
} from "react";
import { Link, useLocation, useNavigate } from "react-router";
import EmojiPicker from "../assets/emojiPicker";
import gsap from "gsap";
import {
    iniciarGravacaoAudio,
    obterMensagemErroGravacaoAudio,
    type GravadorAudioAtivo,
} from "../library/gravadorAudio";
import { ModalFinalizarConversa } from "../components/ModalFinalizarConversa";
import { ModalConfirmacao } from "../components/ModalConfirmacao";
import { ModalFeedback } from "../components/ModalFeedback";
import { useAutenticacao } from "../components/AutenticacaoContext";
import { apiFetch } from "../services/api";
import { inicializarNotificacoes } from "../services/notificacoes.service";
import Comunidades, { type Comunidade } from "../components/home/Comunidades.tsx";
import ModalDadosComunidades from "../components/home/ModalDadosComunidades.tsx";
import { Capacitor } from '@capacitor/core';
import { Haptics } from '@capacitor/haptics';

type TipoUsuario = "user" | "admin" | "funcionario" | "superAdmin";
type FiltroConversa = "todos" | "nao-lidas" | "grupos";

const INTERVALO_CONVERSAS_MS = 5_000;
const INTERVALO_MENSAGENS_MS = 3_000;
const INTERVALO_CONSULTA_DIGITACAO_MS = 1_500;
const INTERVALO_RENOVACAO_DIGITACAO_MS = 2_000;
const TEMPO_PARAR_DIGITACAO_MS = 2_500;
const LIMITE_HISTORICO_MENSAGENS = 50;
const LIMITE_NOVAS_MENSAGENS = 100;
const FORMATADOR_HORARIO = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
});
const FORMATADOR_DATA = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
});

const iconeComunidade = (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" strokeWidth="0.3" paintOrder="fill stroke" fillRule="evenodd" d="M6.37 18.67a1.81 1.81 0 0 1-.58-1.24c-.01-.5-.03-1.5.03-1.94a2.7 2.7 0 0 1 .4-1.1 2.84 2.84 0 0 1 .9-.82c.46-.28.98-.46 1.4-.58A12.2 12.2 0 0 1 12 12.5a12.69 12.69 0 0 1 3.47.49 5.76 5.76 0 0 1 1.52.65c.28.19.56.44.78.76a2.41 2.41 0 0 1 .41 1.1c.06.43.04 1.43.03 1.93a1.9 1.9 0 0 1-.58 1.24c-.22.2-.48.33-.75.33H7.12c-.27 0-.53-.13-.75-.33Zm13.6-3.27c.04.6.03.86.02 1.6v.49a4.58 4.58 0 0 1-.3 1.51h2.97c.72 0 1.31-1.85 1.33-2.58.01-.4.02-.13-.02-.46a2.34 2.34 0 0 0-.95-1.6 4.27 4.27 0 0 0-1.41-.68h-.02v-.01a7.72 7.72 0 0 0-2.35-.27 4.18 4.18 0 0 1 .72 2Zm-2.04-3.95a2.65 2.65 0 0 0 3.16.06 2.67 2.67 0 1 0-3.16-.06ZM14.9 9.62A3.54 3.54 0 0 0 15.5 7a3.56 3.56 0 1 0-.61 2.62Zm-7.88.4a2.67 2.67 0 1 0-5.16-1.38 2.67 2.67 0 0 0 5.16 1.38Zm-4.42 3.6-.18.05h-.03a4.3 4.3 0 0 0-1.41.69 2.3 2.3 0 0 0-.95 1.6c-.04.33-.03 1.06-.02 1.46.02.73.61 1.58 1.33 1.58H4.3a4.58 4.58 0 0 1-.3-1.51V17c-.01-.74-.02-1 .03-1.6 0-.05 0-.1.02-.15a4.48 4.48 0 0 1 .7-1.85 7.22 7.22 0 0 0-2.16.22Zm9.4.88c-1.21 0-2.22.2-2.92.4-.37.12-.68.23-.91.38-.23.13-.3.25-.34.34a.7.7 0 0 0-.03.14s0-.01 0 0L7.79 17h8.42v-1.24c-.01-.01 0 .01 0 0a.7.7 0 0 0-.04-.14c-.03-.09-.11-.2-.34-.34a3.84 3.84 0 0 0-.91-.37c-.7-.2-1.7-.41-2.92-.41ZM12 6a1.55 1.55 0 1 0 0 3.11c.86 0 1.56-.7 1.56-1.55C13.56 6.7 12.86 6 12 6Z" clipRule="evenodd"></path>
    </svg>
);

function formatarDataUltimaMensagem(dataOriginal: string) {
    const data = new Date(dataOriginal);

    if (Number.isNaN(data.getTime())) {
        return "";
    }

    const hoje = new Date();
    const diaAtual = Date.UTC(
        hoje.getFullYear(),
        hoje.getMonth(),
        hoje.getDate(),
    );
    const diaDaMensagem = Date.UTC(
        data.getFullYear(),
        data.getMonth(),
        data.getDate(),
    );
    const diasDecorridos = Math.round(
        (diaAtual - diaDaMensagem) / (24 * 60 * 60 * 1_000),
    );

    if (diasDecorridos === 1) {
        return "Ontem";
    }

    if (diasDecorridos > 1 && diasDecorridos <= 7) {
        return Intl.DateTimeFormat('pt-br', {weekday: 'long'}).format(data);
    }

    if (diasDecorridos > 7) {
        return `${FORMATADOR_DATA.format(data)}`;
    }

    return FORMATADOR_HORARIO.format(data);
}

interface UsuarioBasico {
    id: number;
    nome: string;
    foto_perfil_url: string | null;
}

interface UsuarioConversa extends UsuarioBasico {
    tipoUsuario: TipoUsuario;
    setor: {
        id: number;
        nome: string;
        sigla: string;
    } | null;
}

interface UsuarioAutenticado {
    sub: number;
    email: string;
    tipo: TipoUsuario;
}

interface PerfilUsuario {
    nome: string;
    foto_perfil_url: string | null;
}

interface UsuarioDigitando {
    id: number;
    nome: string;
}

interface Setor {
    id: number;
    setor: string;
    sigla_setor: string;
    secretaria: {
        id: number;
        nome: string;
        sigla_secretaria: string;
    } | null;
}

interface UltimaMensagem {
    id: number;
    conteudo: string;
    origem: "usuario" | "setor";
    sistema?: boolean;
    transferenciaId?: number | null;
    arquivoNome?: string | null;
    arquivoTipo?: string | null;
    enviadaEm: string;
}

interface FinalizacaoPendente {
    id: number;
    finalizadaPorId: number;
    finalizadaPorNome: string;
    finalizadaEm: string;
}

interface ConversaSetor {
    id: number;
    tipo: "setor";
    criadaEm: string;

    setor: {
        id: number;
        nome: string;
        sigla: string;
    };

    secretaria: {
        id: number;
        nome: string;
        sigla: string;
    }

    usuario: UsuarioBasico;
    mensagensNaoLidas: number;
    ultimaMensagem: UltimaMensagem | null;
    finalizacaoPendente: FinalizacaoPendente | null;
    ultimaFinalizacao: FinalizacaoPendente | null;
    podeFinalizar: boolean;
}

interface ConversaPrivada {
    id: number;
    tipo: "privada";
    criadaEm: string;
    contato: {
        id: number;
        nome: string;
        tipo_usuario: TipoUsuario;
        foto_perfil_url: string | null;
    };
    somenteLeitura: boolean;
    mensagensNaoLidas: number;
    ultimaMensagem: UltimaMensagem | null;
}

interface ConversaGrupo {
    id: number;
    tipo: "grupo";
    nome: string;
    criadaEm: string;
    participantes: Array<{
        id: number;
        nome: string;
        tipo_usuario: TipoUsuario;
        foto_perfil_url: string | null;
    }>;
    totalParticipantes: number;
    somenteLeitura: boolean;
    mensagensNaoLidas: number;
    ultimaMensagem: UltimaMensagem | null;
}

// A comunidade usa o mesmo chat e os mesmos participantes; seu ID não é o ID da conversa.
export interface ConversaComunidade extends Omit<ConversaGrupo, "tipo"> {
    tipo: "comunidade";
    comunidadeId: number;
    imagem: string | null;
}

interface FuncaoDosMembrosComunidade {
    id: number,
    comunidade_id: number,
    usuario_id: number,
    tipo_funcao: string,
    promovido_em: string
}

type Conversa = ConversaSetor | ConversaPrivada | ConversaGrupo | ConversaComunidade;

interface MensagemChat {
    id: number;
    conversaId: number;
    conteudo: string;
    origem: "usuario" | "setor";
    sistema: boolean;
    enviadaEm: string;
    // Existe apenas enquanto a mensagem ainda aguarda confirmação da API.
    statusEntrega?: "enviando";

    remetente: {
        tipo: "usuario" | "setor" | "admin" | "superAdmin";
        id: number;
        nome: string;
        fotoPerfilUrl?: string | null;
        tipoUsuario?: TipoUsuario;
        sigla_setor?: string;
    };

    autorReal?: {
        id: number;
        nome: string;
    };

    arquivo?: ArquivoMensagem | null;
    respondendoA?: {
        id: number;
        conteudo: string;
        remetente: {
            tipo: "usuario" | "setor" | "admin" | "superAdmin";
            id: number;
            nome: string;
            fotoPerfilUrl?: string | null;
            tipoUsuario?: TipoUsuario;
            sigla_setor?: string;
        };
        arquivo?: ArquivoMensagem | null;
    } | null;
}

interface ArquivoMensagem {
    nome: string;
    url: string;
    tipo: "documento" | "imagem" | "video" | "audio";
    mime: string;
    tamanho: number;
}

function mensagemFoiEnviadaPeloUsuario(
    item: MensagemChat,
    usuario: UsuarioAutenticado | null,
    conversa: Conversa | null,
) {
    if (!usuario || !conversa) {
        return false;
    }

    if (conversa.tipo === "grupo" || conversa.tipo === "comunidade") {
        const remetenteRealId = item.autorReal?.id ?? item.remetente.id;
        return remetenteRealId === usuario.sub;
    }

    if (conversa.tipo === "privada") {
        const remetenteRealId = item.autorReal?.id ?? item.remetente.id;
        return remetenteRealId === usuario.sub;
    }

    if (usuario.tipo === "admin") {
        const remetenteRealId = item.autorReal?.id ?? item.remetente.id;
        return remetenteRealId === usuario.sub;
    }

    if (usuario.tipo === "superAdmin") {
        const remetenteRealId = item.autorReal?.id ?? item.remetente.id;
        return remetenteRealId === usuario.sub;
    }

    if (usuario.tipo === "user") {
        return item.origem === "usuario" && item.remetente.id === usuario.sub;
    }

    if (usuario.tipo === "funcionario") {
        const remetenteRealId = item.autorReal?.id ?? item.remetente.id;
        return item.origem === "setor" && remetenteRealId === usuario.sub;
    }

    return false;
}

function Home() {
    const [novaConversaAberta, setNovaConversaAberta] = useState(false);
    const [modalFinalizarAberto, setModalFinalizarAberto] = useState(false);
    const [conversaAvaliacaoId, setConversaAvaliacaoId] =
        useState<number | null>(null);
    const [finalizandoConversa, setFinalizandoConversa] = useState(false);
    const [modalSairGrupoAberto, setModalSairGrupoAberto] = useState(false);
    const [saindoDoGrupo, setSaindoDoGrupo] = useState(false);
    const [enviandoAvaliacao, setEnviandoAvaliacao] = useState(false);
    const [feedbackFinalizacao, setFeedbackFinalizacao] = useState({
        aberto: false,
        tipo: "erro" as "erro" | "sucesso",
        mensagem: "",
    });
    const [feedback, setFeedback] = useState({
        aberto: false,
        tipo: "erro" as "erro" | "sucesso",
        mensagem: "",
    });
    const menuGrupoRef = useRef<HTMLDetailsElement>(null);
    const menuSetorRef = useRef<HTMLDetailsElement>(null);

    const [modalGrupoAberto, setModalGrupoAberto] = useState(false);
    const [modalDadosGrupoAberto, setModalDadosGrupoAberto] = useState(false);
    const [modalDadosComunidadeAberto, setModalDadosComunidadeAberto] = useState(false)
    const botaoFecharModalDadosGrupoRef = useRef<HTMLButtonElement>(null);
    const botaoFecharModalDadosComunidadeRef = useRef<HTMLButtonElement>(null);
    const [nomeGrupo, setNomeGrupo] = useState("");
    const [contatosGrupo, setContatosGrupo] = useState<UsuarioConversa[]>([]);
    const [contatosGrupoSelecionados, setContatosGrupoSelecionados] =
        useState<Set<number>>(new Set());
    const [buscaContatoGrupo, setBuscaContatoGrupo] = useState("");
    const [carregandoContatosGrupo, setCarregandoContatosGrupo] =
        useState(false);
    const [erroContatosGrupo, setErroContatosGrupo] = useState("");
    const [erroCriacaoGrupo, setErroCriacaoGrupo] = useState("");
    const [criandoGrupo, setCriandoGrupo] = useState(false);
    const botaoFecharModalGrupoRef = useRef<HTMLButtonElement>(null);
    const [modalAdicionarPessoaAberto, setModalAdicionarPessoaAberto] =
        useState(false);
    const [modalTransferirConversa, setModalTransferirConversa] = useState(false);
    const [setorTransferenciaSelecionado, setSetorTransferenciaSelecionado] =
        useState<Setor | null>(null);
    const [mensagemTransferencia, setMensagemTransferencia] = useState("");
    const [transferindoConversa, setTransferindoConversa] = useState(false);
    const [erroTransferencia, setErroTransferencia] = useState("");
    const botaoFecharModalTransferenciaRef = useRef<HTMLButtonElement>(null);
    const [buscaPessoaGrupo, setBuscaPessoaGrupo] = useState("");
    const [buscarSetorTranfConversa, setBuscarSetorTranfConversa] = useState("");
    const [secretariaTransferenciaSelecionadaId,
        setSecretariaTransferenciaSelecionadaId] = useState<number | null>(null);
    const [contatosDisponiveisModalAdicionarPessoas,
        setContatosDisponiveisModalAdicionarPessoas] =
        useState<UsuarioConversa[]>([]);
    const [setoresDisponiveisTransferencia,
        setSetoresDisponiveisTransferencia] =
        useState<Setor[]>([]);
    const [contatosModalAdicionarPessoasSelecionados,
        setContatosModalAdicionarPessoasSelecionados] =
        useState<Set<number>>(new Set());
    const [carregandoContatosModalAdicionarPessoas,
        setCarregandoContatosModalAdicionarPessoas] = useState(false);
    const [erroContatosModalAdicionarPessoas,
        setErroContatosModalAdicionarPessoas] = useState("");
    const [erroAdicionarPessoasGrupo, setErroAdicionarPessoasGrupo] =
        useState("");
    const [adicionandoPessoasGrupo, setAdicionandoPessoasGrupo] =
        useState(false);
    const botaoFecharModalAdicionarPessoaRef =
        useRef<HTMLButtonElement>(null);
    const inputBuscaPessoaGrupoRef = useRef<HTMLInputElement>(null);
    const inputBuscaSetorTransferenciaRef = useRef<HTMLInputElement>(null);

    const [usuarios, setUsuarios] = useState<UsuarioConversa[]>([]);

    const [setores, setSetores] = useState<Setor[]>([]);

    const [conversaSelecionada, setConversaSelecionada] =
        useState<Conversa | null>(null);
    const [dados, setDados] = useState<Comunidade | null>(null);
    // Estados da entrada na comunidade; mensagens e anexos reutilizam os estados do chat abaixo.
    const [carregandoComunidade, setCarregandoComunidade] = useState(false);
    const [entrandoComunidade, setEntrandoComunidade] = useState(false);
    const [erroComunidade, setErroComunidade] = useState("");
    const comunidadeAbertaIdRef = useRef<number | null>(null);
    const [
        buscarFuncoesDosUsuariosNaComunidade, 
        setBuscarFuncoesDosUsuariosNaComunidade
    ] = useState<FuncaoDosMembrosComunidade[]>([])

    const [chatMobileAberto, setChatMobileAberto] = useState(false);

    const [mensagensChat, setMensagensChat] = useState<MensagemChat[]>([]);
    const [ultimaMensagemVisualizadaId, setUltimaMensagemVisualizadaId] =
        useState<number | null>(null);
    const [usuariosDigitando, setUsuariosDigitando] =
        useState<UsuarioDigitando[]>([]);

    const [carregandoMensagens, setCarregandoMensagens] = useState(false);
    const [carregandoMensagensAnteriores, setCarregandoMensagensAnteriores] =
        useState(false);
    const [temMensagensAnteriores, setTemMensagensAnteriores] =
        useState(false);

    const [enviandoMensagem, setEnviandoMensagem] = useState(false);

    const mensagensContainerRef = useRef<HTMLDivElement>(null);
    const rolagemInicialPendenteRef = useRef(false);
    const alturaAntesDoHistoricoRef = useRef<number | null>(null);
    const balõesRef = useRef<Map<number, HTMLElement>>(new Map());
    const idsAnimadosRef = useRef<Set<number>>(new Set());
    const conversaAbertaIdRef = useRef<number | null>(null);
    const ultimaMensagemChatIdRef = useRef(0);
    const proximaMensagemTemporariaIdRef = useRef(-1);
    const historicoChatCarregadoRef = useRef(false);
    const somNotificacaoRef = useRef<HTMLAudioElement | null>(null);
    const audioNotificacaoLiberadoRef = useRef(false);
    const conversasSincronizadasRef = useRef(false);
    const finalizacoesConhecidasRef = useRef(
        new Map<number, number | null>(),
    );
    const estadoConversasRef = useRef(
        new Map<number, {
            ultimaMensagemId: number | null;
            mensagensNaoLidas: number;
        }>(),
    );
    const indicadorDigitandoRef = useRef<HTMLDivElement>(null);
    const conversaDigitandoIdRef = useRef<number | null>(null);
    const digitacaoAtivaRef = useRef(false);
    const intervaloDigitacaoRef = useRef<number | null>(null);
    const timeoutDigitacaoRef = useRef<number | null>(null);

    const [buscaUsuario, setBuscaUsuario] = useState("");

    const [buscaConversa, setBuscaConversa] = useState("");

    const [carregandoUsuarios, setCarregandoUsuarios] = useState(false);

    const [filtroAtivo, setFiltroAtivo] =
        useState<FiltroConversa>("todos");
    const [itemSidebarAtivo, setItemSidebarAtivo] =
        useState<"conversas" | "comunidades" | "frida">("conversas");

    const [menuAberto, setMenuAberto] = useState(false);
    const botaoMenuRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const [menuAbertoArquivos, setMenuAbertoArquivo] = useState(false);
    const [opcoesMensagens, setOpcoesMensagens] = useState<number | null>(null);
    const acaoArquivosRef = useRef<HTMLDivElement>(null);
    const botaoArquivosRef = useRef<HTMLButtonElement>(null);

    const [menuAbertoSeguindoComunidade, setMenuAbertoSeguindoComunidade] = useState(false);
    const menuSeguindoComunidadeRef = useRef<HTMLDivElement>(null);
    const botaoMenuSeguindoComunidadeRef = useRef<HTMLButtonElement>(null);
    const [deixandoDeSeguir, setDeixandoDeSeguir] = useState(false);

    useEffect(() => {
        if (opcoesMensagens === null) {
            return;
        }

        function fecharOpcoesAoClicarFora(evento: PointerEvent) {
            const alvo = evento.target;

            if (
                alvo instanceof Element &&
                (alvo.closest(".opcoes-mensagens") ||
                    alvo.closest(".config-mensagens"))
            ) {
                return;
            }

            setOpcoesMensagens(null);
        }

        document.addEventListener("pointerdown", fecharOpcoesAoClicarFora);

        return () => {
            document.removeEventListener("pointerdown", fecharOpcoesAoClicarFora);
        };
    }, [opcoesMensagens]);

    const [conversas, setConversas] = useState<Conversa[]>([]);

    const [mensagem, setMensagem] = useState("");

    const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(
        null,
    );

    const [responderMensagem, setResponderMensagem] = useState<MensagemChat | null>(null);

    const [arquivoEmVisualizacao, setArquivoEmVisualizacao] =
        useState<ArquivoMensagem | null>(null);
    const botaoFecharVisualizadorRef = useRef<HTMLButtonElement>(null);

    const [seletorEmojiAberto, setSeletorEmojiAberto] = useState(false);
    const acaoEmojiRef = useRef<HTMLDivElement>(null);
    const botaoEmojiRef = useRef<HTMLButtonElement>(null);

    const inputDocumentosRef = useRef<HTMLInputElement>(null);

    const inputMidiasRef = useRef<HTMLInputElement>(null);

    const inputAudiosRef = useRef<HTMLInputElement>(null);
    const gravadorAudioRef = useRef<GravadorAudioAtivo | null>(null);
    const processandoGravacaoAudioRef = useRef(false);
    const cicloGravacaoAudioRef = useRef(0);
    const [gravandoAudio, setGravandoAudio] = useState(false);
    const [processandoGravacaoAudio, setProcessandoGravacaoAudio] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();
    const { encerrarSessao } = useAutenticacao();

    useEffect(() => {
        const comunidade = location.state?.comunidade as Comunidade | undefined;

        if (!comunidade) return;

        void abrirComunidade(comunidade);
        navigate("/home", { replace: true, state: null });
    }, [location.state, navigate]);

    async function finalizarConversaSelecionada() {
        if (menuSetorRef.current) {
            menuSetorRef.current.open = false;
        }

        if (
            !conversaSelecionada ||
            conversaSelecionada.tipo !== "setor" ||
            finalizandoConversa
        ) {
            return;
        }

        const finalizacaoPendente =
            conversaSelecionada.finalizacaoPendente;

        if (usuario?.tipo === "user" && finalizacaoPendente) {
            setConversaAvaliacaoId(conversaSelecionada.id);
            setModalFinalizarAberto(true);
            return;
        }

        setFinalizandoConversa(true);

        try {
            const resposta = await apiFetch(
                `/conversas/${conversaSelecionada.id}/finalizacao`,
                {
                    method: "POST",
                },
            );
            const resultado = await resposta.json() as {
                id?: number;
                finalizadaPorId?: number;
                finalizadaPorNome?: string;
                finalizadaEm?: string;
                message?: string | string[];
            };

            if (!resposta.ok || !resultado.id) {
                throw new Error(
                    Array.isArray(resultado.message)
                        ? resultado.message.join(", ")
                        : resultado.message ||
                            "Não foi possível finalizar a conversa.",
                );
            }

            const novaFinalizacao: FinalizacaoPendente = {
                id: resultado.id,
                finalizadaPorId:
                    resultado.finalizadaPorId ?? usuario?.sub ?? 0,
                finalizadaPorNome:
                    resultado.finalizadaPorNome ?? "Usuário",
                finalizadaEm:
                    resultado.finalizadaEm ?? new Date().toISOString(),
            };

            finalizacoesConhecidasRef.current.set(
                conversaSelecionada.id,
                novaFinalizacao.id,
            );

            setConversas((conversasAtuais) =>
                conversasAtuais.map((conversa) =>
                    conversa.id === conversaSelecionada.id &&
                    conversa.tipo === "setor"
                        ? {
                            ...conversa,
                            podeFinalizar: false,
                            ultimaFinalizacao: novaFinalizacao,
                            finalizacaoPendente:
                                usuario?.tipo === "user"
                                    ? novaFinalizacao
                                    : conversa.finalizacaoPendente,
                        }
                        : conversa,
                ),
            );
            setConversaSelecionada((conversaAtual) =>
                conversaAtual?.id === conversaSelecionada.id &&
                conversaAtual.tipo === "setor"
                    ? {
                        ...conversaAtual,
                        podeFinalizar: false,
                        ultimaFinalizacao: novaFinalizacao,
                        finalizacaoPendente:
                            usuario?.tipo === "user"
                                ? novaFinalizacao
                                : conversaAtual.finalizacaoPendente,
                    }
                    : conversaAtual,
            );

            if (usuario?.tipo === "user") {
                setConversaAvaliacaoId(conversaSelecionada.id);
                setModalFinalizarAberto(true);
            } else {
                setFeedbackFinalizacao({
                    aberto: true,
                    tipo: "sucesso",
                    mensagem:
                        `Conversa finalizada por ${novaFinalizacao.finalizadaPorNome}.`,
                });
            }
        } catch (erro) {
            console.error("Erro ao finalizar conversa:", erro);
            setFeedbackFinalizacao({
                aberto: true,
                tipo: "erro",
                mensagem: erro instanceof Error
                    ? erro.message
                    : "Não foi possível finalizar a conversa.",
            });
        } finally {
            setFinalizandoConversa(false);
        }
    }

    async function enviarAvaliacao(dados: {
        avaliacao: number;
        descricao: string;
    }) {
        if (!conversaAvaliacaoId || enviandoAvaliacao) {
            return;
        }

        setEnviandoAvaliacao(true);

        try {
            const resposta = await apiFetch(
                `/conversas/${conversaAvaliacaoId}/avaliacao`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        nota: dados.avaliacao,
                        descricao: dados.descricao || undefined,
                    }),
                },
            );
            const resultado = await resposta.json() as {
                message?: string | string[];
            };

            if (!resposta.ok) {
                throw new Error(
                    Array.isArray(resultado.message)
                        ? resultado.message.join(", ")
                        : resultado.message ||
                            "Não foi possível enviar a avaliação.",
                );
            }

            const conversaAvaliadaId = conversaAvaliacaoId;

            setConversas((conversasAtuais) =>
                conversasAtuais.map((conversa) =>
                    conversa.id === conversaAvaliadaId &&
                    conversa.tipo === "setor"
                        ? { ...conversa, finalizacaoPendente: null }
                        : conversa,
                ),
            );
            setConversaSelecionada((conversaAtual) =>
                conversaAtual?.id === conversaAvaliadaId &&
                conversaAtual.tipo === "setor"
                    ? { ...conversaAtual, finalizacaoPendente: null }
                    : conversaAtual,
            );
            setModalFinalizarAberto(false);
            setConversaAvaliacaoId(null);
        } catch (erro) {
            console.error("Erro ao enviar avaliação:", erro);
            setFeedbackFinalizacao({
                aberto: true,
                tipo: "erro",
                mensagem: erro instanceof Error
                    ? erro.message
                    : "Não foi possível enviar a avaliação.",
            });
        } finally {
            setEnviandoAvaliacao(false);
        }
    }

    useEffect(() => {
        function fecharMenuGrupoAoClicarFora(evento: PointerEvent) {
            const menuGrupo = menuGrupoRef.current;
            const alvo = evento.target;

            if (
                menuGrupo?.open &&
                alvo instanceof Node &&
                !menuGrupo.contains(alvo)
            ) {
                menuGrupo.open = false;
            }
        }

        function fecharMenuGrupoComEscape(evento: KeyboardEvent) {
            const menuGrupo = menuGrupoRef.current;

            if (evento.key !== "Escape" || !menuGrupo?.open) {
                return;
            }

            menuGrupo.open = false;
            const resumo = menuGrupo.querySelector("summary");

            if (resumo instanceof HTMLElement) {
                resumo.focus();
            }
        }

        document.addEventListener(
            "pointerdown",
            fecharMenuGrupoAoClicarFora,
        );
        window.addEventListener("keydown", fecharMenuGrupoComEscape);

        return () => {
            document.removeEventListener(
                "pointerdown",
                fecharMenuGrupoAoClicarFora,
            );
            window.removeEventListener("keydown", fecharMenuGrupoComEscape);
        };
    }, []);

    useEffect(() => {
        if (!menuAbertoSeguindoComunidade) {
            return;
        }

        function fecharAoClicarFora(evento: PointerEvent) {
            const alvo = evento.target;

            if (!(alvo instanceof Node)) {
                return;
            }

            if (
                botaoMenuSeguindoComunidadeRef.current?.contains(alvo) ||
                menuSeguindoComunidadeRef.current?.contains(alvo)
            ) {
                return;
            }

            setMenuAbertoSeguindoComunidade(false);
        }

        function fecharComEscape(evento: KeyboardEvent) {
            if (evento.key === "Escape") {
                setMenuAbertoSeguindoComunidade(false);
                botaoMenuSeguindoComunidadeRef.current?.focus();
            }
        }

        document.addEventListener("pointerdown", fecharAoClicarFora);
        window.addEventListener("keydown", fecharComEscape);

        return () => {
            document.removeEventListener("pointerdown", fecharAoClicarFora);
            window.removeEventListener("keydown", fecharComEscape);
        };
    }, [menuAbertoSeguindoComunidade]);

    useEffect(() => {
        function fecharMenuSetorAoClicarFora(evento: PointerEvent) {
            const menuSetor = menuSetorRef.current;
            const alvo = evento.target;

            if (
                menuSetor?.open &&
                alvo instanceof Node &&
                !menuSetor.contains(alvo)
            ) {
                menuSetor.open = false;
            }
        }

        function fecharMenuSetorComEscape(evento: KeyboardEvent) {
            const menuSetor = menuSetorRef.current;

            if (evento.key !== "Escape" || !menuSetor?.open) {
                return;
            }

            menuSetor.open = false;
            const resumo = menuSetor.querySelector("summary");

            if (resumo instanceof HTMLElement) {
                resumo.focus();
            }
        }

        document.addEventListener(
            "pointerdown",
            fecharMenuSetorAoClicarFora,
        );
        window.addEventListener("keydown", fecharMenuSetorComEscape);

        return () => {
            document.removeEventListener(
                "pointerdown",
                fecharMenuSetorAoClicarFora,
            );
            window.removeEventListener("keydown", fecharMenuSetorComEscape);
        };
    }, []);

    useEffect(() => {
        if (!menuAberto) {
            return;
        }

        function fecharMenuAoClicarFora(evento: PointerEvent) {
            const alvo = evento.target;

            if (!(alvo instanceof Node)) {
                return;
            }

            if (
                botaoMenuRef.current?.contains(alvo) ||
                menuRef.current?.contains(alvo)
            ) {
                return;
            }

            setMenuAberto(false);
        }

        function fecharMenuComEscape(evento: KeyboardEvent) {
            if (evento.key === "Escape") {
                setMenuAberto(false);
                botaoMenuRef.current?.focus();
            }
        }

        document.addEventListener("pointerdown", fecharMenuAoClicarFora);
        window.addEventListener("keydown", fecharMenuComEscape);

        return () => {
            document.removeEventListener("pointerdown", fecharMenuAoClicarFora);
            window.removeEventListener("keydown", fecharMenuComEscape);
        };
    }, [menuAberto]);

    useEffect(() => {
        if (!menuAbertoArquivos) {
            return;
        }

        function fecharArquivosAoClicarFora(evento: PointerEvent) {
            const alvo = evento.target;

            if (
                alvo instanceof Node &&
                !acaoArquivosRef.current?.contains(alvo)
            ) {
                setMenuAbertoArquivo(false);
            }
        }

        function fecharArquivosComEscape(evento: KeyboardEvent) {
            if (evento.key === "Escape") {
                setMenuAbertoArquivo(false);
                botaoArquivosRef.current?.focus();
            }
        }

        document.addEventListener("pointerdown", fecharArquivosAoClicarFora);
        window.addEventListener("keydown", fecharArquivosComEscape);

        return () => {
            document.removeEventListener(
                "pointerdown",
                fecharArquivosAoClicarFora,
            );
            window.removeEventListener("keydown", fecharArquivosComEscape);
        };
    }, [menuAbertoArquivos]);

    useEffect(() => {
        if (!seletorEmojiAberto) {
            return;
        }

        function fecharEmojisAoClicarFora(evento: PointerEvent) {
            const alvo = evento.target;

            if (
                alvo instanceof Node &&
                !acaoEmojiRef.current?.contains(alvo)
            ) {
                setSeletorEmojiAberto(false);
            }
        }

        function fecharEmojisComEscape(evento: KeyboardEvent) {
            if (evento.key === "Escape") {
                setSeletorEmojiAberto(false);
                botaoEmojiRef.current?.focus();
            }
        }

        document.addEventListener("pointerdown", fecharEmojisAoClicarFora);
        window.addEventListener("keydown", fecharEmojisComEscape);

        return () => {
            document.removeEventListener(
                "pointerdown",
                fecharEmojisAoClicarFora,
            );
            window.removeEventListener("keydown", fecharEmojisComEscape);
        };
    }, [seletorEmojiAberto]);

    useEffect(() => {
        if (!modalGrupoAberto) {
            return;
        }

        const overflowAnterior = document.body.style.overflow;
        const elementoComFocoAnterior = document.activeElement;
        document.body.style.overflow = "hidden";
        botaoFecharModalGrupoRef.current?.focus();

        function fecharComEscape(evento: KeyboardEvent) {
            if (evento.key === "Escape") {
                setModalGrupoAberto(false);
            }
        }

        window.addEventListener("keydown", fecharComEscape);

        return () => {
            document.body.style.overflow = overflowAnterior;
            window.removeEventListener("keydown", fecharComEscape);

            if (elementoComFocoAnterior instanceof HTMLElement) {
                elementoComFocoAnterior.focus();
            }
        };
    }, [modalGrupoAberto]);

    useEffect(() => {
        if (!modalDadosGrupoAberto) {
            return;
        }

        const overflowAnterior = document.body.style.overflow;
        const elementoComFocoAnterior = document.activeElement;
        document.body.style.overflow = "hidden";
        botaoFecharModalDadosGrupoRef.current?.focus();

        function fecharComEscape(evento: KeyboardEvent) {
            if (evento.key === "Escape") {
                setModalDadosGrupoAberto(false);
            }
        }

        window.addEventListener("keydown", fecharComEscape);

        return () => {
            document.body.style.overflow = overflowAnterior;
            window.removeEventListener("keydown", fecharComEscape);

            if (elementoComFocoAnterior instanceof HTMLElement) {
                elementoComFocoAnterior.focus();
            }
        };
    }, [modalDadosGrupoAberto]);

    useEffect(() => {
        if (!modalDadosComunidadeAberto) {
            return
        }

        const overflowAnterior =document.body.style.overflow;
        const elementoComFocoAnterior = document.activeElement;
        document.body.style.overflow = "hidden";
        botaoFecharModalDadosComunidadeRef.current?.focus();

        function fecharComEscape(evento: KeyboardEvent) {
            if (evento.key === "Escape") {
                setModalDadosComunidadeAberto(false);
            }
        }

        window.addEventListener("keydown", fecharComEscape);

        return () => {
            document.body.style.overflow = overflowAnterior;
            window.removeEventListener("keydown", fecharComEscape);

            if (elementoComFocoAnterior instanceof HTMLElement) {
                elementoComFocoAnterior.focus();
            }
        };

    }, [modalDadosComunidadeAberto]);

    //ao adicionar um novo usuario o sistema mostra ele temporariamente
    //possivelmente não é usado os participantes que são enviado para o front
    function aoAdicionarMembrosComunidade(
        comunidadeId: number,
        resultado: {
            participantes: ConversaComunidade["participantes"];
            totalParticipantes: number;
        },
    ) {
        const atualizarComunidade = (conversa: Conversa): Conversa =>
            conversa.tipo === "comunidade" && conversa.comunidadeId === comunidadeId
                ? {
                    ...conversa,
                    participantes: resultado.participantes,
                    totalParticipantes: resultado.totalParticipantes,
                }
                : conversa;

        setConversas((atuais) => atuais.map(atualizarComunidade));
        setConversaSelecionada((atual) => (atual ? atualizarComunidade(atual) : null));

        // o modal lê o contador do cabeçalho de "dados"
        setDados((atual) =>
            atual && atual.id === comunidadeId
                ? { ...atual, totalParticipantes: resultado.totalParticipantes }
                : atual,
        );
    }

    useEffect(() => {
        if (!modalAdicionarPessoaAberto) {
            return;
        }

        const overflowAnterior = document.body.style.overflow;
        const elementoComFocoAnterior = document.activeElement;
        document.body.style.overflow = "hidden";
        inputBuscaPessoaGrupoRef.current?.focus();

        function fecharComEscape(evento: KeyboardEvent) {
            if (evento.key === "Escape") {
                setModalAdicionarPessoaAberto(false);
            }
        }

        window.addEventListener("keydown", fecharComEscape);

        return () => {
            document.body.style.overflow = overflowAnterior;
            window.removeEventListener("keydown", fecharComEscape);

            if (elementoComFocoAnterior instanceof HTMLElement) {
                elementoComFocoAnterior.focus();
            }
        };
    }, [modalAdicionarPessoaAberto]);

    useEffect(() => {
        if (!arquivoEmVisualizacao) {
            return;
        }

        const overflowAnterior = document.body.style.overflow;
        const elementoComFocoAnterior = document.activeElement;
        document.body.style.overflow = "hidden";
        botaoFecharVisualizadorRef.current?.focus();

        function fecharComEscape(evento: KeyboardEvent) {
            if (evento.key === "Escape") {
                setArquivoEmVisualizacao(null);
            }
        }

        window.addEventListener("keydown", fecharComEscape);

        return () => {
            document.body.style.overflow = overflowAnterior;
            window.removeEventListener("keydown", fecharComEscape);

            if (elementoComFocoAnterior instanceof HTMLElement) {
                elementoComFocoAnterior.focus();
            }
        };
    }, [arquivoEmVisualizacao]);

    useEffect(() => {
        if (!modalTransferirConversa) {
            return;
        }

        const overflowAnterior = document.body.style.overflow;
        const elementoComFocoAnterior = document.activeElement;
        document.body.style.overflow = "hidden";
        inputBuscaSetorTransferenciaRef.current?.focus();

        function fecharComEscape(evento: KeyboardEvent) {
            if (evento.key === "Escape") {
                setModalTransferirConversa(false);
            }
        }

        window.addEventListener("keydown", fecharComEscape);

        return () => {
            document.body.style.overflow = overflowAnterior;
            window.removeEventListener("keydown", fecharComEscape);

            if (elementoComFocoAnterior instanceof HTMLElement) {
                elementoComFocoAnterior.focus();
            }
        };
    }, [modalTransferirConversa]);

    useEffect(() => {
        const audio = new Audio(somNovaMensagem);
        let liberando = false;

        audio.preload = "auto";
        audio.volume = 0.7;
        somNotificacaoRef.current = audio;

        function removerEventosDeLiberacao() {
            window.removeEventListener("pointerdown", liberarAudio);
            window.removeEventListener("keydown", liberarAudio);
        }

        async function liberarAudio() {
            if (audioNotificacaoLiberadoRef.current || liberando) {
                return;
            }

            liberando = true;

            try {
                audio.muted = true;
                await audio.play();
                audio.pause();
                audio.currentTime = 0;
                audio.muted = false;
                audioNotificacaoLiberadoRef.current = true;
                removerEventosDeLiberacao();
            } catch {
                audio.muted = false;
            } finally {
                liberando = false;
            }
        }

        window.addEventListener("pointerdown", liberarAudio);
        window.addEventListener("keydown", liberarAudio);

        return () => {
            removerEventosDeLiberacao();
            audio.pause();
            somNotificacaoRef.current = null;
            audioNotificacaoLiberadoRef.current = false;
        };
    }, []);

    useEffect(() => {
        function encerrarDigitacaoAoOcultar() {
            if (document.visibilityState !== "hidden") {
                return;
            }

            const conversaId = conversaDigitandoIdRef.current;
            const estavaDigitando = digitacaoAtivaRef.current;

            if (intervaloDigitacaoRef.current !== null) {
                window.clearInterval(intervaloDigitacaoRef.current);
                intervaloDigitacaoRef.current = null;
            }

            if (timeoutDigitacaoRef.current !== null) {
                window.clearTimeout(timeoutDigitacaoRef.current);
                timeoutDigitacaoRef.current = null;
            }

            conversaDigitandoIdRef.current = null;
            digitacaoAtivaRef.current = false;

            if (conversaId !== null && estavaDigitando) {
                void apiFetch(
                    `/conversas/${conversaId}/digitando`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ digitando: false }),
                        keepalive: true,
                    },
                ).catch(() => undefined);
            }
        }

        document.addEventListener(
            "visibilitychange",
            encerrarDigitacaoAoOcultar,
        );

        return () => {
            document.removeEventListener(
                "visibilitychange",
                encerrarDigitacaoAoOcultar,
            );

            if (intervaloDigitacaoRef.current !== null) {
                window.clearInterval(intervaloDigitacaoRef.current);
            }

            if (timeoutDigitacaoRef.current !== null) {
                window.clearTimeout(timeoutDigitacaoRef.current);
            }
        };
    }, []);

    async function vibrarNovaMensagem() {
        if(!Capacitor.isNativePlatform()) {
            return;
        }

        try {
            await Haptics.vibrate({
                duration: 200,
            });
        } catch(erro) {
            console.error('Não foi possível vibrar:', erro);
        }
    }

    function tocarSomDeNovaMensagem() {
        const audio = somNotificacaoRef.current;

        if (!audio) {
            return;
        }

        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;

        void audio.play()
            .then(() => {
                audioNotificacaoLiberadoRef.current = true;
            })
            .catch(() => {
                // O navegador ou WebView ainda aguarda interação do usuário.
            });
    }

    function alertarNovaMensagem() {
        tocarSomDeNovaMensagem();
        void vibrarNovaMensagem();
    }

    async function sair() {
        try {
            // Usa o fluxo central para revogar a sessão e limpar os tokens.
            await encerrarSessao();
        } finally {
            navigate("/");
        }
    }

    const [usuario, setUsuario] = useState<UsuarioAutenticado | null>(null);
    const [perfilUsuario, setPerfilUsuario] = useState<PerfilUsuario | null>(null);

    useEffect(() => {
        async function buscarPerfil() {
            try {
                const resposta = await apiFetch("/auth/Perfil");

                if (!resposta.ok) {
                return;
                }

                const dados = await resposta.json();

                setUsuario(dados);
            } catch (erro) {
                console.error("Erro ao buscar perfil:", erro);
            }
        }

        buscarPerfil();
    }, []);

    useEffect(() => {
        let ativo = true;

        async function buscarDadosDoPerfil() {
            try {
                const resposta = await apiFetch("/usuarios/me");

                if (!resposta.ok) {
                    return;
                }

                const dados = await resposta.json() as PerfilUsuario;

                if (ativo) {
                    setPerfilUsuario(dados);
                }
            } catch (erro) {
                console.error("Erro ao buscar dados do perfil:", erro);
            }
        }

        void buscarDadosDoPerfil();

        return () => {
            ativo = false;
        };
    }, []);

    useEffect(() => {
        if (!usuario) {
            return;
        }

        void inicializarNotificacoes();
    }, [usuario]);

    useEffect(() => {
        if (!usuario) {
            return;
        }

        let ativo = true;
        let buscando = false;
        const tipoUsuarioLogado = usuario.tipo;
        const usuarioLogadoId = usuario.sub;

        async function buscarConversas() {
            if (buscando || document.visibilityState === "hidden") {
                return;
            }

            buscando = true;

            try {
                const [respostaPrivadas, respostaSetores, respostaGrupos] = await Promise.all([
                    apiFetch("/conversas"),
                    apiFetch("/conversas/setor"),
                    tipoUsuarioLogado === "user"
                        ? Promise.resolve(null)
                        : apiFetch("/conversas/grupos"),
                ]);

                if (
                    !respostaPrivadas.ok ||
                    !respostaSetores.ok ||
                    (respostaGrupos !== null && !respostaGrupos.ok)
                ) {
                    throw new Error("Não foi possível carregar as conversas.");
                }

                const [conversasPrivadas, conversasSetores, conversasGrupos] = await Promise.all([
                    respostaPrivadas.json() as Promise<ConversaPrivada[]>,
                    respostaSetores.json() as Promise<ConversaSetor[]>,
                    respostaGrupos === null
                        ? Promise.resolve([] as ConversaGrupo[])
                        : respostaGrupos.json() as Promise<ConversaGrupo[]>,
                ]);

                const conversaAbertaId = conversaAbertaIdRef.current;
                const todasConversas: Conversa[] = [
                    ...conversasPrivadas,
                    ...conversasSetores,
                    ...conversasGrupos,
                ].map((conversa) =>
                    conversa.id === conversaAbertaId
                        ? { ...conversa, mensagensNaoLidas: 0 }
                        : conversa,
                ).sort((conversaA, conversaB) => {
                const dataA = new Date(
                    conversaA.ultimaMensagem?.enviadaEm ?? conversaA.criadaEm,
                ).getTime();

                const dataB = new Date(
                    conversaB.ultimaMensagem?.enviadaEm ?? conversaB.criadaEm,
                ).getTime();

                return dataB - dataA;
                });

                if (ativo) {
                    const deveTocarNotificacao =
                        conversasSincronizadasRef.current &&
                        todasConversas.some((conversa) => {
                            if (conversa.id === conversaAbertaId) {
                                return false;
                            }

                            const estadoAnterior =
                                estadoConversasRef.current.get(conversa.id);

                            if (!estadoAnterior) {
                                return conversa.mensagensNaoLidas > 0;
                            }

                            return (
                                conversa.mensagensNaoLidas >
                                    estadoAnterior.mensagensNaoLidas &&
                                conversa.ultimaMensagem?.id !==
                                    estadoAnterior.ultimaMensagemId
                            );
                        });
                    const conversaFinalizadaPorOutro =
                        tipoUsuarioLogado !== "user"
                            ? conversasSetores.find((conversa) => {
                                const finalizacao =
                                    conversa.ultimaFinalizacao;

                                if (
                                    !finalizacao ||
                                    finalizacao.finalizadaPorId === usuarioLogadoId ||
                                    !finalizacoesConhecidasRef.current.has(
                                        conversa.id,
                                    )
                                ) {
                                    return false;
                                }

                                return finalizacoesConhecidasRef.current.get(
                                    conversa.id,
                                ) !== finalizacao.id;
                            })
                            : undefined;
                    const conversaRecebidaPorEncaminhamento =
                        tipoUsuarioLogado === "user"
                            ? [...conversasSetores]
                                .sort((conversaA, conversaB) =>
                                    new Date(
                                        conversaB.ultimaMensagem?.enviadaEm ??
                                            conversaB.criadaEm,
                                    ).getTime() -
                                    new Date(
                                        conversaA.ultimaMensagem?.enviadaEm ??
                                            conversaA.criadaEm,
                                    ).getTime()
                                )
                                .find((conversa) => {
                                const ultimaMensagem =
                                    conversa.ultimaMensagem;

                                if (
                                    !ultimaMensagem?.sistema ||
                                    !ultimaMensagem.transferenciaId
                                ) {
                                    return false;
                                }

                                const estadoAnterior =
                                    estadoConversasRef.current.get(
                                        conversa.id,
                                    );

                                return (
                                    estadoAnterior
                                        ? estadoAnterior.ultimaMensagemId !==
                                            ultimaMensagem.id
                                        : conversa.mensagensNaoLidas > 0
                                );
                            })
                            : undefined;

                    estadoConversasRef.current = new Map(
                        todasConversas.map((conversa) => [
                            conversa.id,
                            {
                                ultimaMensagemId:
                                    conversa.ultimaMensagem?.id ?? null,
                                mensagensNaoLidas:
                                    conversa.mensagensNaoLidas,
                            },
                        ]),
                    );
                    finalizacoesConhecidasRef.current = new Map(
                        conversasSetores.map((conversa) => [
                            conversa.id,
                            conversa.ultimaFinalizacao?.id ?? null,
                        ]),
                    );
                    conversasSincronizadasRef.current = true;
                    setConversas(todasConversas);
                    setConversaSelecionada((conversaAtual) => {
                        if (!conversaAtual) {
                            return conversaAtual;
                        }

                        const conversaAtualizada = todasConversas.find(
                            (conversa) => conversa.id === conversaAtual.id,
                        );

                        if (conversaAtualizada) {
                            return conversaAtualizada;
                        }

                        return conversaAtual.tipo === "privada" || conversaAtual.tipo === "comunidade"
                            ? conversaAtual
                            : null;
                    });

                    if (tipoUsuarioLogado === "user") {
                        if (conversaRecebidaPorEncaminhamento) {
                            void abrirConversa(
                                conversaRecebidaPorEncaminhamento,
                            );
                        }

                        const conversaComAvaliacaoPendente =
                            conversasSetores.find(
                                (conversa) =>
                                    conversa.finalizacaoPendente !== null,
                            );

                        if (
                            conversaComAvaliacaoPendente?.finalizacaoPendente
                        ) {
                            setConversaAvaliacaoId(
                                conversaComAvaliacaoPendente.id,
                            );
                            setModalFinalizarAberto(true);
                        }
                    } else if (conversaFinalizadaPorOutro) {
                        setFeedbackFinalizacao({
                            aberto: true,
                            tipo: "sucesso",
                            mensagem:
                                `Conversa finalizada por ${conversaFinalizadaPorOutro.ultimaFinalizacao!.finalizadaPorNome}.`,
                        });
                    }

                    if (deveTocarNotificacao) {
                        alertarNovaMensagem();
                    }
                }
            } catch (erro) {
                console.error("Erro ao carregar conversas:", erro);
            } finally {
                buscando = false;
            }
        }

        function atualizarAoVoltarParaPagina() {
            if (document.visibilityState === "visible") {
                void buscarConversas();
            }
        }

        void buscarConversas();

        const intervalo = window.setInterval(
            () => void buscarConversas(),
            INTERVALO_CONVERSAS_MS,
        );

        document.addEventListener(
            "visibilitychange",
            atualizarAoVoltarParaPagina,
        );

        return () => {
            ativo = false;
            window.clearInterval(intervalo);
            document.removeEventListener(
                "visibilitychange",
                atualizarAoVoltarParaPagina,
            );
        };
    }, [usuario]);

    async function abrirNovaConversa() {
        if (!usuario) {
            return;
        }

        setNovaConversaAberta(true);
        setCarregandoUsuarios(true);
        setBuscaUsuario("");

        try {
            const rota =
                usuario.tipo === "user"
                    ? "/setores/com-funcionarios"
                    : "/usuarios/conversas";

            const resposta = await apiFetch(rota);

            if (!resposta.ok) {
                throw new Error("Não foi possível carregar as opções.");
            }

            const dados = await resposta.json();

            if (usuario.tipo === "user") {
                setSetores(dados as Setor[]);
                setUsuarios([]);
            } else {
                setUsuarios(dados as UsuarioConversa[]);
                setSetores([]);
            }
        } catch (erro) {
            console.error(erro);
        } finally {
            setCarregandoUsuarios(false);
        }
    }

    async function abrirModalGrupo() {
        if (!usuario || usuario.tipo === "user") {
            return;
        }

        setMenuAberto(false);
        setModalGrupoAberto(true);
        setNomeGrupo("");
        setBuscaContatoGrupo("");
        setContatosGrupo([]);
        setContatosGrupoSelecionados(new Set());
        setErroContatosGrupo("");
        setErroCriacaoGrupo("");
        setCriandoGrupo(false);
        setCarregandoContatosGrupo(true);

        try {
            const resposta = await apiFetch("/usuarios/grupos/contatos");

            if (!resposta.ok) {
                throw new Error("Não foi possível carregar os contatos.");
            }

            const contatos = await resposta.json() as UsuarioConversa[];

            setContatosGrupo(
                contatos.filter((contato) => contato.tipoUsuario !== "user"),
            );
        } catch (erro) {
            console.error("Erro ao carregar contatos para o grupo:", erro);
            setErroContatosGrupo("Não foi possível carregar os contatos.");
        } finally {
            setCarregandoContatosGrupo(false);
        }
    }

    async function contatosModalAdicionarPessoas() {
        if (
            !usuario ||
            usuario.tipo === "user" ||
            conversaSelecionada?.tipo !== "grupo"
        ) {
            return;
        }

        setBuscaPessoaGrupo("");
        setContatosDisponiveisModalAdicionarPessoas([]);
        setContatosModalAdicionarPessoasSelecionados(new Set());
        setErroContatosModalAdicionarPessoas("");
        setErroAdicionarPessoasGrupo("");
        setAdicionandoPessoasGrupo(false);
        setCarregandoContatosModalAdicionarPessoas(true);
        setModalAdicionarPessoaAberto(true);

        try {
            const resposta = await apiFetch("/usuarios/grupos/contatos");

            if (!resposta.ok) {
                throw new Error("Não foi possível carregar os contatos.");
            }

            const contatos = await resposta.json() as UsuarioConversa[];
            setContatosDisponiveisModalAdicionarPessoas(
                contatos.filter((contato) => contato.tipoUsuario !== "user"),
            );
        } catch (erro) {
            console.error(
                "Erro ao carregar contatos para adição ao grupo:",
                erro,
            );
            setErroContatosModalAdicionarPessoas(
                "Não foi possível carregar os contatos.",
            );
        } finally {
            setCarregandoContatosModalAdicionarPessoas(false);
        }
    }

    async function transferirConversa() {
        if (!usuario ||
            usuario.tipo === "user" ||
            conversaSelecionada?.tipo !== "setor"
        ) {
            return;
        }

        setBuscarSetorTranfConversa("");
        setSecretariaTransferenciaSelecionadaId(null);
        setSetoresDisponiveisTransferencia([]);
        setSetorTransferenciaSelecionado(null);
        setMensagemTransferencia("");
        setErroTransferencia("");
        setTransferindoConversa(false);
        setModalTransferirConversa(true);

        try {
            const resposta = await apiFetch(
                "/setores/disponiveis-transferencia",
            );

            if (!resposta.ok) {
                throw new Error("Não foi possível carregar os setores.");
            }

            const dados = await resposta.json() as Setor[];
            setSetoresDisponiveisTransferencia(dados);
        } catch (erro) {
            console.error("Erro ao carregar setores para transferência:", erro);
            setSetoresDisponiveisTransferencia([]);
        }
    }

    async function confirmarTransferenciaConversa() {
        if (
            conversaSelecionada?.tipo !== "setor" ||
            !setorTransferenciaSelecionado ||
            mensagemTransferencia.trim().length < 10 ||
            transferindoConversa
        ) {
            return;
        }

        const conversaId = conversaSelecionada.id;
        const setorDestinoId = setorTransferenciaSelecionado.id;
        const motivo = mensagemTransferencia.trim();

        setErroTransferencia("");
        setTransferindoConversa(true);

        try {
            const resposta = await apiFetch(
                `/conversas/${conversaId}/transferencias`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        setorDestinoId,
                        motivo,
                    }),
                },
            );
            const resultado = await resposta.json().catch(() => null) as {
                setorDestino?: {
                    nome?: string;
                };
                message?: string | string[];
            } | null;

            if (!resposta.ok) {
                throw new Error(
                    Array.isArray(resultado?.message)
                        ? resultado.message.join(" ")
                        : resultado?.message ||
                            "Não foi possível transferir a conversa.",
                );
            }

            setSetorTransferenciaSelecionado(null);
            setMensagemTransferencia("");
            setModalTransferirConversa(false);

            setFeedbackFinalizacao({
                aberto: true,
                tipo: "sucesso",
                mensagem:
                    `Atendimento encaminhado para o setor ${
                        resultado?.setorDestino?.nome ??
                        setorTransferenciaSelecionado.setor
                    }.`,
            });
        } catch (erro) {
            console.error("Erro ao transferir conversa:", erro);
            setErroTransferencia(
                erro instanceof Error
                    ? erro.message
                    : "Não foi possível transferir a conversa.",
            );
        } finally {
            setTransferindoConversa(false);
        }
    }

    async function adicionarPessoasAoGrupo() {
        if (
            conversaSelecionada?.tipo !== "grupo" ||
            contatosModalAdicionarPessoasSelecionados.size < 1 ||
            adicionandoPessoasGrupo
        ) {
            return;
        }

        const grupoId = conversaSelecionada.id;
        setErroAdicionarPessoasGrupo("");
        setAdicionandoPessoasGrupo(true);

        try {
            const resposta = await apiFetch(
                `/conversas/grupos/${grupoId}/participantes`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        participanteIds: Array.from(
                            contatosModalAdicionarPessoasSelecionados,
                        ),
                    }),
                },
            );

            const resultado = await resposta.json().catch(() => null) as {
                grupoId?: number;
                participantes?: ConversaGrupo["participantes"];
                totalParticipantes?: number;
                message?: string | string[];
            } | null;

            if (
                !resposta.ok ||
                !resultado?.grupoId ||
                !resultado.participantes ||
                resultado.totalParticipantes === undefined
            ) {
                const mensagemErro = Array.isArray(resultado?.message)
                    ? resultado.message.join(", ")
                    : resultado?.message;

                throw new Error(
                    mensagemErro ??
                        "Não foi possível adicionar as pessoas ao grupo.",
                );
            }

            const atualizarGrupo = (conversa: Conversa): Conversa =>
                conversa.tipo === "grupo" && conversa.id === grupoId
                    ? {
                        ...conversa,
                        participantes: resultado.participantes!,
                        totalParticipantes: resultado.totalParticipantes!,
                    }
                    : conversa;

            setConversas((conversasAtuais) =>
                conversasAtuais.map(atualizarGrupo),
            );
            setConversaSelecionada((conversaAtual) =>
                conversaAtual ? atualizarGrupo(conversaAtual) : null,
            );
            setModalAdicionarPessoaAberto(false);
        } catch (erro) {
            console.error("Erro ao adicionar pessoas ao grupo:", erro);
            setErroAdicionarPessoasGrupo(
                erro instanceof Error
                    ? erro.message
                    : "Não foi possível adicionar as pessoas ao grupo.",
            );
        } finally {
            setAdicionandoPessoasGrupo(false);
        }
    }

    async function sairDoGrupoSelecionado() {
        if (
            conversaSelecionada?.tipo !== "grupo" ||
            conversaSelecionada.somenteLeitura ||
            saindoDoGrupo
        ) {
            return;
        }

        const grupoId = conversaSelecionada.id;
        setSaindoDoGrupo(true);
        pararDeInformarDigitacao();
        cancelarGravacaoAudio();

        try {
            const resposta = await apiFetch(
                `/conversas/grupos/${grupoId}/participantes/eu`,
                { method: "DELETE" },
            );
            const resultado = await resposta.json().catch(() => null) as {
                grupoId?: number;
                totalParticipantes?: number;
                somenteLeitura?: boolean;
                message?: string | string[];
            } | null;

            if (
                !resposta.ok ||
                resultado?.grupoId !== grupoId ||
                resultado.totalParticipantes === undefined
            ) {
                const mensagemErro = Array.isArray(resultado?.message)
                    ? resultado.message.join(", ")
                    : resultado?.message;

                throw new Error(
                    mensagemErro ?? "Não foi possível sair do grupo.",
                );
            }

            setModalSairGrupoAberto(false);

            conversaAbertaIdRef.current = null;
            setConversas((conversasAtuais) =>
                conversasAtuais.filter((conversa) => conversa.id !== grupoId),
            );
            setConversaSelecionada(null);
            fecharChatMobile();

            setFeedbackFinalizacao({
                aberto: true,
                tipo: "sucesso",
                mensagem: "Você saiu do grupo e não possui mais acesso a ele.",
            });

        } catch (erro) {
            console.error("Erro ao sair do grupo:", erro);
            setFeedbackFinalizacao({
                aberto: true,
                tipo: "erro",
                mensagem:
                    erro instanceof Error
                        ? erro.message
                        : "Não foi possível sair do grupo.",
            });
        } finally {
            setSaindoDoGrupo(false);
        }
    }

    async function criarGrupo() {
        const nomeLimpo = nomeGrupo.trim();

        if (
            nomeLimpo.length < 3 ||
            contatosGrupoSelecionados.size < 2 ||
            criandoGrupo
        ) {
            return;
        }

        setCriandoGrupo(true);
        setErroCriacaoGrupo("");

        try {
            const resposta = await apiFetch(
                "/conversas/grupos",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        nome: nomeLimpo,
                        participanteIds: Array.from(
                            contatosGrupoSelecionados,
                        ),
                    }),
                },
            );

            if (!resposta.ok) {
                const resultado = await resposta.json().catch(() => null) as {
                    message?: string | string[];
                } | null;
                const mensagemErro = Array.isArray(resultado?.message)
                    ? resultado.message.join(", ")
                    : resultado?.message;

                throw new Error(
                    mensagemErro ?? "Não foi possível criar o grupo.",
                );
            }

            const grupo = await resposta.json() as ConversaGrupo;

            setModalGrupoAberto(false);
            adicionarEAbrirConversa(grupo);
        } catch (erro) {
            console.error("Erro ao criar grupo:", erro);
            setErroCriacaoGrupo(
                erro instanceof Error
                    ? erro.message
                    : "Não foi possível criar o grupo.",
            );
        } finally {
            setCriandoGrupo(false);
        }
    }

    function alternarContatoGrupo(contatoId: number) {
        setErroCriacaoGrupo("");
        setContatosGrupoSelecionados((selecionadosAtuais) => {
            const novosSelecionados = new Set(selecionadosAtuais);

            if (novosSelecionados.has(contatoId)) {
                novosSelecionados.delete(contatoId);
            } else {
                novosSelecionados.add(contatoId);
            }

            return novosSelecionados;
        });
    }

    function alternarContatoModalAdicionarPessoas(contatoId: number) {
        setErroAdicionarPessoasGrupo("");
        setContatosModalAdicionarPessoasSelecionados((selecionadosAtuais) => {
            const novosSelecionados = new Set(selecionadosAtuais);

            if (novosSelecionados.has(contatoId)) {
                novosSelecionados.delete(contatoId);
            } else {
                novosSelecionados.add(contatoId);
            }

            return novosSelecionados;
        });
    }

    async function selecionarUsuario(contato: UsuarioConversa) {
        if (!usuario || usuario.tipo === "user") {
            return;
        }

        try {
            const rota =
                ["admin", "superAdmin"].includes(usuario.tipo) ? "/conversas" : "/conversas/setor/usuario";

            const resposta = await apiFetch(rota, {
                method: "POST",
                headers: {
                "Content-Type": "application/json",
                },
                body: JSON.stringify({
                usuarioId: contato.id,
                }),
            });

            if (!resposta.ok) {
                const resultado = await resposta.json();

                throw new Error(
                Array.isArray(resultado.message)
                    ? resultado.message.join(", ")
                    : resultado.message,
                );
            }

            const conversa = (await resposta.json()) as Conversa;
            adicionarEAbrirConversa(conversa);
        } catch (erro) {
            console.error("Erro ao iniciar conversa:", erro);
        }
    }

    async function selecionarSetor(setor: Setor) {
        try {
            const resposta = await apiFetch(
                "/conversas/setor",
                {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    setorId: setor.id,
                }),
                },
            );

            const resultado = await resposta.json();

            if (!resposta.ok) {
                throw new Error(
                Array.isArray(resultado.message)
                    ? resultado.message.join(", ")
                    : resultado.message,
                );
            }

            adicionarEAbrirConversa(resultado);
        } catch (erro) {
            console.error("Erro ao iniciar atendimento:", erro);
        }
    }

    async function enviarStatusDigitacao(
        conversaId: number,
        digitando: boolean,
    ) {
        try {
            await apiFetch(
                `/conversas/${conversaId}/digitando`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ digitando }),
                },
            );
        } catch (erro) {
            console.error("Erro ao atualizar status de digitação:", erro);
        }
    }

    function limparTemporizadoresDigitacao() {
        if (intervaloDigitacaoRef.current !== null) {
            window.clearInterval(intervaloDigitacaoRef.current);
            intervaloDigitacaoRef.current = null;
        }

        if (timeoutDigitacaoRef.current !== null) {
            window.clearTimeout(timeoutDigitacaoRef.current);
            timeoutDigitacaoRef.current = null;
        }
    }

    function pararDeInformarDigitacao() {
        const conversaId = conversaDigitandoIdRef.current;
        const estavaDigitando = digitacaoAtivaRef.current;

        limparTemporizadoresDigitacao();
        conversaDigitandoIdRef.current = null;
        digitacaoAtivaRef.current = false;

        if (conversaId !== null && estavaDigitando) {
            void enviarStatusDigitacao(conversaId, false);
        }
    }

    function informarDigitacao(conteudo: string) {
        const conversaId = conversaSelecionada?.id;

        if (!conversaId || !conteudo) {
            pararDeInformarDigitacao();
            return;
        }

        if (
            conversaDigitandoIdRef.current !== null &&
            conversaDigitandoIdRef.current !== conversaId
        ) {
            pararDeInformarDigitacao();
        }

        conversaDigitandoIdRef.current = conversaId;

        if (!digitacaoAtivaRef.current) {
            digitacaoAtivaRef.current = true;
            void enviarStatusDigitacao(conversaId, true);

            intervaloDigitacaoRef.current = window.setInterval(
                () => void enviarStatusDigitacao(conversaId, true),
                INTERVALO_RENOVACAO_DIGITACAO_MS,
            );
        }

        if (timeoutDigitacaoRef.current !== null) {
            window.clearTimeout(timeoutDigitacaoRef.current);
        }

        timeoutDigitacaoRef.current = window.setTimeout(
            pararDeInformarDigitacao,
            TEMPO_PARAR_DIGITACAO_MS,
        );
    }

    function atualizarConversaComMensagem(novaMensagem: MensagemChat) {
        setConversas((conversasAtuais) =>
            conversasAtuais.reduce<Conversa[]>((resultado, conversa) => {
                if (conversa.id !== novaMensagem.conversaId) {
                    resultado.push(conversa);
                    return resultado;
                }

                const conversaAtualizada: Conversa = {
                    ...conversa,
                    mensagensNaoLidas: 0,
                    ...(conversa.tipo === "setor" && {
                        podeFinalizar: true,
                    }),
                    ultimaMensagem: {
                        id: novaMensagem.id,
                        conteudo: novaMensagem.conteudo,
                        origem: novaMensagem.origem,
                        arquivoNome: novaMensagem.arquivo?.nome,
                        arquivoTipo: novaMensagem.arquivo?.tipo,
                        enviadaEm: novaMensagem.enviadaEm,
                    },
                };

                resultado.unshift(conversaAtualizada);
                return resultado;
            }, []),
        );

        setConversaSelecionada((conversaAtual) =>
            conversaAtual?.id === novaMensagem.conversaId
                ? {
                    ...conversaAtual,
                    ...(conversaAtual.tipo === "setor" && {
                        podeFinalizar: true,
                    }),
                    ultimaMensagem: {
                        id: novaMensagem.id,
                        conteudo: novaMensagem.conteudo,
                        origem: novaMensagem.origem,
                        arquivoNome: novaMensagem.arquivo?.nome,
                        arquivoTipo: novaMensagem.arquivo?.tipo,
                        enviadaEm: novaMensagem.enviadaEm,
                    },
                }
                : conversaAtual,
        );
    }

    // Classifica o anexo local para que ele possa aparecer enquanto é enviado.
    function identificarTipoArquivoTemporario(
        arquivo: File,
    ): ArquivoMensagem["tipo"] {
        if (arquivo.type.startsWith("image/")) return "imagem";
        if (arquivo.type.startsWith("video/")) return "video";
        if (arquivo.type.startsWith("audio/")) return "audio";
        return "documento";
    }

    // O mesmo envio atende comunidades e conversas: texto/emojis ou FormData com anexos.
    async function enviarMensagem() {
        const conteudo = mensagem.trim();

        if (
            (!conteudo && !arquivoSelecionado) ||
            !conversaSelecionada ||
            !usuario ||
            enviandoMensagem
        ) {
            return;
        }

        pararDeInformarDigitacao();

        const conversaDestino = conversaSelecionada;
        const arquivoParaEnviar = arquivoSelecionado;
        const respostaParaEnviar = responderMensagem;
        const mensagemTemporariaId = proximaMensagemTemporariaIdRef.current--;
        const urlArquivoTemporario = arquivoParaEnviar
            ? URL.createObjectURL(arquivoParaEnviar)
            : null;
        const remetenteTemporario: MensagemChat["remetente"] =
            conversaDestino.tipo === "setor" && usuario.tipo === "funcionario"
                ? {
                    tipo: "setor",
                    id: usuario.sub,
                    nome: perfilUsuario?.nome ?? "Você",
                    fotoPerfilUrl: perfilUsuario?.foto_perfil_url,
                    tipoUsuario: usuario.tipo,
                    sigla_setor: conversaDestino.setor.sigla,
                }
                : {
                    tipo:
                        usuario.tipo === "admin"
                            ? "admin"
                            : usuario.tipo === "superAdmin"
                              ? "superAdmin"
                              : "usuario",
                    id: usuario.sub,
                    nome: perfilUsuario?.nome ?? "Você",
                    fotoPerfilUrl: perfilUsuario?.foto_perfil_url,
                    tipoUsuario: usuario.tipo,
                };
        const mensagemTemporaria: MensagemChat = {
            id: mensagemTemporariaId,
            conversaId: conversaDestino.id,
            conteudo,
            origem:
                conversaDestino.tipo === "setor" &&
                usuario.tipo === "funcionario"
                    ? "setor"
                    : "usuario",
            sistema: false,
            enviadaEm: new Date().toISOString(),
            statusEntrega: "enviando",
            remetente: remetenteTemporario,
            arquivo:
                arquivoParaEnviar && urlArquivoTemporario
                    ? {
                        nome: arquivoParaEnviar.name,
                        url: urlArquivoTemporario,
                        tipo: identificarTipoArquivoTemporario(
                            arquivoParaEnviar,
                        ),
                        mime: arquivoParaEnviar.type,
                        tamanho: arquivoParaEnviar.size,
                    }
                    : null,
            respondendoA: respostaParaEnviar
                ? {
                    id: respostaParaEnviar.id,
                    conteudo: respostaParaEnviar.conteudo,
                    remetente: respostaParaEnviar.remetente,
                    arquivo: respostaParaEnviar.arquivo,
                }
                : null,
        };

        // Um visto representa a mensagem local ainda sem confirmação da API.
        setMensagensChat((mensagensAtuais) => [
            ...mensagensAtuais,
            mensagemTemporaria,
        ]);
        setEnviandoMensagem(true);

        try {
            const corpo = arquivoParaEnviar
                ? new FormData()
                : JSON.stringify({
                    conteudo,
                    mensagemRespondidaId: respostaParaEnviar?.id,
                });

            if (corpo instanceof FormData) {
                if (conteudo) corpo.append("conteudo", conteudo);
                if (respostaParaEnviar) {
                    corpo.append(
                        "mensagemRespondidaId",
                        String(respostaParaEnviar.id),
                    );
                }
                corpo.append("arquivo", arquivoParaEnviar!);
            }

            const resposta = await apiFetch(
                `/conversas/${conversaDestino.id}/mensagens`,
                {
                method: "POST",
                headers: arquivoParaEnviar
                    ? undefined
                    : {
                        "Content-Type": "application/json",
                    },
                body: corpo,
                },
            );

            const resultado = await resposta.json();

            if (!resposta.ok) {
                throw new Error(
                Array.isArray(resultado.message)
                    ? resultado.message.join(", ")
                    : resultado.message,
                );
            }

            const novaMensagem = resultado as MensagemChat;

            ultimaMensagemChatIdRef.current = Math.max(
                ultimaMensagemChatIdRef.current,
                novaMensagem.id,
            );
            setMensagensChat((mensagensAtuais) =>
                [
                    ...mensagensAtuais.filter(
                        (item) =>
                            item.id !== mensagemTemporariaId &&
                            item.id !== novaMensagem.id,
                    ),
                    novaMensagem,
                ],
            );
            atualizarConversaComMensagem(novaMensagem);

            setMensagem("");
            setArquivoSelecionado(null);
            setResponderMensagem(null);
        } catch (erro) {
            setMensagensChat((mensagensAtuais) =>
                mensagensAtuais.filter(
                    (item) => item.id !== mensagemTemporariaId,
                ),
            );
            console.error("Erro ao enviar mensagem:", erro);
            window.alert(
                erro instanceof Error
                    ? erro.message
                    : "Não foi possível enviar a mensagem.",
            );
        } finally {
            if (urlArquivoTemporario) {
                URL.revokeObjectURL(urlArquivoTemporario);
            }
            setEnviandoMensagem(false);
        }
    }

    const usuariosFiltrados = usuarios.filter((usuario) =>
        usuario.nome.toLowerCase().includes(buscaUsuario.toLowerCase()),
    );

    const contatosGrupoFiltrados = contatosGrupo.filter((contato) => {
        if (contato.tipoUsuario === "user") {
            return false;
        }

        const busca = buscaContatoGrupo.trim().toLowerCase();
        const descricao = contato.setor
            ? `${contato.nome} ${contato.setor.nome} ${contato.setor.sigla}`
            : `${contato.nome} ${contato.tipoUsuario}`;

        return descricao.toLowerCase().includes(busca);
    });

    const contatosDisponiveisParaGrupo =
        contatosDisponiveisModalAdicionarPessoas.filter((contato) => {
            if (
                contato.tipoUsuario === "user" ||
                conversaSelecionada?.tipo !== "grupo" ||
                conversaSelecionada.participantes.some(
                    (participante) => participante.id === contato.id,
                )
            ) {
                return false;
            }

            const busca = buscaPessoaGrupo.trim().toLowerCase();
            const descricao = contato.setor
                ? `${contato.nome} ${contato.setor.nome} ${contato.setor.sigla}`
                : `${contato.nome} ${contato.tipoUsuario}`;

            return descricao.toLowerCase().includes(busca);
        });

    const setoresDisponiveisParaEnvio =
        setoresDisponiveisTransferencia.filter((setor) => {
            const busca = buscarSetorTranfConversa.trim().toLowerCase();
            const descricao = [
                setor.setor,
                setor.sigla_setor,
                setor.secretaria?.nome,
                setor.secretaria?.sigla_secretaria,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return descricao.includes(busca);
        });

    const secretariasDisponiveisParaEnvio =
        setoresDisponiveisParaEnvio.reduce<
            Array<NonNullable<Setor["secretaria"]>>
        >((secretarias, setor) => {
            if (
                setor.secretaria &&
                !secretarias.some(
                    (secretaria) => secretaria.id === setor.secretaria?.id,
                )
            ) {
                secretarias.push(setor.secretaria);
            }

            return secretarias;
        }, []);

    const setoresDaSecretariaSelecionada =
        secretariaTransferenciaSelecionadaId === null
            ? []
            : setoresDisponiveisParaEnvio.filter(
                (setor) =>
                    setor.secretaria?.id ===
                    secretariaTransferenciaSelecionadaId,
            );

    const secretariaTransferenciaSelecionada =
        setoresDisponiveisTransferencia.find(
            (setor) =>
                setor.secretaria?.id ===
                secretariaTransferenciaSelecionadaId,
        )?.secretaria ?? null;

    function adicionarEAbrirConversa(conversa: Conversa) {
        const conversaNormalizada: Conversa = {
            ...conversa,
            mensagensNaoLidas: conversa.mensagensNaoLidas ?? 0,
        };

        setConversas((conversasAtuais) => {
            const jaExiste = conversasAtuais.some(
                (item) => item.id === conversaNormalizada.id,
            );

            return jaExiste
                ? conversasAtuais.map((item) =>
                    item.id === conversaNormalizada.id
                        ? conversaNormalizada
                        : item,
                )
                : [conversaNormalizada, ...conversasAtuais];
        });

        setNovaConversaAberta(false);
        void abrirConversa(conversaNormalizada);
    }

    async function marcarConversaComoLida(
        conversaId: number,
    ) {
        try {
            const resposta = await apiFetch(
                `/conversas/${conversaId}/leitura`,
                {
                    method: "POST",
                },
            );

            if (!resposta.ok) {
                throw new Error("Não foi possível marcar a conversa como lida.");
            }

            const leitura = await resposta.json() as {
                ultimaMensagemLidaId: number | null;
            };

            estadoConversasRef.current.set(conversaId, {
                ultimaMensagemId: leitura.ultimaMensagemLidaId,
                mensagensNaoLidas: 0,
            });

            setConversas((conversasAtuais) =>
                conversasAtuais.map((item) =>
                    item.id === conversaId
                        ? { ...item, mensagensNaoLidas: 0 }
                        : item,
                ),
            );

            setConversaSelecionada((conversaAtual) =>
                conversaAtual?.id === conversaId &&
                conversaAtual.mensagensNaoLidas !== 0
                    ? { ...conversaAtual, mensagensNaoLidas: 0 }
                    : conversaAtual,
            );
        } catch (erro) {
            console.error("Erro ao marcar conversa como lida:", erro);
        }
    }

    // Consulta o maior ID que os destinatários já visualizaram.
    async function atualizarStatusVisualizacao(conversaId: number) {
        try {
            const resposta = await apiFetch(
                `/conversas/${conversaId}/status-leitura`,
            );

            if (!resposta.ok) {
                throw new Error(
                    "Não foi possível consultar a visualização das mensagens.",
                );
            }

            const status = await resposta.json() as {
                ultimaMensagemVisualizadaId: number | null;
            };

            if (conversaAbertaIdRef.current === conversaId) {
                setUltimaMensagemVisualizadaId(
                    status.ultimaMensagemVisualizadaId,
                );
            }
        } catch (erro) {
            console.error("Erro ao consultar status de leitura:", erro);
        }
    }

    // Todas as conversas, inclusive comunidades, carregam o histórico pelas mesmas rotas.
    async function abrirConversa(conversa: Conversa) {
        if (conversa.tipo !== "comunidade") {
            comunidadeAbertaIdRef.current = null;
            setDados(null);
        }
        pararDeInformarDigitacao();
        cancelarGravacaoAudio();
        setMensagem("");
        setArquivoSelecionado(null);
        setSeletorEmojiAberto(false);
        setMenuAbertoArquivo(false);
        setOpcoesMensagens(null);

        if (
            conversaSelecionada?.id !== conversa.id ||
            conversaSelecionada.tipo !== conversa.tipo
        ) {
            setResponderMensagem(null);
        }

        conversaAbertaIdRef.current = conversa.id;
        ultimaMensagemChatIdRef.current = 0;
        historicoChatCarregadoRef.current = false;
        rolagemInicialPendenteRef.current = true;
        alturaAntesDoHistoricoRef.current = null;
        setConversaSelecionada(conversa);
        setUsuariosDigitando([]);
        setChatMobileAberto(true);
        setMensagensChat([]);
        setUltimaMensagemVisualizadaId(null);
        setCarregandoMensagens(true);
        setCarregandoMensagensAnteriores(false);
        setTemMensagensAnteriores(false);

        try {
            const resposta = await apiFetch(
                `/conversas/${conversa.id}/mensagens?limite=${LIMITE_HISTORICO_MENSAGENS}`,
            );

            if (!resposta.ok) {
                throw new Error("Não foi possível carregar as mensagens.");
            }

            const dados: MensagemChat[] = await resposta.json();

            if (conversaAbertaIdRef.current !== conversa.id) {
                return;
            }

            ultimaMensagemChatIdRef.current = Math.max(
                0,
                ...dados.map((item) => item.id),
            );
            historicoChatCarregadoRef.current = true;
            setMensagensChat(dados);
            setTemMensagensAnteriores(
                dados.length === LIMITE_HISTORICO_MENSAGENS,
            );
            await Promise.all([
                marcarConversaComoLida(conversa.id),
                atualizarStatusVisualizacao(conversa.id),
            ]);
        } catch (erro) {
            console.error(erro);

            if (conversaAbertaIdRef.current === conversa.id) {
                setMensagensChat([]);
                setTemMensagensAnteriores(false);
            }
        } finally {
            if (conversaAbertaIdRef.current === conversa.id) {
                setCarregandoMensagens(false);
            }
        }
    }

    async function carregarMensagensAnteriores() {
        const conversaId = conversaSelecionada?.id;
        const primeiraMensagemId = mensagensChat[0]?.id;

        if (
            !conversaId ||
            !primeiraMensagemId ||
            carregandoMensagensAnteriores
        ) {
            return;
        }

        setCarregandoMensagensAnteriores(true);

        try {
            const resposta = await apiFetch(
                `/conversas/${conversaId}/mensagens?antesDe=${primeiraMensagemId}&limite=${LIMITE_HISTORICO_MENSAGENS}`,
            );

            if (!resposta.ok) {
                throw new Error("Não foi possível carregar as mensagens anteriores.");
            }

            const dados = await resposta.json() as MensagemChat[];

            if (conversaAbertaIdRef.current !== conversaId) {
                return;
            }

            dados.forEach((item) => idsAnimadosRef.current.add(item.id));
            alturaAntesDoHistoricoRef.current =
                mensagensContainerRef.current?.scrollHeight ?? null;

            setMensagensChat((mensagensAtuais) => {
                const idsAtuais = new Set(
                    mensagensAtuais.map((item) => item.id),
                );
                const mensagensAnteriores = dados.filter(
                    (item) => !idsAtuais.has(item.id),
                );

                return [...mensagensAnteriores, ...mensagensAtuais];
            });
            setTemMensagensAnteriores(
                dados.length === LIMITE_HISTORICO_MENSAGENS,
            );
        } catch (erro) {
            console.error(erro);
        } finally {
            if (conversaAbertaIdRef.current === conversaId) {
                setCarregandoMensagensAnteriores(false);
            }
        }
    }

    // Seleciona a comunidade e, para quem já participa, abre seu chat completo dentro do Home.
    async function abrirComunidade(comunidade: Comunidade) {
        const abreChat = comunidade.participa || 
            comunidade.funcaoDosMembrosComunidade?.tipo_funcao === "seguidor";
        
        fecharChatMobile();
        cancelarGravacaoAudio();
        setConversaSelecionada(null);
        setDados(comunidade);
        comunidadeAbertaIdRef.current = comunidade.id;
        setErroComunidade("");
        setCarregandoComunidade(abreChat);
        setEntrandoComunidade(false);
        setChatMobileAberto(true);
        if (!abreChat) return;

        try {
            // O backend devolve o ID da conversa para reutilizar envio de texto, áudio e arquivos.
            const resposta = await apiFetch(`/comunidades/${comunidade.id}/conversa`);
            const dados = await resposta.json();
            if (!resposta.ok) {
                throw new Error(Array.isArray(dados.message) ? dados.message.join(", ") : dados.message);
            }
            // Uma resposta atrasada não pode substituir a comunidade/conversa aberta depois.
            if (comunidadeAbertaIdRef.current !== comunidade.id) return;
            const conversa = dados as ConversaComunidade;
            setDados({ ...comunidade, totalParticipantes: conversa.totalParticipantes });
            await abrirConversa(conversa);
        } catch (erro) {
            if (comunidadeAbertaIdRef.current === comunidade.id) {
                setErroComunidade(erro instanceof Error ? erro.message : "Não foi possível abrir a comunidade.");
            }
        } finally {
            if (comunidadeAbertaIdRef.current === comunidade.id) setCarregandoComunidade(false);
        }
    }

    // Registra a participação antes de permitir leitura e envio de mensagens.
    async function entrarComunidade() {
        if (!dados || entrandoComunidade) return;
        const comunidadeId = dados.id;
        setEntrandoComunidade(true);
        setErroComunidade("");
        try {
            const resposta = await apiFetch(`/comunidades/${comunidadeId}/entrar`, { method: "POST" });
            const dados = await resposta.json();
            if (!resposta.ok) {
                throw new Error(Array.isArray(dados.message) ? dados.message.join(", ") : dados.message);
            }
            if (comunidadeAbertaIdRef.current === comunidadeId) await abrirComunidade(dados as Comunidade);
        } catch (erro) {
            if (comunidadeAbertaIdRef.current === comunidadeId) {
                setErroComunidade(erro instanceof Error ? erro.message : "Não foi possível entrar na comunidade.");
            }
        } finally {
            if (comunidadeAbertaIdRef.current === comunidadeId) setEntrandoComunidade(false);
        }
    }

    const [seguindoComunidade, setSeguindoComunidade] = useState(false);

    async function seguirComunidade() {

        if (!dados || seguindoComunidade) return;

        const comunidadeId = dados.id;
        setSeguindoComunidade(true);
        setErroComunidade("");

        try {
            const resposta = await apiFetch(`/comunidades/${comunidadeId}/seguir`, 
                { method: "POST" }
            );

            const resultado = await resposta.json();

            if (!resposta.ok) {
                throw new Error(Array.isArray(resultado.message) ? resultado.message.join(", ") : resultado.message);
            }

            if (comunidadeAbertaIdRef.current === comunidadeId) {
                await abrirComunidade(resultado as Comunidade);
            }

        } catch (erro) {

            if (comunidadeAbertaIdRef.current === comunidadeId) {
                setErroComunidade(erro instanceof Error ? erro.message : "Não foi possível seguir a comunidade.");
            }

        } finally {
            if (comunidadeAbertaIdRef.current === comunidadeId) setSeguindoComunidade(false);
        }
    }

    // Fecha a comunidade e impede que buscas pendentes reabram seu chat.
    function voltarDasComunidades() {
        comunidadeAbertaIdRef.current = null;
        setDados(null);
        setConversaSelecionada(null);
        cancelarGravacaoAudio();
        fecharChatMobile();
    }

    function fecharChatMobile() {
        pararDeInformarDigitacao();
        conversaAbertaIdRef.current = null;
        ultimaMensagemChatIdRef.current = 0;
        historicoChatCarregadoRef.current = false;
        alturaAntesDoHistoricoRef.current = null;
        setChatMobileAberto(false);
        setUltimaMensagemVisualizadaId(null);
        setUsuariosDigitando([]);
        setCarregandoMensagensAnteriores(false);
        setTemMensagensAnteriores(false);
    }

    function nomeDaConversa(conversa: Conversa) {
        if (conversa.tipo === "grupo" || conversa.tipo === "comunidade") {
            return conversa.nome;
        }

        if (conversa.tipo === "privada") {
            return conversa.contato.nome;
        }

        return usuario?.tipo === "user"
        ? conversa.setor.nome
        : conversa.usuario.nome;
    }

    function fotoDaConversa(conversa: Conversa) {
        if (conversa.tipo === "comunidade") return conversa.imagem;
        if (conversa.tipo === "grupo") {
            return null;
        }

        if (conversa.tipo === "privada") {
            return conversa.contato.foto_perfil_url;
        }

        return usuario?.tipo === "user"
            ? null
            : conversa.usuario.foto_perfil_url;
    }

    function subtituloDaConversa(conversa: Conversa) {
        if (conversa.tipo === "grupo" || conversa.tipo === "comunidade") {
            return conversa.somenteLeitura
                ? `${conversa.totalParticipantes} participantes • somente leitura`
                : `${conversa.totalParticipantes} participantes`;
        }

        if (conversa.tipo === "setor") {
            return usuario?.tipo === "user"
                ? conversa.secretaria.nome
                : conversa.setor.nome
        }

        if (conversa.somenteLeitura) {
            return "Visualização de segurança • somente leitura";
        }

        if (conversa.contato.tipo_usuario === "funcionario") {
            return "Conversa privada com funcionário";
        }

        if (conversa.contato.tipo_usuario === "admin") {
            return "Conversa privada com administrador";
        }

        if (conversa.contato.tipo_usuario === "superAdmin") {
            return "Conversa privada com super administrador";
        }

        return "Conversa privada";
    }

    const conversasFiltradas = conversas.filter((conversa) => {
        const correspondeAoFiltro =
            filtroAtivo === "nao-lidas"
                ? conversa.mensagensNaoLidas > 0
                : filtroAtivo === "grupos"
                    ? conversa.tipo === "grupo"
                    : true;

        if (!correspondeAoFiltro) {
            return false;
        }

        const texto = conversa.tipo === "privada"
            ? `${conversa.contato.nome} ${conversa.contato.tipo_usuario}`
            : conversa.tipo === "grupo" || conversa.tipo === "comunidade"
                ? `${conversa.nome} ${conversa.participantes
                    .map((participante) => participante.nome)
                    .join(" ")}`
                : `${conversa.setor.nome} ${conversa.setor.sigla} ${conversa.usuario.nome}`;

        return texto.toLowerCase().includes(buscaConversa.trim().toLowerCase());
    });

    //verifica se o usuario logado é admin da comunidade
    const ehAdminDaComunidade = buscarFuncoesDosUsuariosNaComunidade.some(
        (membro) =>
            membro.usuario_id === usuario?.sub &&
            membro.tipo_funcao === "admin",
    );

    const souSeguidor =
        conversaSelecionada?.tipo === "comunidade" && 
        dados?.funcaoDosMembrosComunidade?.tipo_funcao === "seguidor";

    const podeEnviarMensagem =
        conversaSelecionada !== null &&
        !souSeguidor &&
        !(
            (conversaSelecionada.tipo === "privada" ||
                conversaSelecionada.tipo === "grupo" ||
                conversaSelecionada.tipo === "comunidade") &&
            conversaSelecionada.somenteLeitura
        ) && 
        (conversaSelecionada.tipo !== "comunidade" || ehAdminDaComunidade);

    const setoresFiltrados = setores.filter((setor) => {
        const busca = buscaUsuario.trim().toLowerCase();

        return (
            setor.setor.toLowerCase().includes(busca) ||
            setor.sigla_setor.toLowerCase().includes(busca)
        );
    });

    async function DeixarSeguirComunidade() {
        if (!dados || deixandoDeSeguir) return;

        const comunidadeId = dados?.id;
        setDeixandoDeSeguir(true);
        setMenuAbertoSeguindoComunidade(false);

        try {
            const resposta = await apiFetch(`/comunidades/${comunidadeId}/deixar-seguir`, 
                { method: "DELETE" },
            );

            if (!resposta.ok) {
                const erroData = await resposta.json().catch(() => null);
            
                // O NestJS costuma enviar a mensagem dentro de erroData.message
                // (pode ser uma string ou um array de strings caso haja validação de DTO)
                const mensagemDoBackend = Array.isArray(erroData?.message)
                    ? erroData.message.join(", ")
                    : erroData?.message;

                // Lança o erro com a mensagem do back-end (ou uma mensagem padrão caso não venha nada)
                throw new Error(mensagemDoBackend || "Não foi possível para de seguir a comunidade.");
            }

            voltarDasComunidades();

            setFeedback({
                aberto: true,
                tipo: "sucesso",
                mensagem: "Você deixou de seguir esta comunidade."
            });

        } catch (erro) {
            setFeedback({
                aberto: true,
                tipo: "erro",
                mensagem: `${erro}`
            })
        } finally {
            setDeixandoDeSeguir(false);
        }
    }

    useEffect(() => {
        const conversaId = conversaSelecionada?.id;

        if (!conversaId || !chatMobileAberto) {
            setUsuariosDigitando([]);
            return;
        }

        let ativo = true;
        let buscando = false;

        async function buscarUsuariosDigitando() {
            if (buscando || document.visibilityState === "hidden") {
                return;
            }

            buscando = true;

            try {
                const resposta = await apiFetch(
                    `/conversas/${conversaId}/digitando`,
                );

                if (!resposta.ok) {
                    return;
                }

                const dados = await resposta.json() as {
                    usuarios: UsuarioDigitando[];
                };

                if (ativo) {
                    setUsuariosDigitando((usuariosAtuais) => {
                        const naoMudou =
                            usuariosAtuais.length === dados.usuarios.length &&
                            usuariosAtuais.every((item, indice) =>
                                item.id === dados.usuarios[indice]?.id &&
                                item.nome === dados.usuarios[indice]?.nome,
                            );

                        return naoMudou
                            ? usuariosAtuais
                            : dados.usuarios;
                    });
                }
            } catch (erro) {
                console.error("Erro ao consultar digitação:", erro);
            } finally {
                buscando = false;
            }
        }

        void buscarUsuariosDigitando();

        const intervalo = window.setInterval(
            () => void buscarUsuariosDigitando(),
            INTERVALO_CONSULTA_DIGITACAO_MS,
        );

        return () => {
            ativo = false;
            window.clearInterval(intervalo);
        };
    }, [chatMobileAberto, conversaSelecionada?.id]);

    useLayoutEffect(() => {
        const indicador = indicadorDigitandoRef.current;

        if (!indicador || usuariosDigitando.length === 0) {
            return;
        }

        const pontos = indicador.querySelectorAll(".digitando-ponto");

        // ANIMAÇÃO GSAP DO BALÃO "DIGITANDO"
        const contextoGsap = gsap.context(() => {
            gsap.fromTo(
                indicador,
                { opacity: 0, scale: 0.85, y: 6 },
                {
                    opacity: 1,
                    scale: 1,
                    y: 0,
                    duration: 0.28,
                    ease: "back.out(1.8)",
                },
            );

            gsap.fromTo(
                pontos,
                { y: 0, opacity: 0.35 },
                {
                    y: -3,
                    opacity: 1,
                    duration: 0.45,
                    stagger: 0.14,
                    ease: "sine.inOut",
                    repeat: -1,
                    yoyo: true,
                },
            );
        }, indicador);

        return () => contextoGsap.revert();
    }, [usuariosDigitando]);

    useEffect(() => {
        const conversaId = conversaSelecionada?.id;

        if (!conversaId || !chatMobileAberto) {
            return;
        }

        let ativo = true;
        let buscando = false;

        async function buscarNovasMensagens() {
            if (
                buscando ||
                document.visibilityState === "hidden" ||
                !historicoChatCarregadoRef.current
            ) {
                return;
            }

            buscando = true;

            try {
                const ultimaMensagemId =
                    ultimaMensagemChatIdRef.current;
                const [resposta] = await Promise.all([
                    apiFetch(
                        `/conversas/${conversaId}/mensagens?depoisDe=${ultimaMensagemId}&limite=${LIMITE_NOVAS_MENSAGENS}`,
                    ),
                    atualizarStatusVisualizacao(conversaId!),
                ]);

                if (!resposta.ok) {
                    throw new Error("Não foi possível atualizar as mensagens.");
                }

                const dados = await resposta.json() as MensagemChat[];

                if (
                    !ativo ||
                    conversaAbertaIdRef.current !== conversaId
                ) {
                    return;
                }

                const mensagensNovas = dados.filter(
                    (item) => item.id > ultimaMensagemChatIdRef.current,
                );

                if (mensagensNovas.length === 0) {
                    return;
                }

                const recebeuMensagemDeOutraPessoa =
                    mensagensNovas.some(
                        (item) => !mensagemFoiEnviadaPeloUsuario(
                            item,
                            usuario,
                            conversaSelecionada,
                        ),
                    );

                ultimaMensagemChatIdRef.current = Math.max(
                    ultimaMensagemChatIdRef.current,
                    ...mensagensNovas.map((item) => item.id),
                );

                setMensagensChat((mensagensAtuais) => {
                    const idsAtuais = new Set(
                        mensagensAtuais.map((item) => item.id),
                    );

                    return [
                        ...mensagensAtuais,
                        ...mensagensNovas.filter(
                            (item) => !idsAtuais.has(item.id),
                        ),
                    ];
                });

                const ultimaMensagem = mensagensNovas.at(-1);

                if (ultimaMensagem) {
                    atualizarConversaComMensagem(ultimaMensagem);
                }

                if (recebeuMensagemDeOutraPessoa) {
                    alertarNovaMensagem();
                }

                await marcarConversaComoLida(conversaId);
            } catch (erro) {
                console.error("Erro ao atualizar mensagens:", erro);
            } finally {
                buscando = false;
            }
        }

        function atualizarAoVoltarParaPagina() {
            if (document.visibilityState === "visible") {
                void buscarNovasMensagens();
            }
        }

        const intervalo = window.setInterval(
            () => void buscarNovasMensagens(),
            INTERVALO_MENSAGENS_MS,
        );

        document.addEventListener(
            "visibilitychange",
            atualizarAoVoltarParaPagina,
        );

        return () => {
            ativo = false;
            window.clearInterval(intervalo);
            document.removeEventListener(
                "visibilitychange",
                atualizarAoVoltarParaPagina,
            );
        };
    }, [chatMobileAberto, conversaSelecionada, usuario]);

    useEffect(() => {
        idsAnimadosRef.current.clear();
        balõesRef.current.clear();
    }, [conversaSelecionada?.id]);

    useEffect(() => {
        if (carregandoMensagens) return;

        const mensagensNovas = mensagensChat.filter(
            (item) => !idsAnimadosRef.current.has(item.id),
        );

        const elementos = mensagensNovas
            .map((item) => balõesRef.current.get(item.id))
            .filter((elemento): elemento is HTMLElement => Boolean(elemento));

        mensagensNovas.forEach((item) => idsAnimadosRef.current.add(item.id));

        if (elementos.length > 0) {
            gsap.fromTo(
                elementos,
                { opacity: 0, scale: 0.7, y: 10 },
                {
                    opacity: 1,
                    scale: 1,
                    y: 0,
                    duration: 0.35,
                    ease: "back.out(2)",
                    stagger: {
                        each: 0.08,
                        from: "end",
                    },
                },
            );
        }

        const idsAtuais = new Set(mensagensChat.map((item) => item.id));

        for (const id of balõesRef.current.keys()) {
            if (!idsAtuais.has(id)) {
                balõesRef.current.delete(id);
            }
        }
    }, [mensagensChat, carregandoMensagens]);

    useLayoutEffect(() => {
        const container = mensagensContainerRef.current;

        if (!container || carregandoMensagens) {
            return;
        }

        if (alturaAntesDoHistoricoRef.current !== null) {
            const alturaAnterior = alturaAntesDoHistoricoRef.current;
            alturaAntesDoHistoricoRef.current = null;
            container.scrollTop +=
                container.scrollHeight - alturaAnterior;
            return;
        }

        if (rolagemInicialPendenteRef.current) {
            rolagemInicialPendenteRef.current = false;

            const rolarParaOFim = () => {
                container.scrollTop = container.scrollHeight;
            };

            rolarParaOFim();
            const quadro = window.requestAnimationFrame(rolarParaOFim);
            const esperaMidia = window.setTimeout(rolarParaOFim, 150);

            return () => {
                window.cancelAnimationFrame(quadro);
                window.clearTimeout(esperaMidia);
            };
        }

        container.scrollTo({
            top: container.scrollHeight,
            behavior: "smooth",
        });
    }, [mensagensChat, carregandoMensagens, usuariosDigitando.length]);

    function adicionarEmoji(emoji: string) {
        setMensagem((mensagemAtual) => mensagemAtual + emoji);
    }

    function abrirSeletorArquivo(referencia: RefObject<HTMLInputElement | null>) {
        referencia.current?.click();
        setMenuAbertoArquivo(false);
    }

    function selecionarArquivo(event: ChangeEvent<HTMLInputElement>) {
        const arquivo = event.target.files?.[0];

        if (arquivo && arquivo.size > 25 * 1024 * 1024) {
            window.alert("O arquivo deve ter no máximo 25 MB.");
        } else if (arquivo) {
            setArquivoSelecionado(arquivo);
        }

        event.target.value = "";
    }

    async function alternarGravacaoAudio() {
        const gravadorAtivo = gravadorAudioRef.current;

        if (gravadorAtivo) {
            const cicloAtual = cicloGravacaoAudioRef.current;
            gravadorAudioRef.current = null;
            processandoGravacaoAudioRef.current = true;
            setProcessandoGravacaoAudio(true);

            try {
                const arquivo = await gravadorAtivo.parar();

                if (cicloAtual !== cicloGravacaoAudioRef.current) {
                    return;
                }

                if (arquivo.size > 25 * 1024 * 1024) {
                    window.alert("A gravação deve ter no máximo 25 MB.");
                    return;
                }

                setArquivoSelecionado(arquivo);
            } catch (erro) {
                if (cicloAtual === cicloGravacaoAudioRef.current) {
                    console.error("Erro ao finalizar a gravação:", erro);
                    window.alert(obterMensagemErroGravacaoAudio(erro));
                }
            } finally {
                if (cicloAtual === cicloGravacaoAudioRef.current) {
                    processandoGravacaoAudioRef.current = false;
                    setProcessandoGravacaoAudio(false);
                    setGravandoAudio(false);
                }
            }

            return;
        }

        if (processandoGravacaoAudioRef.current) {
            return;
        }

        const cicloAtual = ++cicloGravacaoAudioRef.current;
        processandoGravacaoAudioRef.current = true;
        setProcessandoGravacaoAudio(true);

        try {
            const gravador = await iniciarGravacaoAudio();

            if (cicloAtual !== cicloGravacaoAudioRef.current) {
                gravador.cancelar();
                return;
            }

            gravadorAudioRef.current = gravador;
            setGravandoAudio(true);
        } catch (erro) {
            if (cicloAtual === cicloGravacaoAudioRef.current) {
                console.error("Erro ao acessar o microfone:", erro);
                window.alert(obterMensagemErroGravacaoAudio(erro));
            }
        } finally {
            if (cicloAtual === cicloGravacaoAudioRef.current) {
                processandoGravacaoAudioRef.current = false;
                setProcessandoGravacaoAudio(false);
            }
        }
    }

    useEffect(() => {
        async function receberFuncaoUsuarioComunidade(comunidade: Comunidade) {
            try {
                const resposta = await apiFetch(`/comunidades/${comunidade?.id}/funcaoComunidade`)

                if (!resposta.ok) {
                    throw new Error("Não foi possivel buscar a função dos usuários na comunidade")
                }

                const resultado: FuncaoDosMembrosComunidade[] = await resposta.json();
                setBuscarFuncoesDosUsuariosNaComunidade(resultado);

            } catch (erro) {
                setFeedback({
                    aberto: true,
                    tipo: "erro",
                    mensagem: `${erro}`
                });
            }
        }

        if (dados?.id) {
            void receberFuncaoUsuarioComunidade(dados)
        }
    }, [dados?.id])

    function cancelarGravacaoAudio() {
        cicloGravacaoAudioRef.current += 1;
        gravadorAudioRef.current?.cancelar();
        gravadorAudioRef.current = null;
        processandoGravacaoAudioRef.current = false;
        setProcessandoGravacaoAudio(false);
        setGravandoAudio(false);
    }

    useEffect(() => () => {
        cicloGravacaoAudioRef.current += 1;
        gravadorAudioRef.current?.cancelar();
        gravadorAudioRef.current = null;
    }, []);

    function formatarTamanhoArquivo(tamanho: number) {
        if (tamanho < 1024) {
            return `${tamanho} B`;
        }

        if (tamanho < 1024 * 1024) {
            return `${(tamanho / 1024).toFixed(1)} KB`;
        }

        return `${(tamanho / (1024 * 1024)).toFixed(1)} MB`;
    }

    function obterUrlArquivo(url: string) {
        return url.startsWith("http") || url.startsWith("blob:")
            ? url
            : `${import.meta.env.VITE_API_URL}${url}`;
    }

    function renderizarAvatar(
        nome: string,
        fotoUrl?: string | null,
        comunidade = false,
    ) {
        return (
            <>
                {comunidade ? iconeComunidade : (
                    <span aria-hidden="true">{nome.charAt(0).toUpperCase()}</span>
                )}
                {fotoUrl && (
                    <img
                        src={obterUrlArquivo(fotoUrl)}
                        alt=""
                        onError={(evento) => evento.currentTarget.remove()}
                    />
                )}
            </>
        );
    }

    function irParaMensagem(mensagemId: number) {
        const balao = balõesRef.current.get(mensagemId);

        if (!balao) {
            return;
        }

        balao.scrollIntoView({
            behavior: "smooth",
            block: "center",
        });
        balao.classList.remove("mensagem-balao--localizada");
        void balao.offsetWidth;
        balao.classList.add("mensagem-balao--localizada");
    }

    function irParaMensagemRespondida() {
        if (responderMensagem) {
            irParaMensagem(responderMensagem.id);
        }
    }

    const respostaFoiEnviadaPorMim =
        responderMensagem !== null &&
        mensagemFoiEnviadaPeloUsuario(
            responderMensagem,
            usuario,
            conversaSelecionada,
        );

    return (
        <main className={`home ${chatMobileAberto ? "home--chat-mobile-aberto" : ""}`}>
        <aside className="home-sidebar" aria-label="Navegação principal">
            <img
                className="home-sidebar__marca"
                src={brasao}
                alt=""
                width={32}
                height={40}
            />

            <div className="home-sidebar__navegacao">
                <button
                    type="button"
                    className={`home-sidebar__item ${
                        itemSidebarAtivo === "conversas"
                            ? "home-sidebar__item--ativo"
                            : ""
                    }`}
                    onClick={() => {
                        setItemSidebarAtivo("conversas");
                        if (dados) {
                            voltarDasComunidades();
                        }
                    }}
                    aria-label="Conversas"
                    aria-pressed={itemSidebarAtivo === "conversas"}
                    title="Conversas"
                >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
                        <path d="M8 10h.01M12 10h.01M16 10h.01" />
                    </svg>
                    <span className="home-sidebar__rotulo">Conversas</span>
                </button>

                <button
                    type="button"
                    className={`home-sidebar__item ${
                        itemSidebarAtivo === "comunidades"
                            ? "home-sidebar__item--ativo"
                            : ""
                    }`}
                    onClick={() => {
                        setItemSidebarAtivo("comunidades");
                        if (itemSidebarAtivo !== "comunidades") {
                            fecharChatMobile();
                            cancelarGravacaoAudio();
                            setConversaSelecionada(null);
                        }
                    }}
                    aria-label="Comunidades"
                    aria-pressed={itemSidebarAtivo === "comunidades"}
                    title="Comunidades"
                >
                    {iconeComunidade}
                    <span className="home-sidebar__rotulo">Comunidades</span>
                </button>

                <span
                    className="home-sidebar__divisor"
                    aria-hidden="true"
                />

                <button
                    type="button"
                    className={`home-sidebar__item home-sidebar__item-frida ${
                        itemSidebarAtivo === "frida"
                            ? "home-sidebar__item--ativo"
                            : ""
                    }`}
                    onClick={() => setItemSidebarAtivo("frida")}
                    aria-label="Frida"
                    aria-pressed={itemSidebarAtivo === "frida"}
                    title="Frida"
                >
                    <img
                        className="home-sidebar__frida"
                        src={imgFrida}
                        alt="Imagem da Frida"
                    />
                    <span className="home-sidebar__rotulo">Frida</span>
                </button>
            </div>

            <div className="home-sidebar__perfil">
                {renderizarAvatar(
                    perfilUsuario?.nome || "Usuário",
                    perfilUsuario?.foto_perfil_url,
                )}
                <i />
            </div>
        </aside>

        <aside className="conversas" data-lenis-prevent>
            {itemSidebarAtivo === "comunidades" && (
                <Comunidades aoAbrir={abrirComunidade} comunidadeSelecionada={dados} />
            )}

            {itemSidebarAtivo === "conversas" && (
                <>
                    <header className="conversas-header">
                    <div className="header-name">
                        <span className="header-title">Fala Pommer</span>
                    </div>
                    <div className="header-menu">
                        {usuario && (
                        <button
                            type="button"
                            className="header-menu-button header-menu-button--nova-conversa"
                            onClick={abrirNovaConversa}
                            aria-label="Nova conversa"
                            title="Nova conversa"
                        >
                            <span className="header-menu-icon">
                                <svg
                                    width="24"
                                    height="24"
                                    className="header-menu-svg mensagem"
                                    viewBox="0 0 16 16"
                                >
                                    <path className="conversa-icone-path" fill="black" fillRule="evenodd" transform="translate(0.5 0.5) scale(0.68)" d="M19.33 4C20.81 4 22 5.2 22 6.67v10.66c0 1.48-1.2 2.67-2.67 2.67H5.67A2.67 2.67 0 0 1 3 17.33V8.85L.94 5.53A1 1 0 0 1 1.8 4h17.54Zm-9.8 9h1.98v1.97c0 .43.25.85.67.98a1 1 0 0 0 1.31-.94v-2.02h1.98c.43 0 .85-.25.98-.67a1 1 0 0 0-.94-1.31h-2.02V9.03c0-.43-.25-.85-.67-.98a1 1 0 0 0-1.31.94v2.02H9.49a1 1 0 0 0-.94 1.31c.13.42.55.67.98.67Z" clipRule="evenodd"></path>
                                </svg>
                            </span>
                        </button>
                        )}
                        <button
                        ref={botaoMenuRef}
                        type="button"
                        className="header-menu-button"
                        onClick={() => setMenuAberto((aberto) => !aberto)}
                        aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
                        aria-expanded={menuAberto}
                        aria-controls="menu-principal"
                        >
                            <span className="header-menu-icon">
                                <svg
                                className="header-menu-svg"
                                viewBox="0 0 24 24"
                                height="24"
                                width="24"
                                preserveAspectRatio="xMidYMid meet"
                                >
                                <circle
                                    className="menu-dot menu-dot-top"
                                    cx="12"
                                    cy="6"
                                    r="2"
                                />
                                <circle
                                    className="menu-dot menu-dot-middle"
                                    cx="12"
                                    cy="12"
                                    r="2"
                                />
                                <circle
                                    className="menu-dot menu-dot-bottom"
                                    cx="12"
                                    cy="18"
                                    r="2"
                                />
                                </svg>
                            </span>
                        </button>
                    </div>
                    </header>
                    <div className="conversas__conteudo">
                    <div className="pesquisa">
                    <div className="pesquisa-container">
                        <div className="pesquisa-icone-container">
                        <span className="pesquisa-icone">
                            <svg
                            width="16"
                            height="16"
                            fill="currentColor"
                            className="bi bi-search"
                            viewBox="0 0 16 16"
                            >
                            <path
                                className="pesquisa-icone-path"
                                d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"
                            />
                            </svg>
                        </span>
                        </div>
                        <div className="pesquisa-input-container">
                        <input
                            className="pesquisa-input"
                            name="pesquisa-input"
                            role="textbox"
                            aria-label="Pesquisar conversa"
                            autoComplete="off"
                            dir="ltr"
                            placeholder="Pesquisar conversa"
                            type="search"
                            value={buscaConversa}
                            onChange={(event) => setBuscaConversa(event.target.value)}
                        />
                        </div>
                    </div>
                    </div>
                    <div className="filtros">
                    <div className="filtros-lista">
                        <button
                        type="button"
                        className={`filtro-item filtro-todos ${
                            filtroAtivo === "todos" ? "ativo" : ""
                        }`}
                        onClick={() => setFiltroAtivo("todos")}
                        aria-pressed={filtroAtivo === "todos"}
                        >
                        <div className="filtro-conteudo">
                            <span className="filtro-texto">Todos</span>
                        </div>
                        </button>
                        <button
                        type="button"
                        className={`filtro-item filtro-nao-lidas ${
                            filtroAtivo === "nao-lidas" ? "ativo" : ""
                        }`}
                        onClick={() => setFiltroAtivo("nao-lidas")}
                        aria-pressed={filtroAtivo === "nao-lidas"}
                        >
                        <div className="filtro-conteudo">
                            <span className="filtro-texto">Não lidas</span>
                        </div>
                        </button>
                        {usuario && usuario.tipo !== "user" && (
                            <button
                            type="button"
                            className={`filtro-item filtro-grupos ${
                                filtroAtivo === "grupos" ? "ativo" : ""
                            }`}
                            onClick={() => setFiltroAtivo("grupos")}
                            aria-pressed={filtroAtivo === "grupos"}
                            >
                            <div className="filtro-conteudo">
                                <span className="filtro-texto">Grupos</span>
                            </div>
                            </button>
                        )}
                    </div>
                    </div>
                    <section className="lista-conversas">
                    {conversasFiltradas.map((conversa) => (
                        <button
                        key={conversa.id}
                        type="button"
                        onClick={() => void abrirConversa(conversa)}
                        className={`conversa-item ${
                            conversaSelecionada?.id === conversa.id ? "contato-ativo" : ""
                        } ${
                            conversa.mensagensNaoLidas > 0
                                ? "conversa-item--nao-lida"
                                : ""
                        }`}
                        >
                            <div className= {conversa?.tipo === "grupo"
                                    ? "conversa-grupo-avatar"
                                    : (conversa?.tipo === "setor"
                                        ? "conversa-setor-avatar"
                                        : "conversa-avatar"
                                    )
                                }
                            >
                                {conversa?.tipo === "grupo"
                                    ? <svg width="16" height="16" fill="currentColor" className="bi bi-people-fill" viewBox="0 0 16 16">
                                        <path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6m-5.784 6A2.24 2.24 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.3 6.3 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1zM4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5"/>
                                    </svg>
                                    : (conversa?.tipo === "setor"
                                        ? <svg
                                            width="16"
                                            height="16"
                                            viewBox="0 0 16 16"
                                            fill="currentColor"
                                            role="img"
                                            aria-label="Atendimento"
                                        >
                                            <g transform="scale(0.25)">
                                                <path d=" M45 20 C43.5 13.5 38.5 9 32 9 C25.5 9 20.5 13.5 19 20 C20 21 20.5 22.5 20 24 V27 C20 33 25.5 37 32 35.5 C30.5 34 31 31.5 32.5 30.5 C34 29.5 37.5 29.5 39 30.5 L43 29 C44 27 44 25 44 24 C43.5 22.5 44 21 45 20Z" />
                                                <path d=" M24 38H40 C48.5 38 55 44.5 55 53 C55 59 51.5 61 45 61 H19 C12.5 61 9 59 9 53 C9 44.5 15.5 38 24 38Z" />
                                                <path d="M15.5 22V21A16.5 16.5 0 0 1 48.5 21V22" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                                <path d=" M15.5 20 A3 3 0 0 1 18.5 23 V28.5 A3 3 0 0 1 12.5 28.5 V23 A3 3 0 0 1 15.5 20Z M48.5 20 A3 3 0 0 1 51.5 23 V28.5 A3 3 0 0 1 45.5 28.5 V23 A3 3 0 0 1 48.5 20Z" />
                                                <path d="M48 29C45 32 41 33.5 37 33.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                                                />
                                                <path d="M35 31.8H37 A1.7 1.7 0 0 1 37 35.2 H35 A1.7 1.7 0 0 1 35 31.8Z" />
                                            </g>
                                        </svg>
                                        : renderizarAvatar(
                                            nomeDaConversa(conversa),
                                            fotoDaConversa(conversa),
                                            conversa.tipo === "comunidade",
                                        )
                                    )
                                }
                            </div>
                            <div className="conversa-dados">
                                <strong>{nomeDaConversa(conversa)}</strong>
                                <span>
                                {conversa.ultimaMensagem?.conteudo ||
                                    (conversa.ultimaMensagem?.arquivoNome
                                        ? `📎 ${conversa.ultimaMensagem.arquivoNome}`
                                        : "Conversa iniciada")}
                                </span>
                            </div>
                            <div className="conversa-meta">
                                <time
                                    className="conversa-horario"
                                    dateTime={
                                        conversa.ultimaMensagem?.enviadaEm ?? conversa.criadaEm
                                    }
                                >
                                    {formatarDataUltimaMensagem(
                                        conversa.ultimaMensagem?.enviadaEm ??
                                            conversa.criadaEm,
                                    )}
                                </time>
                                {conversa.mensagensNaoLidas > 0 && (
                                    <span
                                    className="conversa-nao-lidas"
                                    aria-label={`${conversa.mensagensNaoLidas} ${
                                        conversa.mensagensNaoLidas === 1
                                            ? "mensagem não lida"
                                            : "mensagens não lidas"
                                    }`}
                                    >
                                    {conversa.mensagensNaoLidas > 99
                                        ? "99+"
                                        : conversa.mensagensNaoLidas}
                                    </span>
                                )}
                            </div>
                        </button>
                    ))}
                    {conversasFiltradas.length === 0 && (
                        <p className="lista-conversas__vazia">
                        {filtroAtivo === "nao-lidas"
                            ? "Nenhuma conversa não lida."
                            : filtroAtivo === "grupos"
                                ? "Nenhum grupo disponível."
                                : buscaConversa.trim()
                                    ? "Nenhuma conversa encontrada."
                                    : "Nenhuma conversa disponível."}
                        </p>
                    )}
                    </section>
                    </div>
                    <div
                    className={`nova-conversa ${
                        novaConversaAberta ? "nova-conversa--aberta" : ""
                    }`}
                    >
                    <header className="nova-conversa__header">
                        <button
                        className="nova-conversa__voltar"
                        onClick={() => setNovaConversaAberta(false)}
                        aria-label="Voltar"
                        >
                        <svg
                            width="22"
                            height="22"
                            viewBox="0 0 16 16"
                            fill="currentColor"
                        >
                            <path
                            fillRule="evenodd"
                            d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8"
                            />
                        </svg>
                        </button>
                        <h2>Nova conversa</h2>
                    </header>
                    <div className="nova-conversa__pesquisa">
                        <svg width="17" height="17" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0" />
                        </svg>
                        <input
                        type="text"
                        placeholder={
                            usuario?.tipo === "user"
                            ? "Pesquisar setor"
                            : (usuario?.tipo === "admin" || usuario?.tipo === "superAdmin")
                                ? "Pesquisar contato"
                                : "Pesquisar usuário"
                        }
                        value={buscaUsuario}
                        onChange={(event) => setBuscaUsuario(event.target.value)}
                        />
                    </div>
                    <div className="nova-conversa__titulo-lista">
                        {usuario?.tipo === "user"
                        ? "SETORES"
                        : (usuario?.tipo === "admin" || usuario?.tipo === "superAdmin")
                            ? "CONTATOS"
                            : "USUÁRIOS"}
                    </div>
                    <div className="nova-conversa__usuarios">
                        {carregandoUsuarios && (
                        <p className="nova-conversa__mensagem">Carregando...</p>
                        )}
                        {!carregandoUsuarios &&
                        usuario?.tipo === "user" &&
                        setoresFiltrados.map((setor) => (
                            <button
                            key={setor.id}
                            type="button"
                            className="nova-conversa__usuario"
                            onClick={() => void selecionarSetor(setor)}
                            >
                            <div className="nova-conversa__avatar nova-coversa__avatar-setor">
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 16 16"
                                    fill="currentColor"
                                    role="img"
                                    aria-label="Atendimento"
                                >
                                    <g transform="scale(0.25)">
                                        <path d=" M45 20 C43.5 13.5 38.5 9 32 9 C25.5 9 20.5 13.5 19 20 C20 21 20.5 22.5 20 24 V27 C20 33 25.5 37 32 35.5 C30.5 34 31 31.5 32.5 30.5 C34 29.5 37.5 29.5 39 30.5 L43 29 C44 27 44 25 44 24 C43.5 22.5 44 21 45 20Z" />
                                        <path d=" M24 38H40 C48.5 38 55 44.5 55 53 C55 59 51.5 61 45 61 H19 C12.5 61 9 59 9 53 C9 44.5 15.5 38 24 38Z" />
                                        <path d="M15.5 22V21A16.5 16.5 0 0 1 48.5 21V22" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                        <path d=" M15.5 20 A3 3 0 0 1 18.5 23 V28.5 A3 3 0 0 1 12.5 28.5 V23 A3 3 0 0 1 15.5 20Z M48.5 20 A3 3 0 0 1 51.5 23 V28.5 A3 3 0 0 1 45.5 28.5 V23 A3 3 0 0 1 48.5 20Z" />
                                        <path d="M48 29C45 32 41 33.5 37 33.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                                        />
                                        <path d="M35 31.8H37 A1.7 1.7 0 0 1 37 35.2 H35 A1.7 1.7 0 0 1 35 31.8Z" />
                                    </g>
                                </svg>
                            </div>
                            <div className="nova-conversa__dados">
                                <strong>{setor.setor}</strong>
                                <span>
                                    {setor.secretaria?.nome ?? "Sem secretaria"}
                                </span>
                            </div>
                            </button>
                        ))}
                        {!carregandoUsuarios &&
                        usuario?.tipo !== "user" &&
                        usuariosFiltrados.map((usuario) => (
                            <button
                            key={usuario.id}
                            type="button"
                            className="nova-conversa__usuario"
                            onClick={() => void selecionarUsuario(usuario)}
                            >
                            <div className="nova-conversa__avatar">
                                {renderizarAvatar(
                                    usuario.nome,
                                    usuario.foto_perfil_url
                                )}
                            </div>
                            <div className="nova-conversa__dados">
                                <strong>{usuario.nome}</strong>
                                <span>
                                {usuario.tipoUsuario === "funcionario"
                                    ? (usuario.setor?.nome ?? "Funcionário")
                                    : usuario.tipoUsuario === "admin"
                                    ? "Administrador"
                                    : usuario.tipoUsuario === "superAdmin"
                                    ? "Super Administrador"
                                    : "Usuário Fala Pommer"}
                                </span>
                            </div>
                            </button>
                        ))}
                        {!carregandoUsuarios &&
                        usuario?.tipo === "user" &&
                        setoresFiltrados.length === 0 && (
                            <p className="nova-conversa__mensagem">
                            Nenhum setor encontrado.
                            </p>
                        )}
                        {!carregandoUsuarios &&
                        usuario?.tipo !== "user" &&
                        usuariosFiltrados.length === 0 && (
                            <p className="nova-conversa__mensagem">
                            Nenhum contato encontrado.
                            </p>
                        )}
                    </div>
                    </div>
                </>
            )}
            
        </aside>

        {/* A comunidade usa o chat desta página; somente a entrada aparece antes de carregar a conversa. */}
        <section className="chat">
            {dados && !conversaSelecionada ? (
                <>
                    <header className="chat-header">
                        <div className="chat-header__usuario">
                            <button type="button" className="chat-header__voltar" onClick={voltarDasComunidades} aria-label="Voltar para as comunidades">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                    <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                            <div className="chat-header__avatar-comunidade">
                                {renderizarAvatar(dados.nome_comunidade, dados.imagem_comunidade, true)}
                            </div>
                            <div className="chat-header__dados">
                                <strong>{dados.nome_comunidade}</strong>
                                <span>{dados.totalParticipantes} participantes</span>
                            </div>
                        </div>
                    </header>
                    {/* A classe mensagens mantém o papel de parede escolhido, inclusive na tela de entrada. */}
                    <div className="mensagens comunidade-entrada">
                        <div className="comunidade-entrada__cartao">
                            <h2>{dados.nome_comunidade}</h2>
                            <p>{dados.descricao_comunidade}</p>
                            {carregandoComunidade ? (
                                <p role="status">Carregando o chat da comunidade…</p>
                            ) : (
                                dados.participa || 
                                dados?.funcaoDosMembrosComunidade?.tipo_funcao === "seguidor"
                            ) ? (
                                <button type="button" onClick={() => void abrirComunidade(dados)}>
                                    Tentar abrir o chat novamente
                                </button>
                            ) : (
                                <>
                                    <button type="button" onClick={() => void entrarComunidade()} disabled={entrandoComunidade} className="entrar-comunidade">
                                        {entrandoComunidade ? "Entrando…" : "Entrar na comunidade"}
                                        <svg width="16" height="16" fill="currentColor" className="bi bi-arrow-right-short" viewBox="0 0 16 16">
                                            <path fillRule="evenodd" d="M4 8a.5.5 0 0 1 .5-.5h5.793L8.146 5.354a.5.5 0 1 1 .708-.708l3 3a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708-.708L10.293 8.5H4.5A.5.5 0 0 1 4 8"/>
                                        </svg>
                                    </button>
                                    <div className="comunidade-entrada__seguir">
                                        <svg
                                            width="16"
                                            height="16"
                                            fill="currentColor"
                                            className="bi bi-bell"
                                            viewBox="0 0 16 16"
                                            aria-hidden="true"
                                        >
                                            <path d="M5.164 14H15c-.299-.199-.557-.553-.78-1-.9-1.8-1.22-5.12-1.22-6q0-.396-.06-.776l-.938.938c.02.708.157 2.154.457 3.58.161.767.377 1.566.663 2.258H6.164zm5.581-9.91a4 4 0 0 0-1.948-1.01L8 2.917l-.797.161A4 4 0 0 0 4 7c0 .628-.134 2.197-.459 3.742q-.075.358-.166.718l-1.653 1.653q.03-.055.059-.113C2.679 11.2 3 7.88 3 7c0-2.42 1.72-4.44 4.005-4.901a1 1 0 1 1 1.99 0c.942.19 1.788.645 2.457 1.284zM10 15a2 2 0 1 1-4 0zm-9.375.625a.53.53 0 0 0 .75.75l14.75-14.75a.53.53 0 0 0-.75-.75z"/>
                                        </svg>
                                        <span>Só acompanhar?</span>
                                        <button
                                            type="button" 
                                            className="comunidade-entrada__seguir-botao"
                                            onClick={() => void seguirComunidade()}
                                            disabled={seguindoComunidade}
                                        >
                                            {seguindoComunidade ? "Seguindo…" : "Seguir"}
                                        </button>
                                    </div>
                                </>
                            )}
                            {erroComunidade && <p role="alert">{erroComunidade}</p>}
                        </div>
                    </div>
                </>
            ) : conversaSelecionada ? (
            <>
                <header className="chat-header">
                <div className="chat-header__usuario">
                    <button
                    type="button"
                    className="chat-header__voltar"
                    aria-label={conversaSelecionada.tipo === "comunidade" ? "Voltar para as comunidades" : "Voltar para as conversas"}
                    onClick={conversaSelecionada.tipo === "comunidade" ? voltarDasComunidades : fecharChatMobile}
                    >
                    <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
                    >
                        <path
                        d="M15 18l-6-6 6-6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        />
                    </svg>
                    </button>

                    <div
                        className={`header__avatar__dados ${
                            conversaSelecionada.tipo === "grupo" ||
                            (conversaSelecionada.tipo === "comunidade" && !souSeguidor)
                                ? "header__avatar__dados--clicavel"
                                : ""
                        }`}
                        role={
                            conversaSelecionada.tipo === "grupo" ||
                            (conversaSelecionada.tipo === "comunidade" && !souSeguidor)
                                ? "button"
                                : undefined
                        }
                        tabIndex={
                            conversaSelecionada.tipo === "grupo" ||
                            (conversaSelecionada.tipo === "comunidade" && !souSeguidor)
                                ? 0
                                : undefined
                        }
                        aria-haspopup={
                            conversaSelecionada.tipo === "grupo" ||
                            (conversaSelecionada.tipo === "comunidade" && !souSeguidor)
                                ? "dialog"
                                : undefined
                        }
                        aria-expanded={
                            conversaSelecionada.tipo === "grupo"
                                ? modalDadosGrupoAberto
                                : (conversaSelecionada.tipo === "comunidade" && !souSeguidor
                                    ? modalDadosComunidadeAberto 
                                    : undefined
                                )
                        }
                        onClick={() => {
                            if (conversaSelecionada.tipo === "grupo") {
                                setModalDadosGrupoAberto(true);
                            } else if (conversaSelecionada.tipo === "comunidade" && !souSeguidor) {
                                setModalDadosComunidadeAberto(true);
                            }
                        }}
                        onKeyDown={(evento) => {
                            if (
                                conversaSelecionada.tipo === "grupo" &&
                                (evento.key === "Enter" || evento.key === " ")
                            ) {
                                evento.preventDefault();
                                setModalDadosGrupoAberto(true);
                            } else if (
                                conversaSelecionada.tipo === "comunidade" &&
                                !souSeguidor &&
                                (evento.key === "Enter" || evento.key === " ")
                            ) {
                                evento.preventDefault();
                                setModalDadosComunidadeAberto(true);
                            }
                        }}
                    >
                        <div className={conversaSelecionada?.tipo === "grupo" 
                                ? "chat-header__avatar-grupo" 
                                : (conversaSelecionada?.tipo === "setor" 
                                    ? "chat-header__avatar-setor" 
                                    : (conversaSelecionada?.tipo === "comunidade"
                                        ? "chat-header__avatar-comunidade"
                                        : "chat-header__avatar")
                                )
                            }
                        >
                            {conversaSelecionada?.tipo === "grupo" 
                                ? <svg width="16" height="16" fill="currentColor" className="bi bi-people-fill" viewBox="0 0 16 16">
                                    <path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6m-5.784 6A2.24 2.24 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.3 6.3 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1zM4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5"/>
                                </svg>

                                : (conversaSelecionada?.tipo === "setor" 
                                    ? <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 16 16"
                                        fill="currentColor"
                                        role="img"
                                        aria-label="Atendimento"
                                    >
                                        <g transform="scale(0.25)">
                                            <path d=" M45 20 C43.5 13.5 38.5 9 32 9 C25.5 9 20.5 13.5 19 20 C20 21 20.5 22.5 20 24 V27 C20 33 25.5 37 32 35.5 C30.5 34 31 31.5 32.5 30.5 C34 29.5 37.5 29.5 39 30.5 L43 29 C44 27 44 25 44 24 C43.5 22.5 44 21 45 20Z" />
                                            <path d=" M24 38H40 C48.5 38 55 44.5 55 53 C55 59 51.5 61 45 61 H19 C12.5 61 9 59 9 53 C9 44.5 15.5 38 24 38Z" />

                                            <path d="M15.5 22V21A16.5 16.5 0 0 1 48.5 21V22" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />

                                            <path d=" M15.5 20 A3 3 0 0 1 18.5 23 V28.5 A3 3 0 0 1 12.5 28.5 V23 A3 3 0 0 1 15.5 20Z M48.5 20 A3 3 0 0 1 51.5 23 V28.5 A3 3 0 0 1 45.5 28.5 V23 A3 3 0 0 1 48.5 20Z" />
                                            <path d="M48 29C45 32 41 33.5 37 33.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                                            />
                                            <path d="M35 31.8H37 A1.7 1.7 0 0 1 37 35.2 H35 A1.7 1.7 0 0 1 35 31.8Z" />
                                        </g>
                                    </svg> 
                                    : renderizarAvatar(
                                        nomeDaConversa(conversaSelecionada),
                                        fotoDaConversa(conversaSelecionada),
                                        conversaSelecionada.tipo === "comunidade",
                                    )
                                )
                            }
                        </div>
                        <div className="chat-header__dados">
                            <strong>{nomeDaConversa(conversaSelecionada)}</strong>
                            <span>{subtituloDaConversa(conversaSelecionada)}</span>
                        </div>
                    </div>
                </div>

                {conversaSelecionada.tipo === "comunidade" && souSeguidor && (
                    <div className="chat-header__acoes">
                        <button
                            ref={botaoMenuSeguindoComunidadeRef}
                            type="button"
                            className="chat-header__menu-seguindo"
                            aria-label="Abrir ações da comunidade"
                            aria-expanded={menuAbertoSeguindoComunidade}
                            aria-haspopup="menu"
                            onClick={() =>
                                setMenuAbertoSeguindoComunidade((evento) => !evento)
                            }
                        >
                            <svg
                                width="22"
                                height="22"
                                viewBox="0 0 24 24"
                                fill="none"
                                aria-hidden="true"
                            >
                                <path
                                    d="M4 7h16M4 12h16M4 17h16"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                />
                            </svg>
                        </button>

                        {menuAbertoSeguindoComunidade && (
                            <div
                                ref={menuSeguindoComunidadeRef}
                                className="chat-header__menu-opcoes chat-header__menu-opcoes--grupo"
                                role="menu"
                            >
                                <button
                                    type="button"
                                    className="chat-header__entrar-comunidade"
                                    onClick={() => void entrarComunidade()}
                                    disabled={entrandoComunidade}
                                >
                                    {entrandoComunidade ? "Entrando…" : "Entrar na comunidade"}
                                </button>

                                <button
                                    type="button"
                                    role="menuitem"
                                    className="chat-header__parar-seguir"
                                    onClick={() => void DeixarSeguirComunidade()}
                                    disabled={deixandoDeSeguir}
                                >
                                    <svg
                                        width="18"
                                        height="18"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        aria-hidden="true"
                                    >
                                        <path
                                            d="M10 17l5-5-5-5m5 5H3m10-9h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                    <span>
                                        {deixandoDeSeguir ? "Saindo..." : "Deixar de seguir"}
                                    </span>
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {conversaSelecionada.tipo === "grupo" &&
                    !conversaSelecionada.somenteLeitura && (
                    <div className="chat-header__acoes chat-header__acoes--grupo">
                        <details
                            ref={menuGrupoRef}
                            className="chat-header__menu-grupo"
                        >
                            <summary aria-label="Abrir ações do grupo">
                                <svg
                                    width="22"
                                    height="22"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    aria-hidden="true"
                                >
                                    <path
                                        d="M4 7h16M4 12h16M4 17h16"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                    />
                                </svg>
                            </summary>

                            <div className="chat-header__menu-opcoes chat-header__menu-opcoes--grupo">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (menuGrupoRef.current) {
                                            menuGrupoRef.current.open = false;
                                        }
                                        void contatosModalAdicionarPessoas();
                                    }}
                                >
                                    <svg
                                        width="18"
                                        height="18"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        aria-hidden="true"
                                    >
                                        <path
                                            d="M14 19c0-2.21-2.46-4-5.5-4S3 16.79 3 19M8.5 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                        <path
                                            d="M19 8v6m3-3h-6"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <span>Adicionar pessoa</span>
                                </button>

                                <div className="container-botao-sair-grupo">
                                    <button
                                        type="button"
                                        className="chat-header__menu-sair-grupo"
                                        onClick={() => {
                                            if (menuGrupoRef.current) {
                                                menuGrupoRef.current.open = false;
                                            }
                                            setModalSairGrupoAberto(true);
                                        }}
                                    >
                                        <svg
                                            width="18"
                                            height="18"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            aria-hidden="true"
                                        >
                                            <path
                                                d="M10 17l5-5-5-5m5 5H3m10-9h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        </svg>
                                        <span>Sair do grupo</span>
                                    </button>
                                </div>
                            </div>
                        </details>
                    </div>
                )}

                {conversaSelecionada.tipo === "setor" &&
                    (usuario?.tipo !== "user" ||
                        conversaSelecionada.podeFinalizar) && (
                    <div className="chat-header__acoes chat-header__acoes--setor">
                        <details
                            ref={menuSetorRef}
                            className="chat-header__menu-grupo chat-header__menu-setor"
                        >
                            <summary aria-label="Abrir ações do setor">
                                <svg
                                    width="22"
                                    height="22"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    aria-hidden="true"
                                >
                                    <path
                                        d="M4 7h16M4 12h16M4 17h16"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                    />
                                </svg>
                            </summary>

                            <div className="chat-header__menu-opcoes chat-header__menu-opcoes--grupo">
                                {usuario?.tipo !== "user" && (
                                    <button
                                        type="button"
                                        className="chat-header__transferir"
                                        onClick={() => {
                                            if (menuSetorRef.current) {
                                                menuSetorRef.current.open = false;
                                            }
                                            void transferirConversa()
                                        }}
                                    >
                                        Transferir conversa
                                    </button>
                                )}

                                <div 
                                className={usuario?.tipo !== "user" ? "container-botao-finalizar" : ""}
                                >
                                    {conversaSelecionada.podeFinalizar && (
                                        <button
                                            type="button"
                                            className="chat-header__menu-finalizar"
                                            onClick={finalizarConversaSelecionada}
                                            disabled={finalizandoConversa}
                                        >
                                            {finalizandoConversa
                                                ? "Finalizando..."
                                                : "Finalizar"}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </details>
                    </div>
                )}
                </header>

                <div
                    ref={mensagensContainerRef}
                    className="mensagens"
                    data-lenis-prevent
                >
                    {carregandoMensagens && (
                        <p className="mensagens__status">Carregando mensagens...</p>
                    )}

                    {!carregandoMensagens &&
                        mensagensChat.length > 0 &&
                        temMensagensAnteriores && (
                            <button
                                type="button"
                                className="mensagens__carregar-anteriores"
                                onClick={carregarMensagensAnteriores}
                                disabled={carregandoMensagensAnteriores}
                            >
                                {carregandoMensagensAnteriores
                                    ? "Carregando..."
                                    : "Carregar mensagens anteriores"}
                            </button>
                        )}

                    {!carregandoMensagens &&
                    mensagensChat.length === 0 &&
                    usuariosDigitando.length === 0 && (
                        <p className="mensagens__status">Nenhuma mensagem enviada.</p>
                    )}

                    {!carregandoMensagens &&
                        mensagensChat.map((item) => {
                        if (item.sistema) {
                            return (
                                <div
                                    key={item.id}
                                    className="mensagem-sistema"
                                    role="status"
                                >
                                    {item.conteudo}
                                </div>
                            );
                        }

                        const enviadaPorMim = mensagemFoiEnviadaPeloUsuario(
                            item,
                            usuario,
                            conversaSelecionada,
                        );
                        const mensagemRespondida = item.respondendoA ?? null;
                        const mensagemRespondidaEnviadaPorMim =
                            mensagemRespondida?.remetente.id === usuario?.sub;
                        const exibirAvatarGrupo =
                            (conversaSelecionada.tipo === "grupo" || conversaSelecionada.tipo === "comunidade") &&
                            !enviadaPorMim;
                        const statusEntrega =
                            item.statusEntrega === "enviando"
                                ? "enviando"
                                : ultimaMensagemVisualizadaId !== null &&
                                    item.id <= ultimaMensagemVisualizadaId
                                  ? "visualizada"
                                  : "recebida";
                        const descricaoStatusEntrega =
                            statusEntrega === "enviando"
                                ? "Mensagem ainda não recebida"
                                : statusEntrega === "visualizada"
                                  ? "Mensagem visualizada"
                                  : "Mensagem recebida";

                        return (
                            <div
                            key={item.id}
                            className={`mensagem-linha ${
                                enviadaPorMim
                                ? "mensagem-linha--enviada"
                                : "mensagem-linha--recebida"
                            } ${
                                exibirAvatarGrupo
                                    ? "mensagem-linha--com-avatar"
                                    : ""
                            }`}
                            >
                            {exibirAvatarGrupo && (
                                <div
                                    className="mensagem-grupo__avatar"
                                    aria-label={`Foto de ${item.remetente.nome}`}
                                    title={item.remetente.nome}
                                >
                                    {renderizarAvatar(
                                        item.remetente.nome,
                                        item.remetente.fotoPerfilUrl,
                                    )}
                                </div>
                            )}
                            <article
                                className={`mensagem-balao ${
                                    opcoesMensagens === item.id
                                        ? "mensagem-balao--opcoes-abertas"
                                        : ""
                                }`}
                                ref={(el) => {
                                if (el) balõesRef.current.set(item.id, el);
                                else balõesRef.current.delete(item.id);
                                }}
                                style={{
                                transformOrigin: enviadaPorMim
                                    ? "bottom right"
                                    : "bottom left",
                                }}
                            >
                                <header className="mensagem-balao__cabecalho">
                                    <strong>{item.remetente.nome}</strong>

                                    {item.remetente.tipo === "setor" && (
                                        <span className="mensagem-balao__perfil">
                                            {item.remetente.sigla_setor}
                                        </span>
                                    )}

                                    {item.remetente.tipo === "admin" && (
                                        <span className="mensagem-balao__perfil">
                                            Administrador
                                        </span>
                                    )}

                                    {item.remetente.tipo === "superAdmin" && (
                                        <span className="mensagem-balao__perfil">
                                            Super admin
                                        </span>
                                    )}

                                    <span
                                        className={`config-mensagens ${
                                            opcoesMensagens === item.id
                                                ? "config-mensagens--aberto"
                                                : ""
                                        }`}
                                    >
                                        <button
                                            type="button"
                                            className="config-mensagens__ativo"
                                            aria-expanded={opcoesMensagens === item.id}
                                            onClick={() =>
                                                setOpcoesMensagens((mensagemId) =>
                                                    mensagemId === item.id ? null : item.id,
                                                )
                                            }
                                        >
                                            <svg width="16" height="16" fill="currentColor" className="bi bi-chevron-down" viewBox="0 0 16 16">
                                                <path fillRule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708"/>
                                            </svg>
                                        </button>

                                        {opcoesMensagens === item.id && (
                                            <div
                                                className={`opcoes-mensagens ${
                                                    enviadaPorMim
                                                        ? "opcoes-mensagens--mensagem-direita"
                                                        : "opcoes-mensagens--mensagem-esquerda"
                                                }`}
                                                role="menu"
                                                aria-label="Opções da mensagem"
                                            >
                                                <button
                                                    type="button"
                                                    className="opcoes-mensagens__item"
                                                    role="menuitem"
                                                    onClick={() => setResponderMensagem(item)}
                                                >
                                                    <svg
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        aria-hidden="true"
                                                    >
                                                        <path
                                                            d="M9 8l-5 4 5 4v-3h4.5c2.8 0 5 1.4 6.5 4-1-5-3.5-7-7.5-7H9V8Z"
                                                            stroke="currentColor"
                                                            strokeWidth="1.8"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                        />
                                                    </svg>
                                                    <span>Responder</span>
                                                </button>
                                            </div>
                                        )}
                                    </span>
                                </header>

                                {mensagemRespondida && (
                                    <button
                                        type="button"
                                        className={`mensagem-balao__resposta ${
                                            mensagemRespondidaEnviadaPorMim
                                                ? "mensagem-balao__resposta--eu-mesmo"
                                                : ""
                                        }`}
                                        onClick={() =>
                                            irParaMensagem(
                                                mensagemRespondida.id,
                                            )
                                        }
                                        aria-label="Ir para a mensagem respondida"
                                    >
                                        <span
                                            className="mensagem-balao__resposta-borda"
                                            aria-hidden="true"
                                        />
                                        <span className="mensagem-balao__resposta-dados">
                                            <strong>
                                                {mensagemRespondidaEnviadaPorMim
                                                    ? "Você"
                                                    : mensagemRespondida.remetente.nome}
                                            </strong>
                                            <span>
                                                {mensagemRespondida.conteudo ||
                                                    mensagemRespondida.arquivo?.nome}
                                            </span>
                                        </span>
                                    </button>
                                )}

                                {item.arquivo?.tipo === "imagem" && (
                                    <button
                                        type="button"
                                        className="mensagem-anexo mensagem-anexo--imagem"
                                        onClick={() => setArquivoEmVisualizacao(item.arquivo!)}
                                        aria-label={`Visualizar ${item.arquivo.nome}`}
                                    >
                                        <img
                                            src={obterUrlArquivo(item.arquivo.url)}
                                            alt={item.arquivo.nome}
                                        />
                                        <span className="mensagem-anexo__indicacao">Ampliar</span>
                                    </button>
                                )}

                                {item.arquivo?.tipo === "video" && (
                                    <video
                                        className="mensagem-anexo mensagem-anexo--video"
                                        controls
                                        preload="metadata"
                                    >
                                        <source
                                            src={obterUrlArquivo(item.arquivo.url)}
                                            type={item.arquivo.mime}
                                        />
                                    </video>
                                )}

                                {item.arquivo?.tipo === "audio" && (
                                    <audio
                                        className="mensagem-anexo mensagem-anexo--audio"
                                        controls
                                        preload="metadata"
                                        src={obterUrlArquivo(item.arquivo.url)}
                                    />
                                )}

                                {item.arquivo?.tipo === "documento" && (
                                    <button
                                        type="button"
                                        className="mensagem-anexo mensagem-anexo--arquivo mensagem-anexo--documento"
                                        onClick={() => setArquivoEmVisualizacao(item.arquivo!)}
                                    >
                                        <span className="mensagem-anexo__icone" aria-hidden="true">📄</span>
                                        <span className="mensagem-anexo__dados">
                                            <strong>{item.arquivo.nome}</strong>
                                            <small>{formatarTamanhoArquivo(item.arquivo.tamanho)}</small>
                                        </span>
                                        <span className="mensagem-anexo__abrir" aria-hidden="true">›</span>
                                    </button>
                                )}

                                {item.conteudo && <p>{item.conteudo}</p>}

                                <footer className="mensagem-balao__rodape">
                                    <time dateTime={item.enviadaEm}>
                                    {new Intl.DateTimeFormat("pt-BR", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    }).format(new Date(item.enviadaEm))}
                                    </time>
                                    {enviadaPorMim && (
                                        <span
                                            className={`mensagem-status mensagem-status--${statusEntrega}`}
                                            aria-label={descricaoStatusEntrega}
                                            title={descricaoStatusEntrega}
                                        >
                                            {statusEntrega === "enviando"
                                                ? "✓"
                                                : "✓✓"}
                                        </span>
                                    )}
                                </footer>
                            </article>
                            </div>
                        );
                        })}

                    {!carregandoMensagens && usuariosDigitando.length > 0 && (
                        <div className="mensagem-linha mensagem-linha--recebida">
                            <div
                            ref={indicadorDigitandoRef}
                            className="mensagem-balao mensagem-balao--digitando"
                            role="status"
                            aria-label={
                                usuariosDigitando.length === 1
                                    ? `${usuariosDigitando[0].nome} está digitando`
                                    : `${usuariosDigitando.length} pessoas estão digitando`
                            }
                            >
                            <span className="digitando-pontos" aria-hidden="true">
                                {[0, 1, 2].map((ponto) => (
                                    <span
                                    key={ponto}
                                    className="digitando-ponto"
                                    />
                                ))}
                            </span>
                            </div>
                        </div>
                    )}

                </div>

                {/* O compositor é o mesmo para todos: arquivos, fotos/vídeos, emojis e gravação de áudio. */}
                {podeEnviarMensagem && (
                <footer className="chat-input">
                    {arquivoSelecionado && (
                        <div className="chat-input__arquivo">
                            <div className="chat-input__arquivo-icone">
                            <svg
                                width="18"
                                height="18"
                                viewBox="0 0 16 16"
                                fill="currentColor"
                                aria-hidden="true"
                            >
                                <path d="M4.5 3a2.5 2.5 0 0 1 5 0v9a1.5 1.5 0 0 1-3 0V5a.5.5 0 0 1 1 0v7a.5.5 0 0 0 1 0V3a1.5 1.5 0 1 0-3 0v9a2.5 2.5 0 0 0 5 0V5a.5.5 0 0 1 1 0v7a3.5 3.5 0 1 1-7 0z" />
                            </svg>
                            </div>

                            <div className="chat-input__arquivo-dados">
                            <strong>{arquivoSelecionado.name}</strong>

                            <span>
                                {formatarTamanhoArquivo(arquivoSelecionado.size)}
                            </span>
                            </div>

                            <button
                            className="chat-input__arquivo-remover"
                            type="button"
                            aria-label="Remover arquivo"
                            onClick={() => setArquivoSelecionado(null)}
                            >
                            ×
                            </button>
                        </div>
                    )}

                    {responderMensagem && (
                        <div
                            className={`chat-input__responder ${
                                respostaFoiEnviadaPorMim
                                    ? "chat-input__responder-euMesmo"
                                    : ""
                            }`}
                            onClick={irParaMensagemRespondida}
                        >
                            <span
                                className="chat-input__responder-borda"
                                aria-hidden="true"
                            />

                            <div className="chat-input__responder-dados">
                                <strong>
                                    {respostaFoiEnviadaPorMim
                                        ? "Você"
                                        : responderMensagem.remetente.nome}
                                </strong>

                                <span>
                                    {responderMensagem.conteudo ||
                                        responderMensagem.arquivo?.nome}
                                </span>
                            </div>

                            <button
                            className="chat-input__responder-remover"
                            type="button"
                            aria-label="Remover mensagem"
                            onClick={(evento) => {
                                evento.stopPropagation();
                                setResponderMensagem(null);
                            }}
                            >
                            ×
                            </button>
                        </div>
                    )}

                    <div className="chat-input__conteudo">
                    <div ref={acaoArquivosRef} className="chat-input__acao">
                        <button
                        ref={botaoArquivosRef}
                        type="button"
                        aria-label="Anexar arquivo"
                        aria-expanded={menuAbertoArquivos}
                        aria-controls="menu-arquivos"
                        onClick={() => setMenuAbertoArquivo((aberto) => !aberto)}
                        >
                        <svg
                            width="16"
                            height="16"
                            fill="currentColor"
                            className="bi bi-paperclip"
                            viewBox="0 0 16 16"
                        >
                            <path d="M4.5 3a2.5 2.5 0 0 1 5 0v9a1.5 1.5 0 0 1-3 0V5a.5.5 0 0 1 1 0v7a.5.5 0 0 0 1 0V3a1.5 1.5 0 1 0-3 0v9a2.5 2.5 0 0 0 5 0V5a.5.5 0 0 1 1 0v7a3.5 3.5 0 1 1-7 0z" />
                        </svg>
                        </button>

                        {menuAbertoArquivos && (
                        <div id="menu-arquivos" className="menu-arquivos">
                            <nav className="menu-arquivos__lista">
                            <button
                                type="button"
                                className="menu-arquivos__item documentos"
                                onClick={() =>
                                abrirSeletorArquivo(inputDocumentosRef)
                                }
                            >
                                <div className="menu-arquivos__icone">
                                <svg
                                    width="16"
                                    height="16"
                                    fill="currentColor"
                                    className="bi bi-file-earmark-text"
                                    viewBox="0 0 16 16"
                                >
                                    <path d="M5.5 7a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1zM5 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5m0 2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5" />
                                    <path d="M9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.5zm0 1v2A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z" />
                                </svg>
                                </div>
                                <span className="menu-arquivos__texto">
                                Documentos
                                </span>
                            </button>

                            <button
                                type="button"
                                className="menu-arquivos__item fotos-videos"
                                onClick={() => abrirSeletorArquivo(inputMidiasRef)}
                            >
                                <div className="menu-arquivos__icone">
                                <svg
                                    width="16"
                                    height="16"
                                    fill="currentColor"
                                    className="bi bi-images"
                                    viewBox="0 0 16 16"
                                >
                                    <path d="M4.502 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3" />
                                    <path d="M14.002 13a2 2 0 0 1-2 2h-10a2 2 0 0 1-2-2V5A2 2 0 0 1 2 3a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-1.998 2M14 2H4a1 1 0 0 0-1 1h9.002a2 2 0 0 1 2 2v7A1 1 0 0 0 15 11V3a1 1 0 0 0-1-1M2.002 4a1 1 0 0 0-1 1v8l2.646-2.354a.5.5 0 0 1 .63-.062l2.66 1.773 3.71-3.71a.5.5 0 0 1 .577-.094l1.777 1.947V5a1 1 0 0 0-1-1z" />
                                </svg>
                                </div>
                                <span className="menu-arquivos__texto">
                                Fotos e Videos
                                </span>
                            </button>

                            <button
                                type="button"
                                className="menu-arquivos__item audio"
                                onClick={() => abrirSeletorArquivo(inputAudiosRef)}
                            >
                                <div className="menu-arquivos__icone">
                                <svg
                                    width="16"
                                    height="16"
                                    fill="currentColor"
                                    className="bi bi-headphones"
                                    viewBox="0 0 16 16"
                                >
                                    <path d="M8 3a5 5 0 0 0-5 5v1h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V8a6 6 0 1 1 12 0v5a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1V8a5 5 0 0 0-5-5" />
                                </svg>
                                </div>
                                <span className="menu-arquivos__texto">Áudio</span>
                            </button>
                            </nav>
                        </div>
                        )}

                        <input
                        ref={inputDocumentosRef}
                        className="chat-input__arquivo-oculto"
                        type="file"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt"
                        onChange={selecionarArquivo}
                        />

                        <input
                        ref={inputMidiasRef}
                        className="chat-input__arquivo-oculto"
                        type="file"
                        accept="image/*,video/*"
                        onChange={selecionarArquivo}
                        />

                        <input
                        ref={inputAudiosRef}
                        className="chat-input__arquivo-oculto"
                        type="file"
                        accept="audio/*"
                        onChange={selecionarArquivo}
                        />
                    </div>

                    <div ref={acaoEmojiRef} className="chat-input__acao">
                        <button
                        ref={botaoEmojiRef}
                        type="button"
                        aria-label="Adicionar emoji"
                        aria-expanded={seletorEmojiAberto}
                        aria-controls="seletor-emojis"
                        onClick={() => setSeletorEmojiAberto((aberto) => !aberto)}
                        >
                        <svg
                            width="16"
                            height="16"
                            fill="currentColor"
                            className="bi bi-emoji-smile"
                            viewBox="0 0 16 16"
                        >
                            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16" />
                            <path d="M4.285 9.567a.5.5 0 0 1 .683.183A3.5 3.5 0 0 0 8 11.5a3.5 3.5 0 0 0 3.032-1.75.5.5 0 1 1 .866.5A4.5 4.5 0 0 1 8 12.5a4.5 4.5 0 0 1-3.898-2.25.5.5 0 0 1 .183-.683M7 6.5C7 7.328 6.552 8 6 8s-1-.672-1-1.5S5.448 5 6 5s1 .672 1 1.5m4 0c0 .828-.448 1.5-1 1.5s-1-.672-1-1.5S9.448 5 10 5s1 .672 1 1.5" />
                        </svg>
                        </button>

                        {seletorEmojiAberto && (
                        <div
                            id="seletor-emojis"
                            className="chat-input__emojis"
                            data-lenis-prevent
                        >
                            <EmojiPicker
                            aoSelecionar={(emoji) => {
                                adicionarEmoji(emoji);
                                setSeletorEmojiAberto(false);
                            }}
                            />
                        </div>
                        )}
                    </div>

                    <div className="chat-input__campo">
                        <input
                        type="text"
                        name="mensagem"
                        aria-label="Mensagem"
                        placeholder="Digite uma mensagem"
                        autoComplete="off"
                        value={mensagem}
                        onChange={(event) => {
                            const novoConteudo = event.target.value;

                            setMensagem(novoConteudo);
                            informarDigitacao(novoConteudo.trim());
                        }}
                        onBlur={pararDeInformarDigitacao}
                        onKeyDown={(event) => {
                            if (event.key === "Enter") {
                            event.preventDefault();
                            void enviarMensagem();
                            }
                        }}
                        />
                    </div>

                    <div className="chat-input__audio">
                        <button
                        type="button"
                        className={gravandoAudio ? "gravando" : undefined}
                        aria-label={
                            processandoGravacaoAudio
                                ? "Processando áudio"
                                : gravandoAudio
                                    ? "Parar gravação"
                                    : "Gravar áudio"
                        }
                        title={
                            processandoGravacaoAudio
                                ? "Processando áudio"
                                : gravandoAudio
                                    ? "Parar gravação"
                                    : "Gravar áudio"
                        }
                        onClick={() => void alternarGravacaoAudio()}
                        disabled={enviandoMensagem || processandoGravacaoAudio}
                        >
                        <svg
                            width="16"
                            height="16"
                            fill="currentColor"
                            className="bi bi-mic"
                            viewBox="0 0 16 16"
                        >
                            <path d="M3.5 6.5A.5.5 0 0 1 4 7v1a4 4 0 0 0 8 0V7a.5.5 0 0 1 1 0v1a5 5 0 0 1-4.5 4.975V15h3a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1h3v-2.025A5 5 0 0 1 3 8V7a.5.5 0 0 1 .5-.5" />
                            <path d="M10 8a2 2 0 1 1-4 0V3a2 2 0 1 1 4 0zM8 0a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V3a3 3 0 0 0-3-3" />
                        </svg>
                        </button>
                    </div>

                    <div className="chat-input__enviar">
                        <button
                        type="button"
                        aria-label="Enviar mensagem"
                        onClick={() => void enviarMensagem()}
                        disabled={
                            (!mensagem.trim() && !arquivoSelecionado) ||
                            enviandoMensagem ||
                            gravandoAudio ||
                            processandoGravacaoAudio
                        }
                        >
                        <svg
                            width="16"
                            height="16"
                            fill="currentColor"
                            className="bi bi-send-fill"
                            viewBox="0 0 16 16"
                        >
                            <path d="M15.964.686a.5.5 0 0 0-.65-.65L.767 5.855H.766l-.452.18a.5.5 0 0 0-.082.887l.41.26.001.002 4.995 3.178 3.178 4.995.002.002.26.41a.5.5 0 0 0 .886-.083zm-1.833 1.89L6.637 10.07l-.215-.338a.5.5 0 0 0-.154-.154l-.338-.215 7.494-7.494 1.178-.471z" />
                        </svg>
                        </button>
                    </div>
                    </div>
                </footer>
                )}
            </>
            ) : (
            <div className="chat-vazio">
                <div className="chat-vazio__icone" aria-hidden="true">
                    <svg viewBox="0 0 260 190">
                        <defs>
                            <linearGradient id="chat-vazio-gradiente" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0" stopColor="#2878df" />
                                <stop offset="1" stopColor="#1351b4" />
                            </linearGradient>
                        </defs>

                        <ellipse
                            className="chat-vazio__halo"
                            cx="130"
                            cy="104"
                            rx="104"
                            ry="68"
                        />
                        <path
                            className="chat-vazio__trilha"
                            d="M17 149c38 25 70 19 96-3 27-23 49-31 81-19 19 8 34 5 49-5"
                        />

                        <circle className="chat-vazio__forma chat-vazio__forma--rosa" cx="31" cy="58" r="8" />
                        <circle className="chat-vazio__forma chat-vazio__forma--verde" cx="226" cy="148" r="7" />
                        <path className="chat-vazio__forma chat-vazio__forma--amarela" d="m218 36 3.8 9.2L231 49l-9.2 3.8L218 62l-3.8-9.2L205 49l9.2-3.8Z" />

                        <g className="chat-vazio__balao chat-vazio__balao--traseiro">
                            <path d="M126 65h65c15 0 27 12 27 27v28c0 15-12 27-27 27h-13v18l-24-18h-28c-15 0-27-12-27-27V92c0-15 12-27 27-27Z" />
                            <circle cx="178" cy="105" r="7" />
                        </g>

                        <g className="chat-vazio__balao chat-vazio__balao--principal">
                            <path d="M54 39h101c17 0 30 13 30 30v34c0 17-13 30-30 30h-46l-29 23v-23H54c-17 0-30-13-30-30V69c0-17 13-30 30-30Z" />
                            <circle cx="78" cy="86" r="7" />
                            <circle cx="105" cy="86" r="7" />
                            <circle cx="132" cy="86" r="7" />
                        </g>
                    </svg>
                </div>

                <h2>Bem-vindo ao Fala Pommer</h2>

                <p>Selecione uma conversa ao lado para começar.</p>
            </div>
            )}
        </section>

        {menuAberto && (
            <div
                ref={menuRef}
                id="menu-principal"
                className="menu-modal"
            >

                {(usuario?.tipo === "admin" || usuario?.tipo === "funcionario" || usuario?.tipo === "superAdmin") && (
                    <div className="menu-modal-item menu-modal-criar-grupo">
                        <button
                            type="button"
                            className="menu-modal-button"
                            onClick={() => void abrirModalGrupo()}
                        >
                            <svg width="16" height="16" fill="currentColor" className="bi bi-person-plus icones-modal" viewBox="0 0 16 16">
                                <path d="M6 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H1s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C9.516 10.68 8.289 10 6 10s-3.516.68-4.168 1.332c-.678.678-.83 1.418-.832 1.664z"/>
                                <path fillRule="evenodd" d="M13.5 5a.5.5 0 0 1 .5.5V7h1.5a.5.5 0 0 1 0 1H14v1.5a.5.5 0 0 1-1 0V8h-1.5a.5.5 0 0 1 0-1H13V5.5a.5.5 0 0 1 .5-.5"/>
                            </svg>
                            <span className="menu-modal-texto">Novo grupo</span>
                        </button>
                    </div>
                )}

                {usuario?.tipo === "superAdmin" && (
                    <div className="menu-modal-item menu-modal-administracao">
                        <Link
                            to="/administracao"
                            className="menu-modal-button"
                        >
                            <svg
                            width="16"
                            height="16"
                            fill="currentColor"
                            className="bi bi-cup-hot icones-modal"
                            viewBox="0 0 16 16"
                            >
                            <path
                                className="menu-modal-icone-path"
                                fillRule="evenodd"
                                d="M.5 6a.5.5 0 0 0-.488.608l1.652 7.434A2.5 2.5 0 0 0 4.104 16h5.792a2.5 2.5 0 0 0 2.44-1.958l.131-.59a3 3 0 0 0 1.3-5.854l.221-.99A.5.5 0 0 0 13.5 6zM13 12.5a2 2 0 0 1-.316-.025l.867-3.898A2.001 2.001 0 0 1 13 12.5M2.64 13.825 1.123 7h11.754l-1.517 6.825A1.5 1.5 0 0 1 9.896 15H4.104a1.5 1.5 0 0 1-1.464-1.175"
                            />
                            <path
                                className="menu-modal-icone-path"
                                d="m4.4.8-.003.004-.014.019a4 4 0 0 0-.204.31 2 2 0 0 0-.141.267c-.026.06-.034.092-.037.103v.004a.6.6 0 0 0 .091.248c.075.133.178.272.308.445l.01.012c.118.158.26.347.37.543.112.2.22.455.22.745 0 .188-.065.368-.119.494a3 3 0 0 1-.202.388 5 5 0 0 1-.253.382l-.018.025-.005.008-.002.002A.5.5 0 0 1 3.6 4.2l.003-.004.014-.019a4 4 0 0 0 .204-.31 2 2 0 0 0 .141-.267c.026-.06.034-.092.037-.103a.6.6 0 0 0-.09-.252A4 4 0 0 0 3.6 2.8l-.01-.012a5 5 0 0 1-.37-.543A1.53 1.53 0 0 1 3 1.5c0-.188.065-.368.119-.494.059-.138.134-.274.202-.388a6 6 0 0 1 .253-.382l.025-.035A.5.5 0 0 1 4.4.8m3 0-.003.004-.014.019a4 4 0 0 0-.204.31 2 2 0 0 0-.141.267c-.026.06-.034.092-.037.103v.004a.6.6 0 0 0 .091.248c.075.133.178.272.308.445l.01.012c.118.158.26.347.37.543.112.2.22.455.22.745 0 .188-.065.368-.119.494a3 3 0 0 1-.202.388 5 5 0 0 1-.253.382l-.018.025-.005.008-.002.002A.5.5 0 0 1 6.6 4.2l.003-.004.014-.019a4 4 0 0 0 .204-.31 2 2 0 0 0 .141-.267c.026-.06.034-.092.037-.103a.6.6 0 0 0-.09-.252A4 4 0 0 0 6.6 2.8l-.01-.012a5 5 0 0 1-.37-.543A1.53 1.53 0 0 1 6 1.5c0-.188.065-.368.119-.494.059-.138.134-.274.202-.388a6 6 0 0 1 .253-.382l.025-.035A.5.5 0 0 1 7.4.8m3 0-.003.004-.014.019a4 4 0 0 0-.204.31 2 2 0 0 0-.141.267c-.026.06-.034.092-.037.103v.004a.6.6 0 0 0 .091.248c.075.133.178.272.308.445l.01.012c.118.158.26.347.37.543.112.2.22.455.22.745 0 .188-.065.368-.119.494a3 3 0 0 1-.202.388 5 5 0 0 1-.252.382l-.019.025-.005.008-.002.002A.5.5 0 0 1 9.6 4.2l.003-.004.014-.019a4 4 0 0 0 .204-.31 2 2 0 0 0 .141-.267c.026-.06.034-.092.037-.103a.6.6 0 0 0-.09-.252A4 4 0 0 0 9.6 2.8l-.01-.012a5 5 0 0 1-.37-.543A1.53 1.53 0 0 1 9 1.5c0-.188.065-.368.119-.494.059-.138.134-.274.202-.388a6 6 0 0 1 .253-.382l.025-.035A.5.5 0 0 1 10.4.8"
                            />
                            </svg>
                            <span className="menu-modal-texto">Administração</span>
                        </Link>
                    </div>
                )}

                <div className="menu-modal-item menu-modal-configuracoes">
                    <Link to="/configuracao" className="menu-modal-button">
                    <svg
                        width="16"
                        height="16"
                        fill="currentColor"
                        className="bi bi-gear icones-modal"
                        viewBox="0 0 16 16"
                    >
                        <path
                        className="menu-modal-icone-path"
                        d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492M5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0"
                        />
                        <path
                        className="menu-modal-icone-path"
                        d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115z"
                        />
                    </svg>
                    <span className="menu-modal-texto">Configurações</span>
                    </Link>
                </div>

                <div className="menu-modal-item menu-modal-sair">
                    <a onClick={sair} className="menu-modal-button sair">
                    <svg
                        width="16"
                        height="16"
                        fill="currentColor"
                        className="bi bi-box-arrow-left"
                        viewBox="0 0 16 16"
                    >
                        <path
                        fillRule="evenodd"
                        d="M6 12.5a.5.5 0 0 0 .5.5h8a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-8a.5.5 0 0 0-.5.5v2a.5.5 0 0 1-1 0v-2A1.5 1.5 0 0 1 6.5 2h8A1.5 1.5 0 0 1 16 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 5 12.5v-2a.5.5 0 0 1 1 0z"
                        />
                        <path
                        fillRule="evenodd"
                        d="M.146 8.354a.5.5 0 0 1 0-.708l3-3a.5.5 0 1 1 .708.708L1.707 7.5H10.5a.5.5 0 0 1 0 1H1.707l2.147 2.146a.5.5 0 0 1-.708.708z"
                        />
                    </svg>
                    <span className="menu-modal-texto">Sair</span>
                    </a>
                </div>
            </div>
        )}

        {modalGrupoAberto && usuario && usuario.tipo !== "user" && (
            <div
                className="modal-grupo"
                role="presentation"
                onMouseDown={(evento) => {
                    if (evento.target === evento.currentTarget) {
                        setModalGrupoAberto(false);
                    }
                }}
            >
                <section
                    className="modal-grupo__janela"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="modal-grupo-titulo"
                    aria-describedby="modal-grupo-descricao"
                >
                    <header className="modal-grupo__cabecalho">
                        <div className="modal-grupo__titulo">
                            <span className="modal-grupo__icone" aria-hidden="true">
                                <svg viewBox="0 0 24 24">
                                    <path d="M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19" />
                                    <circle cx="10" cy="7" r="3" />
                                    <path d="M17 8v6M14 11h6" />
                                </svg>
                            </span>

                            <div>
                                <span className="modal-grupo__etapa">
                                    SELECIONAR PARTICIPANTES
                                </span>
                                <h2 id="modal-grupo-titulo">Novo grupo</h2>
                                <p id="modal-grupo-descricao">
                                    Escolha os contatos que farão parte da conversa.
                                </p>
                            </div>
                        </div>

                        <button
                            ref={botaoFecharModalGrupoRef}
                            type="button"
                            className="modal-grupo__fechar"
                            onClick={() => setModalGrupoAberto(false)}
                            aria-label="Fechar criação de grupo"
                        >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M6 6l12 12M18 6 6 18" />
                            </svg>
                        </button>
                    </header>

                    <label className="modal-grupo__nome">
                        <span>Nome do grupo</span>
                        <div>
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M4 19.5V17a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2.5" />
                                <circle cx="10" cy="6.5" r="3.5" />
                                <path d="M17 8h4M19 6v4" />
                            </svg>
                            <input
                                type="text"
                                value={nomeGrupo}
                                onChange={(evento) => {
                                    setNomeGrupo(evento.target.value);
                                    setErroCriacaoGrupo("");
                                }}
                                placeholder="Ex.: Equipe de atendimento"
                                minLength={3}
                                maxLength={120}
                                autoComplete="off"
                            />
                            <small>{nomeGrupo.trim().length}/120</small>
                        </div>
                    </label>

                    <div className="modal-grupo__pesquisa">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <circle cx="11" cy="11" r="7" />
                            <path d="m16 16 4 4" />
                        </svg>
                        <input
                            type="search"
                            value={buscaContatoGrupo}
                            onChange={(evento) =>
                                setBuscaContatoGrupo(evento.target.value)
                            }
                            placeholder="Pesquisar contato"
                            aria-label="Pesquisar contato para o grupo"
                            autoComplete="off"
                        />
                    </div>

                    <div className="modal-grupo__rotulo-lista">
                        <span>CONTATOS</span>
                        {!carregandoContatosGrupo && !erroContatosGrupo && (
                            <span>{contatosGrupoFiltrados.length}</span>
                        )}
                    </div>

                    <div className="modal-grupo__contatos" data-lenis-prevent>
                        {carregandoContatosGrupo && (
                            <p className="modal-grupo__mensagem">
                                Carregando contatos...
                            </p>
                        )}

                        {!carregandoContatosGrupo && erroContatosGrupo && (
                            <p className="modal-grupo__mensagem modal-grupo__mensagem--erro">
                                {erroContatosGrupo}
                            </p>
                        )}

                        {!carregandoContatosGrupo &&
                            !erroContatosGrupo &&
                            contatosGrupoFiltrados.map((contato) => {
                                const selecionado =
                                    contatosGrupoSelecionados.has(contato.id);

                                return (
                                    <button
                                        key={contato.id}
                                        type="button"
                                        className={`modal-grupo__contato ${
                                            selecionado
                                                ? "modal-grupo__contato--selecionado"
                                                : ""
                                        }`}
                                        onClick={() =>
                                            alternarContatoGrupo(contato.id)
                                        }
                                        aria-pressed={selecionado}
                                    >
                                        <span className="modal-grupo__avatar">
                                            {renderizarAvatar(
                                                contato.nome,
                                                contato.foto_perfil_url,
                                            )}
                                        </span>

                                        <span className="modal-grupo__dados">
                                            <strong>{contato.nome}</strong>
                                            <span
                                                className={`modal-grupo__perfil modal-grupo__perfil--${contato.tipoUsuario}`}
                                            >
                                                {contato.tipoUsuario === "funcionario"
                                                    ? (contato.setor?.nome ?? "Funcionário")
                                                    : contato.tipoUsuario === "admin"
                                                        ? "Administrador"
                                                        : "Super Administrador"}
                                            </span>
                                        </span>

                                        <span
                                            className="modal-grupo__selecao"
                                            aria-hidden="true"
                                        >
                                            {selecionado && (
                                                <svg viewBox="0 0 16 16">
                                                    <path d="m3 8 3 3 7-7" />
                                                </svg>
                                            )}
                                        </span>
                                    </button>
                                );
                            })}

                        {!carregandoContatosGrupo &&
                            !erroContatosGrupo &&
                            contatosGrupoFiltrados.length === 0 && (
                                <p className="modal-grupo__mensagem">
                                    Nenhum contato encontrado.
                                </p>
                            )}
                    </div>

                    <footer className="modal-grupo__rodape">
                        <div className="modal-grupo__resumo">
                            <span className={
                                contatosGrupoSelecionados.size > 0
                                    ? "modal-grupo__contador modal-grupo__contador--ativo"
                                    : "modal-grupo__contador"
                            } aria-live="polite">
                                <svg viewBox="0 0 20 20" aria-hidden="true">
                                    <path d="M13.5 16v-1.25A2.75 2.75 0 0 0 10.75 12h-4.5a2.75 2.75 0 0 0-2.75 2.75V16" />
                                    <circle cx="8.5" cy="6.5" r="2.5" />
                                    <path d="M14.5 7v5M12 9.5h5" />
                                </svg>
                                {contatosGrupoSelecionados.size === 0
                                    ? "Selecione pelo menos 2 contatos"
                                    : contatosGrupoSelecionados.size === 1
                                        ? "Selecione mais 1 contato"
                                        : `${contatosGrupoSelecionados.size} contatos selecionados`}
                            </span>
                            {erroCriacaoGrupo && (
                                <span className="modal-grupo__erro" role="alert">
                                    {erroCriacaoGrupo}
                                </span>
                            )}
                        </div>
                        <button
                            type="button"
                            disabled={
                                nomeGrupo.trim().length < 3 ||
                                contatosGrupoSelecionados.size < 2 ||
                                criandoGrupo
                            }
                            onClick={() => void criarGrupo()}
                        >
                            {criandoGrupo
                                ? "Criando..."
                                : nomeGrupo.trim().length < 3
                                    ? "Informe o nome"
                                    : contatosGrupoSelecionados.size < 2
                                        ? "Selecione 2 contatos"
                                        : "Criar grupo"}
                        </button>
                    </footer>
                </section>
            </div>
        )}

        {modalAdicionarPessoaAberto &&
            conversaSelecionada?.tipo === "grupo" && (
            <div
                className="modal-grupo"
                role="presentation"
                onMouseDown={(evento) => {
                    if (evento.target === evento.currentTarget) {
                        setModalAdicionarPessoaAberto(false);
                    }
                }}
            >
                <section
                    className="modal-grupo__janela modal-grupo__janela--adicionar-pessoa"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="modal-adicionar-pessoa-titulo"
                    aria-describedby="modal-adicionar-pessoa-descricao"
                >
                    <header className="modal-grupo__cabecalho">
                        <div className="modal-grupo__titulo">
                            <span className="modal-grupo__icone" aria-hidden="true">
                                <svg viewBox="0 0 24 24">
                                    <path d="M15 19c0-2.21-2.69-4-6-4s-6 1.79-6 4" />
                                    <circle cx="9" cy="8" r="4" />
                                    <path d="M18 8v6M15 11h6" />
                                </svg>
                            </span>

                            <div>
                                <span className="modal-grupo__etapa">
                                    NOVO PARTICIPANTE
                                </span>
                                <h2 id="modal-adicionar-pessoa-titulo">
                                    Adicionar pessoa
                                </h2>
                                <p id="modal-adicionar-pessoa-descricao">
                                    Escolha quem você deseja adicionar ao grupo.
                                </p>
                            </div>
                        </div>

                        <button
                            ref={botaoFecharModalAdicionarPessoaRef}
                            type="button"
                            className="modal-grupo__fechar"
                            onClick={() => setModalAdicionarPessoaAberto(false)}
                            aria-label="Fechar adição de pessoa"
                        >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M6 6l12 12M18 6 6 18" />
                            </svg>
                        </button>
                    </header>

                    <div className="modal-grupo__pesquisa">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <circle cx="11" cy="11" r="7" />
                            <path d="m16 16 4 4" />
                        </svg>
                        <input
                            ref={inputBuscaPessoaGrupoRef}
                            type="search"
                            value={buscaPessoaGrupo}
                            onChange={(evento) =>
                                setBuscaPessoaGrupo(evento.target.value)
                            }
                            placeholder="Pesquisar pessoa"
                            aria-label="Pesquisar pessoa para adicionar ao grupo"
                            autoComplete="off"
                        />
                    </div>

                    <div className="modal-grupo__rotulo-lista" data-lenis-prevent>
                        <span>PESSOAS DISPONÍVEIS</span>
                        {!carregandoContatosModalAdicionarPessoas &&
                            !erroContatosModalAdicionarPessoas && (
                            <span>{contatosDisponiveisParaGrupo.length}</span>
                        )}
                    </div>

                    <div className="modal-grupo__contatos" >

                        {carregandoContatosModalAdicionarPessoas && (
                            <p className="modal-grupo__mensagem">
                                Carregando contatos...
                            </p>
                        )}

                        {!carregandoContatosModalAdicionarPessoas &&
                            erroContatosModalAdicionarPessoas && (
                            <p className="modal-grupo__mensagem modal-grupo__mensagem--erro">
                                {erroContatosModalAdicionarPessoas}
                            </p>
                        )}

                        {!carregandoContatosModalAdicionarPessoas &&
                            !erroContatosModalAdicionarPessoas &&
                            contatosDisponiveisParaGrupo.map((contato) => {
                                const selecionado =
                                    contatosModalAdicionarPessoasSelecionados.has(
                                        contato.id,
                                    );

                                return (
                                    <button
                                        key={contato.id}
                                        type="button"
                                        className={`modal-grupo__contato ${
                                            selecionado
                                                ? "modal-grupo__contato--selecionado"
                                                : ""
                                        }`}
                                        onClick={() =>
                                            alternarContatoModalAdicionarPessoas(
                                                contato.id,
                                            )
                                        }
                                        aria-pressed={selecionado}
                                    >
                                        <span className="modal-grupo__avatar">
                                            {renderizarAvatar(
                                                contato.nome,
                                                contato.foto_perfil_url,
                                            )}
                                        </span>

                                        <span className="modal-grupo__dados">
                                            <strong>{contato.nome}</strong>
                                            <span
                                                className={`modal-grupo__perfil modal-grupo__perfil--${contato.tipoUsuario}`}
                                            >
                                                {contato.tipoUsuario === "funcionario"
                                                    ? (contato.setor?.nome ?? "Funcionário")
                                                    : contato.tipoUsuario === "admin"
                                                        ? "Administrador"
                                                        : "Super Administrador"}
                                            </span>
                                        </span>

                                        <span
                                            className="modal-grupo__selecao"
                                            aria-hidden="true"
                                        >
                                            {selecionado && (
                                                <svg viewBox="0 0 16 16">
                                                    <path d="m3 8 3 3 7-7" />
                                                </svg>
                                            )}
                                        </span>
                                    </button>
                                );
                        })}

                        {!carregandoContatosModalAdicionarPessoas &&
                            !erroContatosModalAdicionarPessoas &&
                            contatosDisponiveisParaGrupo.length === 0 && (
                                <p className="modal-grupo__mensagem">
                                    Nenhum contato encontrado.
                                </p>
                        )}
                    </div>

                    <footer className="modal-grupo__rodape">
                        <div className="modal-grupo__resumo">
                            <span
                                className={
                                    contatosModalAdicionarPessoasSelecionados.size > 0
                                        ? "modal-grupo__contador modal-grupo__contador--ativo"
                                        : "modal-grupo__contador"
                                }
                                aria-live="polite"
                            >
                                <svg viewBox="0 0 20 20" aria-hidden="true">
                                    <path d="M13.5 16v-1.25A2.75 2.75 0 0 0 10.75 12h-4.5a2.75 2.75 0 0 0-2.75 2.75V16" />
                                    <circle cx="8.5" cy="6.5" r="2.5" />
                                    <path d="M14.5 7v5M12 9.5h5" />
                                </svg>
                                {contatosModalAdicionarPessoasSelecionados.size === 0
                                    ? "Nenhuma pessoa selecionada"
                                    : contatosModalAdicionarPessoasSelecionados.size === 1
                                        ? "1 pessoa selecionada"
                                        : `${contatosModalAdicionarPessoasSelecionados.size} pessoas selecionadas`}
                            </span>
                            {erroAdicionarPessoasGrupo && (
                                <span className="modal-grupo__erro" role="alert">
                                    {erroAdicionarPessoasGrupo}
                                </span>
                            )}
                        </div>
                        <button
                            type="button"
                            disabled={
                                contatosModalAdicionarPessoasSelecionados.size < 1 ||
                                adicionandoPessoasGrupo
                            }
                            onClick={() => void adicionarPessoasAoGrupo()}
                        >
                            {adicionandoPessoasGrupo
                                ? "Adicionando..."
                                : "Adicionar ao grupo"}
                        </button>
                    </footer>
                </section>
            </div>
        )}

        {modalTransferirConversa &&
            conversaSelecionada?.tipo === "setor" && (
                <div
                    className="modal-grupo"
                    role="presentation"
                    onMouseDown={(evento) => {
                        if (evento.target === evento.currentTarget) {
                            setModalTransferirConversa(false);
                        }
                    }}
                >
                    <section
                        className="modal-grupo__janela modal-grupo__janela--transferencia"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="modal-transferencia-titulo"
                        aria-describedby="modal-transferencia-descricao"
                    >
                        <header className="modal-grupo__cabecalho modal-transferencia__cabecalho">
                            <div className="modal-grupo__titulo">
                                <span className="modal-grupo__icone" aria-hidden="true">
                                    <svg viewBox="0 0 24 24">
                                        <path d="M5 8h13M15 5l3 3-3 3" />
                                        <path d="M19 16H6M9 13l-3 3 3 3" />
                                    </svg>
                                </span>

                                <div>
                                    <span className="modal-grupo__etapa">
                                        TRANSFERÊNCIA
                                    </span>
                                    <h2 id="modal-transferencia-titulo">
                                        Transferir conversa
                                    </h2>
                                    <p id="modal-transferencia-descricao">
                                        Selecione o setor para o qual deseja
                                        transferir esta conversa.
                                    </p>
                                </div>
                            </div>

                            <button
                                ref={botaoFecharModalTransferenciaRef}
                                type="button"
                                className="modal-grupo__fechar"
                                onClick={() => setModalTransferirConversa(false)}
                                aria-label="Fechar transferência de conversa"
                            >
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M6 6l12 12M18 6 6 18" />
                                </svg>
                            </button>
                        </header>

                        <div
                            className="modal-transferencia__etapas"
                            aria-label="Etapas da escolha do destino"
                        >
                            <button
                                type="button"
                                className={
                                    secretariaTransferenciaSelecionada
                                        ? "modal-transferencia__etapa modal-transferencia__etapa--concluida"
                                        : "modal-transferencia__etapa modal-transferencia__etapa--ativa"
                                }
                                onClick={() =>
                                    setSecretariaTransferenciaSelecionadaId(null)
                                }
                                aria-current={
                                    secretariaTransferenciaSelecionada
                                        ? undefined
                                        : "step"
                                }
                            >
                                <span>1</span>
                                Secretaria
                            </button>
                            <span
                                className={
                                    secretariaTransferenciaSelecionada
                                        ? "modal-transferencia__linha modal-transferencia__linha--ativa"
                                        : "modal-transferencia__linha"
                                }
                                aria-hidden="true"
                            />
                            <div
                                className={
                                    secretariaTransferenciaSelecionada
                                        ? "modal-transferencia__etapa modal-transferencia__etapa--ativa"
                                        : "modal-transferencia__etapa"
                                }
                                aria-current={
                                    secretariaTransferenciaSelecionada
                                        ? "step"
                                        : undefined
                                }
                            >
                                <span>2</span>
                                Setor
                            </div>
                        </div>

                        <div className="modal-grupo__pesquisa modal-transferencia__pesquisa">
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <circle cx="11" cy="11" r="7" />
                                <path d="m16 16 4 4" />
                            </svg>
                            <input
                                ref={inputBuscaSetorTransferenciaRef}
                                type="search"
                                value={buscarSetorTranfConversa}
                                onChange={(evento) =>
                                    setBuscarSetorTranfConversa(evento.target.value)
                                }
                                placeholder={
                                    secretariaTransferenciaSelecionada
                                        ? "Pesquisar setor"
                                        : "Pesquisar secretaria"
                                }
                                aria-label={
                                    secretariaTransferenciaSelecionada
                                        ? "Pesquisar setor"
                                        : "Pesquisar secretaria"
                                }
                                autoComplete="off"
                            />
                        </div>

                        <div className="modal-grupo__rotulo-lista modal-transferencia__rotulo-lista">
                            {secretariaTransferenciaSelecionada ? (
                                <button
                                    type="button"
                                    className="modal-transferencia__voltar"
                                    onClick={() =>
                                        setSecretariaTransferenciaSelecionadaId(null)
                                    }
                                >
                                    <svg viewBox="0 0 24 24" aria-hidden="true">
                                        <path d="m15 18-6-6 6-6" />
                                    </svg>
                                    <span>
                                        {secretariaTransferenciaSelecionada.nome}
                                    </span>
                                </button>
                            ) : (
                                <span>ESCOLHA UMA SECRETARIA</span>
                            )}
                            <span className="modal-transferencia__quantidade">
                                {secretariaTransferenciaSelecionada
                                    ? setoresDaSecretariaSelecionada.length
                                    : secretariasDisponiveisParaEnvio.length}
                            </span>
                        </div>

                        <div
                            className="modal-grupo__contatos modal-transferencia__lista"
                            data-lenis-prevent
                            aria-live="polite"
                        >
                            {secretariaTransferenciaSelecionada
                                ? setoresDaSecretariaSelecionada.map((setor) => {
                                    const setorAtual =
                                        conversaSelecionada?.tipo === "setor" &&
                                        setor.id === conversaSelecionada.setor.id;

                                    return (
                                    <button
                                        key={setor.id}
                                        type="button"
                                        className={`modal-grupo__contato modal-transferencia__item${
                                            setorAtual
                                                ? " modal-transferencia__item--atual"
                                                : ""
                                        }`}
                                        disabled={setorAtual}
                                        onClick={() => {
                                            setSetorTransferenciaSelecionado(setor);
                                            setMensagemTransferencia("");
                                            setErroTransferencia("");
                                            setModalTransferirConversa(false);
                                        }}
                                    >
                                        <span className="modal-transferencia__item-icone">
                                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                                <rect x="4" y="7" width="16" height="13" rx="2" />
                                                <path d="M9 7V5h6v2M4 12h16M10 12v2h4v-2" />
                                            </svg>
                                        </span>
                                        <span className="modal-grupo__dados">
                                            <strong>{setor.setor}</strong>
                                            <span>{setor.sigla_setor}</span>
                                        </span>
                                        <span
                                            className={`modal-transferencia__disponivel${
                                                setorAtual
                                                    ? " modal-transferencia__disponivel--atual"
                                                    : ""
                                            }`}
                                        >
                                            <span aria-hidden="true" />
                                            {setorAtual ? "Setor atual" : "Disponível"}
                                        </span>
                                    </button>
                                    );
                                })
                                : secretariasDisponiveisParaEnvio.map(
                                    (secretaria) => (
                                        <button
                                            key={secretaria.id}
                                            type="button"
                                            className="modal-grupo__contato modal-transferencia__item"
                                            onClick={() => {
                                                setSecretariaTransferenciaSelecionadaId(
                                                    secretaria.id,
                                                );
                                                setBuscarSetorTranfConversa("");
                                            }}
                                        >
                                            <span className="modal-transferencia__item-icone modal-transferencia__item-icone--secretaria">
                                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                                    <path d="M4 20h16M6 20V8l6-4 6 4v12" />
                                                    <path d="M9 11h1M14 11h1M9 15h1M14 15h1" />
                                                </svg>
                                            </span>
                                            <span className="modal-grupo__dados">
                                                <strong>{secretaria.nome}</strong>
                                                <span>
                                                    {secretaria.sigla_secretaria} •{" "}
                                                    {
                                                        setoresDisponiveisParaEnvio.filter(
                                                            (setor) =>
                                                                setor.secretaria?.id ===
                                                                secretaria.id,
                                                        ).length
                                                    }{" "}
                                                    setores
                                                </span>
                                            </span>
                                            <span
                                                className="modal-grupo__selecao"
                                                aria-hidden="true"
                                            >
                                                <svg viewBox="0 0 16 16">
                                                    <path d="m6 3 5 5-5 5" />
                                                </svg>
                                            </span>
                                        </button>
                                    ),
                                )}

                            {secretariaTransferenciaSelecionada &&
                                setoresDaSecretariaSelecionada.length === 0 && (
                                <div className="modal-transferencia__vazio">
                                    <svg viewBox="0 0 24 24" aria-hidden="true">
                                        <circle cx="11" cy="11" r="7" />
                                        <path d="m16 16 4 4" />
                                    </svg>
                                    <strong>Nenhum setor encontrado</strong>
                                    <span>Tente pesquisar por outro termo.</span>
                                </div>
                            )}

                            {!secretariaTransferenciaSelecionada &&
                                secretariasDisponiveisParaEnvio.length === 0 && (
                                <div className="modal-transferencia__vazio">
                                    <svg viewBox="0 0 24 24" aria-hidden="true">
                                        <circle cx="11" cy="11" r="7" />
                                        <path d="m16 16 4 4" />
                                    </svg>
                                    <strong>Nenhuma secretaria encontrada</strong>
                                    <span>Tente pesquisar por outro termo.</span>
                                </div>
                            )}
                        </div>

                        <footer className="modal-grupo__rodape modal-transferencia__rodape">
                            <span className="modal-transferencia__legenda">
                                <span aria-hidden="true" />
                                Somente setores com funcionários vinculados
                            </span>
                        </footer>
                    </section>
                </div>
            )
        }

        {arquivoEmVisualizacao && (
            <div
                className="visualizador-arquivo"
                role="presentation"
                onMouseDown={(evento) => {
                    if (evento.target === evento.currentTarget) {
                        setArquivoEmVisualizacao(null);
                    }
                }}
            >
                <section
                    className="visualizador-arquivo__janela"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="visualizador-arquivo-titulo"
                >
                    <header className="visualizador-arquivo__cabecalho">
                        <div className="visualizador-arquivo__dados">
                            <strong id="visualizador-arquivo-titulo">
                                {arquivoEmVisualizacao.nome}
                            </strong>
                            <span>
                                {formatarTamanhoArquivo(arquivoEmVisualizacao.tamanho)}
                            </span>
                        </div>

                        <div className="visualizador-arquivo__acoes">
                            <a
                                href={obterUrlArquivo(arquivoEmVisualizacao.url)}
                                download={arquivoEmVisualizacao.nome}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={`Baixar ${arquivoEmVisualizacao.nome}`}
                                title="Baixar arquivo"
                            >
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M12 3v12m0 0 5-5m-5 5-5-5M5 21h14" />
                                </svg>
                            </a>
                            <button
                                ref={botaoFecharVisualizadorRef}
                                type="button"
                                onClick={() => setArquivoEmVisualizacao(null)}
                                aria-label="Fechar visualização"
                                title="Fechar"
                            >
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="m6 6 12 12M18 6 6 18" />
                                </svg>
                            </button>
                        </div>
                    </header>

                    <div
                        className={`visualizador-arquivo__conteudo ${
                            arquivoEmVisualizacao.tipo === "imagem"
                                ? "visualizador-arquivo__conteudo--imagem"
                                : ""
                        }`}
                    >
                        {arquivoEmVisualizacao.tipo === "imagem" && (
                            <img
                                src={obterUrlArquivo(arquivoEmVisualizacao.url)}
                                alt={arquivoEmVisualizacao.nome}
                            />
                        )}

                        {arquivoEmVisualizacao.tipo === "documento" &&
                            (arquivoEmVisualizacao.mime === "application/pdf" ||
                            arquivoEmVisualizacao.mime.startsWith("text/") ? (
                                <iframe
                                    className={
                                        arquivoEmVisualizacao.mime.startsWith("text/")
                                            ? "visualizador-arquivo__texto"
                                            : undefined
                                    }
                                    src={obterUrlArquivo(arquivoEmVisualizacao.url)}
                                    title={`Visualização de ${arquivoEmVisualizacao.nome}`}
                                />
                            ) : (
                                <div className="visualizador-arquivo__indisponivel">
                                    <span aria-hidden="true">📄</span>
                                    <strong>Pré-visualização não disponível</strong>
                                    <p>
                                        Este formato precisa ser aberto em um aplicativo compatível.
                                    </p>
                                    <a
                                        href={obterUrlArquivo(arquivoEmVisualizacao.url)}
                                        download={arquivoEmVisualizacao.nome}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        Baixar arquivo
                                    </a>
                                </div>
                            ))}
                    </div>
                </section>
            </div>
        )}

        {usuario?.tipo === "user" && (
            <ModalFinalizarConversa
                aberto={modalFinalizarAberto}
                enviando={enviandoAvaliacao}
                aoEnviar={enviarAvaliacao}
            />
        )}

        {modalDadosGrupoAberto && conversaSelecionada?.tipo === "grupo" && (
            <div
                className="modal-dados__fundo"
                onClick={() => setModalDadosGrupoAberto(false)}
            >
                <section
                    className="modal-dados modal-dados-grupo"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="modal-dados-grupo-titulo"
                    onClick={(evento) => evento.stopPropagation()}
                >
                    <header className="modal-dados__cabecalho">
                        <h2 id="modal-dados-grupo-titulo">
                            Dados do grupo
                        </h2>
                        <button
                            ref={botaoFecharModalDadosGrupoRef}
                            type="button"
                            aria-label="Fechar"
                            onClick={() => setModalDadosGrupoAberto(false)}
                        >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="m6 6 12 12M18 6 6 18" />
                            </svg>
                        </button>
                    </header>

                    <div className="modal-dados__conteudo">
                        <div className="modal-dados-grupo__identidade">
                            <div
                                className="modal-dados-grupo__avatar-principal"
                                aria-hidden="true"
                            >
                                <svg width="16" height="16" fill="currentColor" className="bi bi-people-fill" viewBox="0 0 16 16">
                                    <path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6m-5.784 6A2.24 2.24 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.3 6.3 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1zM4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5"/>
                                </svg>
                            </div>
                            <div className="modal-dados-grupo__identificacao">
                                <strong>{conversaSelecionada.nome}</strong>
                                <span>
                                    {conversaSelecionada.totalParticipantes === 1
                                        ? "1 participante"
                                        : `${conversaSelecionada.totalParticipantes} participantes`}
                                </span>
                            </div>
                        </div>

                        <section
                            className="modal-dados-grupo__participantes"
                            aria-labelledby="modal-dados-grupo-participantes"
                        >
                            <div className="modal-dados-grupo__secao-titulo">
                                <h3 id="modal-dados-grupo-participantes">
                                    Participantes
                                </h3>
                                <span>{conversaSelecionada.totalParticipantes}</span>
                            </div>

                            {conversaSelecionada.participantes.length > 0 ? (
                                <ul data-lenis-prevent>
                                    {[...conversaSelecionada.participantes]
                                        .sort((primeiro, segundo) => {
                                            if (primeiro.id === usuario?.sub) return -1;
                                            if (segundo.id === usuario?.sub) return 1;
                                            return primeiro.nome.localeCompare(
                                                segundo.nome,
                                                "pt-BR",
                                            );
                                        })
                                        .map((participante) => (
                                            <li key={participante.id}>
                                                <div className="modal-dados-grupo__participante-avatar">
                                                    {renderizarAvatar(
                                                        participante.nome,
                                                        participante.foto_perfil_url,
                                                    )}
                                                </div>
                                                <div className="modal-dados-grupo__participante-dados">
                                                    <div>
                                                        <strong>{participante.nome}</strong>
                                                        {participante.id === usuario?.sub && (
                                                            <span className="modal-dados-grupo__voce">
                                                                Você
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span>
                                                        {participante.tipo_usuario === "superAdmin"
                                                            ? "Super administrador"
                                                            : participante.tipo_usuario === "admin"
                                                                ? "Administrador"
                                                                : participante.tipo_usuario === "funcionario"
                                                                    ? "Funcionário"
                                                                    : "Usuário"}
                                                    </span>
                                                </div>
                                            </li>
                                        ))}
                                </ul>
                            ) : (
                                <p className="modal-dados-grupo__sem-participantes">
                                    Este grupo não possui participantes.
                                </p>
                            )}
                        </section>
                    </div>
                </section>
            </div>
        )}

        {/*
            Modal dos dados das comunidades.
            Localizado em components/home/ModalDadosComunidades.tsx
        */}
        <ModalDadosComunidades
            aberto={modalDadosComunidadeAberto}
            comunidade={
                conversaSelecionada?.tipo === "comunidade" ? dados : null
            }
            conversaSelecionada={
                conversaSelecionada?.tipo === "comunidade"
                    ? conversaSelecionada
                    : null
            }
            usuario={usuario}
            aoFechar={() => setModalDadosComunidadeAberto(false)}
            botaoFecharRef={botaoFecharModalDadosComunidadeRef}
            renderizarAvatar={renderizarAvatar}
            aoAdicionarMembros={aoAdicionarMembrosComunidade}
        />

        <ModalConfirmacao
            aberto={setorTransferenciaSelecionado !== null}
            titulo="Confirmar transferência"
            mensagem={
                setorTransferenciaSelecionado
                    ? `Deseja transferir a conversa para o setor ${setorTransferenciaSelecionado.setor}?`
                    : ""
            }
            textoConfirmar="Confirmar"
            textoCarregando="Transferindo..."
            carregando={transferindoConversa}
            confirmarDesabilitado={
                mensagemTransferencia.trim().length < 10
            }
            aoCancelar={() => {
                setSetorTransferenciaSelecionado(null);
                setMensagemTransferencia("");
                setErroTransferencia("");
                setModalTransferirConversa(true);
            }}
            aoConfirmar={() => void confirmarTransferenciaConversa()}
        >
            <label
                className="modal-transferencia-confirmacao__mensagem"
                htmlFor="mensagem-transferencia"
            >
                <span>
                    Mensagem de transferência
                    <span
                        className="modal-transferencia-confirmacao__obrigatorio"
                        aria-hidden="true"
                    >
                        *
                    </span>
                </span>
                <small id="mensagem-transferencia-ajuda">
                    Explique o motivo da transferência e o que o próximo funcionário
                    precisa saber para continuar o atendimento. Mínimo de 10 caracteres.
                </small>
                <textarea
                    id="mensagem-transferencia"
                    value={mensagemTransferencia}
                    onChange={(evento) =>
                        setMensagemTransferencia(evento.target.value)
                    }
                    placeholder="Ex.: O cidadão precisa de ajuda com..."
                    rows={4}
                    maxLength={500}
                    minLength={10}
                    required
                    aria-describedby={
                        erroTransferencia
                            ? "mensagem-transferencia-ajuda mensagem-transferencia-erro"
                            : "mensagem-transferencia-ajuda"
                    }
                    disabled={transferindoConversa}
                />
                {erroTransferencia && (
                    <span
                        id="mensagem-transferencia-erro"
                        className="modal-transferencia-confirmacao__erro"
                        role="alert"
                    >
                        {erroTransferencia}
                    </span>
                )}
            </label>
        </ModalConfirmacao>

        <ModalConfirmacao
            aberto={modalSairGrupoAberto}
            titulo="Sair do grupo?"
            mensagem="Você deixará de ver as mensagens e não terá mais acesso a este grupo."
            carregando={saindoDoGrupo}
            textoConfirmar="Sair do grupo"
            textoCarregando="Saindo..."
            aoCancelar={() => setModalSairGrupoAberto(false)}
            aoConfirmar={() => void sairDoGrupoSelecionado()}
        />

        <ModalFeedback
            aberto={feedbackFinalizacao.aberto}
            tipo={feedbackFinalizacao.tipo}
            mensagem={feedbackFinalizacao.mensagem}
            aoFechar={() => {
                setFeedbackFinalizacao((estadoAtual) => ({
                    ...estadoAtual,
                    aberto: false,
                }));
            }}
        />

        <ModalFeedback
            aberto={feedback.aberto}
            tipo={feedback.tipo}
            mensagem={feedback.mensagem}
            aoFechar={() => {
                setFeedback((estadoAtual) => ({
                    ...estadoAtual,
                    aberto: false,
                }))
            }}
        />
        </main>
    );
}

export default Home;
