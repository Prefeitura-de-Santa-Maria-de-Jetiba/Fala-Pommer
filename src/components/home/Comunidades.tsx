import { apiFetch } from "../../services/api";
import { ModalFeedback } from "../ModalFeedback";
import ModalDescobrirComunidades from "../home/ModalDescobrirComunidades"
import "./css/Comunidades.css";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { FuncaoDosMembrosComunidade } from "./ModalDadosComunidades";
import { obterUrlImagemComunidade } from "../../utils/imagemComunidade";

type TipoUsuario = "user" | "admin" | "funcionario" | "superAdmin";

interface UsuarioAutenticado {
    sub: number;
    tipo: TipoUsuario;
}

export interface Comunidade {
    id: number;
    nome_comunidade: string;
    descricao_comunidade: string;
    imagem_comunidade: string | null;
    participa: boolean;
    categorias: string;
    totalParticipantes: number;
    comunidade_criada_em: string;
    criador_nome: string;
    funcaoDosMembrosComunidade: FuncaoDosMembrosComunidade | null;
}

const categoriasCriarComunidades = [
    {
        value: "geral",
        opcao: "Geral"
    },
    {
        value: "saude",
        opcao: "Saúde"
    },
    {
        value: "lazer",
        opcao: "Lazer"
    },
    {
        value: "esportes",
        opcao: "Esportes"
    },
    {
        value: "educacao",
        opcao: "Educação"
    },
    {
        value: "meio_ambiente",
        opcao: "Meio ambiente"
    },
    {
        value: "seguranca",
        opcao: "Segurança"
    },
    {
        value: "obras",
        opcao: "Obras"
    },
];

async function gerarImagemIconeComunidade(emoji: string, cor: string) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;

    const contexto = canvas.getContext("2d");

    if (!contexto) {
        throw new Error("Não foi possível gerar a imagem do ícone da comunidade.");
    }

    const fonte = '248px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
    await document.fonts.load(fonte, emoji);

    contexto.fillStyle = cor;
    contexto.fillRect(0, 0, canvas.width, canvas.height);
    contexto.font = fonte;
    contexto.textAlign = "center";
    contexto.textBaseline = "alphabetic";
    contexto.fillStyle = "#ffffff";
    contexto.shadowColor = "rgba(0, 0, 0, 0.25)";
    contexto.shadowBlur = 19;
    contexto.shadowOffsetY = 12;

    const medidas = contexto.measureText(emoji);
    const centroVertical = canvas.height / 2
        + (medidas.actualBoundingBoxAscent - medidas.actualBoundingBoxDescent) / 2;

    contexto.fillText(emoji, canvas.width / 2, centroVertical);

    const imagem = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) {
                resolve(blob);
            } else {
                reject(new Error("Não foi possível converter o ícone da comunidade em PNG."));
            }
        }, "image/png");
    });

    return new File([imagem], "icone-comunidade.png", { type: "image/png" });
}

interface ComunidadesProps {
    aoAbrir: (comunidade: Comunidade) => void;
    comunidadeSelecionada: Comunidade | null;
}

function Comunidades({ aoAbrir, comunidadeSelecionada }: ComunidadesProps) {
    const [novaComunidade, setNovaComunidade] = useState(false);
    const [criarComunidade, setCriarComunidade] = useState(false);
    const [usuario, setUsuario] = useState<UsuarioAutenticado | null>(null);
    const [comunidades, setComunidades] = useState<Comunidade[]>([]);
    const [salvando, setSalvando] = useState(false);
    const [feedback, setFeedback] = useState({
        aberto: false,
        tipo: "erro" as "erro" | "sucesso",
        mensagem: "",
    });

    const descricaoPadrao = "Olá! Esta comunidade foi criada para que os membros possam conversar em grupos de assuntos específicos e receber avisos importantes.";
    const [descricaoComunidade, setDescricaoComunidade] = useState(descricaoPadrao);
    const [fotoComunidade, setFotoComunidade] = useState<File | null>(null);
    const [fotoPreview, setFotoPreview] = useState<string | null>(null);
    const [iconeAleatorio, setIconeAleatorio] = useState<string | null>(null);
    const [corIconeAleatorio, setCorIconeAleatorio] = useState<string | null>(null);
    const nomeComunidadeRef = useRef<HTMLInputElement>(null);
    const descricaoRef = useRef<HTMLTextAreaElement>(null);
    const ocultarMunicipesRef = useRef<HTMLInputElement>(null);
    const categoriasRef = useRef<HTMLSelectElement>(null);

    const [abrirModalDescobrirMais, setAbrirModalDescobrirMais] = useState(false)

    //função de emoji aleatório
    function emojiAleatorio() {
        const emojis = [
            '😀', '🤩', '🫡', '🤔', '😍', '💙', '👥', '🤝',
            '🏘️', '🏡', '🏛️', '📍', '💬', '📢', '🔔', '📰',
            '💡', '📚', '🎓', '💼', '🛠️', '💻', '📱', '🏥',
            '🩺', '⚽', '🏆', '🎨', '🎵', '🎉', '📅', '🎯',
            '🚲', '🚌', '🚗', '🛒', '🍲', '☕', '🐾', '🌱',
            '🌳', '🌎', '♻️', '☀️', '🌧️', '✨', '🛡️', '🚨'
        ];

        let emoji = '';

        for(let i = 0; i < 1; i++) {
            emoji = emojis[Math.floor(Math.random() * emojis.length)];
        }
        return emoji;
    }

    //função que retorna uma cor aleatória
    function corAleatoria() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    useEffect(() => {
        if (!fotoComunidade) {
            setFotoPreview(null);
            return;
        }

        const urlPreview = URL.createObjectURL(fotoComunidade);
        setFotoPreview(urlPreview);

        return () => URL.revokeObjectURL(urlPreview);
    }, [fotoComunidade]);

    useLayoutEffect(() => {
        const campoDescricao = descricaoRef.current;

        if (!campoDescricao) return;

        campoDescricao.style.height = "auto";
        campoDescricao.style.height = `${campoDescricao.scrollHeight}px`;
    }, [descricaoComunidade, criarComunidade]);

    useEffect(() => {
        if (!comunidadeSelecionada) return;
        setComunidades((atuais) => atuais.map((comunidade) =>
            comunidade.id === comunidadeSelecionada.id ? comunidadeSelecionada : comunidade
        ));
    }, [comunidadeSelecionada]);

    //envia as comunidades criadas via Post
    async function cadastrarComunidade() {
        if (salvando) return;
        setSalvando(true);
        try {
            const corpo = new FormData();

            corpo.append(
                "nome_comunidade",
                nomeComunidadeRef.current?.value ?? ""
            );
            corpo.append(
                "descricao_comunidade",
                descricaoComunidade
            );
            corpo.append(
                "ocultar_municipes",
                String(ocultarMunicipesRef.current?.checked ?? false)
            );
            corpo.append(
                "categorias",
                categoriasRef.current?.value ?? ""
            );

            if (fotoComunidade) {
                corpo.append("foto", fotoComunidade);
            } else if (iconeAleatorio && corIconeAleatorio) {
                const imagemIcone = await gerarImagemIconeComunidade(
                    iconeAleatorio,
                    corIconeAleatorio
                );
                corpo.append("foto", imagemIcone);
            }

            const resposta = await apiFetch("/comunidades", {
                method: "POST",
                body: corpo
            });

            if (!resposta.ok) {
                const resultado = await resposta.json();
                throw new Error(
                    Array.isArray(resultado.message)
                        ? resultado.message.join(", ")
                        : resultado.message
                );
            }

            const comunidadeCriada = await resposta.json() as Comunidade;

            setComunidades((comunidadesAtuais) => [
                ...comunidadesAtuais,
                comunidadeCriada
            ]);

            setFeedback({
                aberto: true,
                tipo: "sucesso",
                mensagem: "Comunidade criada com sucesso!"
            });

            setNovaComunidade(false);
            setCriarComunidade(false);
            setFotoComunidade(null);
            setFotoPreview(null);
            setIconeAleatorio(null);
            setCorIconeAleatorio(null);
            setDescricaoComunidade(descricaoPadrao);
            aoAbrir(comunidadeCriada);
        } catch (erro) {
            console.error("Erro ao criar comunidade:", erro);
            setFeedback({
                aberto: true,
                tipo: "erro",
                mensagem: `Erro ao criar comunidade: ${erro}`
            });
        } finally {
            setSalvando(false);
        }
    }

    //busca as comunidades via Get
    useEffect(() => {
        async function buscarComunidade() {
            try {
                const resposta = await apiFetch("/comunidades")

                if (!resposta.ok) {
                    return
                }

                const dados = await resposta.json() as Comunidade[];
                setComunidades(dados);

            } catch (erro) {
                console.error("Erro ao buscar comunidade:", erro);
                setFeedback({
                    aberto: true,
                    tipo: "erro",
                    mensagem: `Erro ao buscar comunidade: ${erro}`
                });
            }
        }

        buscarComunidade();
    }, []);
    
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

    //verifica se é seguidor
    const ehSeguidor = (c: Comunidade) =>
    c.funcaoDosMembrosComunidade?.tipo_funcao === "seguidor";

    // segue, mas não participa
    const comunidadeSeguindo = comunidades.filter(ehSeguidor);

    //filtra para comunidades que não participa, organiza por mais participantes
    //e pega as 5 comunidades com mais pessoas
    const ComunidadesComMaisPessoas = comunidades
    .filter((comunidade) => !comunidade.participa && !ehSeguidor(comunidade))
    .slice() // Cria uma cópia rasa antes de ordenar para garantir a imutabilidade
    .sort((a, b) => b.totalParticipantes - a.totalParticipantes) //organiza por ordem da comunidade com mais pessoas
    .slice(0, 5); //pega 5 comunidades com mais pessoas

    //participa da comunidade
    const participa = comunidades.filter((comunidade) => comunidade.participa);

    const comunidadesParaDescobrir = comunidades
    .filter((comunidade) => !comunidade.participa && !ehSeguidor(comunidade))
    .sort((a, b) => b.totalParticipantes - a.totalParticipantes);

    const podeCriarComunidade =
        usuario !== null && usuario.tipo !== "user";

    if (novaComunidade) {
        return (
            <>
                <header className="nova-comunidade">
                    <button
                        type="button"
                        aria-label="Voltar para comunidades"
                        title="Voltar para comunidades"
                        onClick={() => {
                            setNovaComunidade(false);
                            setCriarComunidade(false);
                        }}
                    >
                        <svg width="16" height="16" fill="currentColor" className="bi bi-arrow-left" viewBox="0 0 16 16" aria-hidden="true">
                            <path fillRule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8"/>
                        </svg>
                    </button>

                    <span>Nova Comunidade</span>
                </header>

                {!criarComunidade 
                    ? <main className="nova-comunidade__conteudo background-comunidades">
                        <section className="nova-comunidade__apresentacao">
                            <div className="nova-comunidade__icone">
                                <svg className="nova-comunidade__icone-svg" viewBox="0 0 24 24" aria-hidden="true">
                                    <path className="nova-comunidade__icone-path" fill="currentColor" strokeWidth="0.3" paintOrder="fill stroke" fillRule="evenodd" d="M6.37 18.67a1.81 1.81 0 0 1-.58-1.24c-.01-.5-.03-1.5.03-1.94a2.7 2.7 0 0 1 .4-1.1 2.84 2.84 0 0 1 .9-.82c.46-.28.98-.46 1.4-.58A12.2 12.2 0 0 1 12 12.5a12.69 12.69 0 0 1 3.47.49 5.76 5.76 0 0 1 1.52.65c.28.19.56.44.78.76a2.41 2.41 0 0 1 .41 1.1c.06.43.04 1.43.03 1.93a1.9 1.9 0 0 1-.58 1.24c-.22.2-.48.33-.75.33H7.12c-.27 0-.53-.13-.75-.33Zm13.6-3.27c.04.6.03.86.02 1.6v.49a4.58 4.58 0 0 1-.3 1.51h2.97c.72 0 1.31-1.85 1.33-2.58.01-.4.02-.13-.02-.46a2.34 2.34 0 0 0-.95-1.6 4.27 4.27 0 0 0-1.41-.68h-.02v-.01a7.72 7.72 0 0 0-2.35-.27 4.18 4.18 0 0 1 .72 2Zm-2.04-3.95a2.65 2.65 0 0 0 3.16.06 2.67 2.67 0 1 0-3.16-.06ZM14.9 9.62A3.54 3.54 0 0 0 15.5 7a3.56 3.56 0 1 0-.61 2.62Zm-7.88.4a2.67 2.67 0 1 0-5.16-1.38 2.67 2.67 0 0 0 5.16 1.38Zm-4.42 3.6-.18.05h-.03a4.3 4.3 0 0 0-1.41.69 2.3 2.3 0 0 0-.95 1.6c-.04.33-.03 1.06-.02 1.46.02.73.61 1.58 1.33 1.58H4.3a4.58 4.58 0 0 1-.3-1.51V17c-.01-.74-.02-1 .03-1.6 0-.05 0-.1.02-.15a4.48 4.48 0 0 1 .7-1.85 7.22 7.22 0 0 0-2.16.22Zm9.4.88c-1.21 0-2.22.2-2.92.4-.37.12-.68.23-.91.38-.23.13-.3.25-.34.34a.7.7 0 0 0-.03.14s0-.01 0 0L7.79 17h8.42v-1.24c-.01-.01 0 .01 0 0a.7.7 0 0 0-.04-.14c-.03-.09-.11-.2-.34-.34a3.84 3.84 0 0 0-.91-.37c-.7-.2-1.7-.41-2.92-.41ZM12 6a1.55 1.55 0 1 0 0 3.11c.86 0 1.56-.7 1.56-1.55C13.56 6.7 12.86 6 12 6Z" clipRule="evenodd" />
                                </svg>
                            </div>
                            
                            <div className="nova-comunidade__titulo-container">
                                <strong className="nova-comunidade__titulo">Criar comunidade</strong>
                            </div>
                            <div className="nova-comunidade__descricao-container">
                                <p className="nova-comunidade__descricao">Conecte sua comunidade em um só lugar. Crie grupos temáticos e envie avisos para todos em instantes.</p>
                            </div>
                        </section>

                        <div className="nova-comunidade__acoes">
                            <button 
                                className="nova-comunidade__comecar" 
                                type="button"
                                onClick={() => setCriarComunidade(true)}
                                >
                                Começar
                            </button>
                        </div>
                    </main>

                    : <main className="nova-comunidade__formulario background-comunidades">
                        <section className="nova-comunidade__formulario-conteudo">
                            <div className="nova-comunidade__imagem-container">
                                <input
                                    id="foto__comunidade"
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    hidden
                                    onChange={(evento) =>
                                        setFotoComunidade(evento.target.files?.[0] ?? null)
                                    }
                                />
                                <label
                                    className="nova-comunidade__imagem-preview"
                                    htmlFor="foto__comunidade"
                                    title="Selecionar imagem"
                                >
                                    {fotoPreview ? (
                                        <img
                                            className="nova-comunidade__imagem-selecionada"
                                            src={fotoPreview}
                                            alt="Prévia da imagem da comunidade"
                                        />
                                    ) : ( iconeAleatorio 
                                        ? <div
                                            className="nova-comunidade__avatar-aleatorio"
                                            style={{ backgroundColor: corIconeAleatorio ?? undefined }}
                                        >
                                            <span className="nova-comunidade__avatar-emoji" aria-hidden="true">
                                                {iconeAleatorio}
                                            </span>
                                        </div>

                                        : <>
                                            <svg className="nova-comunidade__imagem-padrao" viewBox="0 0 24 24" aria-hidden="true">
                                                <path className="nova-comunidade__imagem-padrao-path" fill="currentColor" strokeWidth="0.3" paintOrder="fill stroke" fillRule="evenodd" d="M6.37 18.67a1.81 1.81 0 0 1-.58-1.24c-.01-.5-.03-1.5.03-1.94a2.7 2.7 0 0 1 .4-1.1 2.84 2.84 0 0 1 .9-.82c.46-.28.98-.46 1.4-.58A12.2 12.2 0 0 1 12 12.5a12.69 12.69 0 0 1 3.47.49 5.76 5.76 0 0 1 1.52.65c.28.19.56.44.78.76a2.41 2.41 0 0 1 .41 1.1c.06.43.04 1.43.03 1.93a1.9 1.9 0 0 1-.58 1.24c-.22.2-.48.33-.75.33H7.12c-.27 0-.53-.13-.75-.33Zm13.6-3.27c.04.6.03.86.02 1.6v.49a4.58 4.58 0 0 1-.3 1.51h2.97c.72 0 1.31-1.85 1.33-2.58.01-.4.02-.13-.02-.46a2.34 2.34 0 0 0-.95-1.6 4.27 4.27 0 0 0-1.41-.68h-.02v-.01a7.72 7.72 0 0 0-2.35-.27 4.18 4.18 0 0 1 .72 2Zm-2.04-3.95a2.65 2.65 0 0 0 3.16.06 2.67 2.67 0 1 0-3.16-.06ZM14.9 9.62A3.54 3.54 0 0 0 15.5 7a3.56 3.56 0 1 0-.61 2.62Zm-7.88.4a2.67 2.67 0 1 0-5.16-1.38 2.67 2.67 0 0 0 5.16 1.38Zm-4.42 3.6-.18.05h-.03a4.3 4.3 0 0 0-1.41.69 2.3 2.3 0 0 0-.95 1.6c-.04.33-.03 1.06-.02 1.46.02.73.61 1.58 1.33 1.58H4.3a4.58 4.58 0 0 1-.3-1.51V17c-.01-.74-.02-1 .03-1.6 0-.05 0-.1.02-.15a4.48 4.48 0 0 1 .7-1.85 7.22 7.22 0 0 0-2.16.22Zm9.4.88c-1.21 0-2.22.2-2.92.4-.37.12-.68.23-.91.38-.23.13-.3.25-.34.34a.7.7 0 0 0-.03.14s0-.01 0 0L7.79 17h8.42v-1.24c-.01-.01 0 .01 0 0a.7.7 0 0 0-.04-.14c-.03-.09-.11-.2-.34-.34a3.84 3.84 0 0 0-.91-.37c-.7-.2-1.7-.41-2.92-.41ZM12 6a1.55 1.55 0 1 0 0 3.11c.86 0 1.56-.7 1.56-1.55C13.56 6.7 12.86 6 12 6Z" clipRule="evenodd" />
                                            </svg>
                                            <div className="nova-comunidade__imagem-instrucao">
                                                <svg width="16" height="16" fill="currentColor" className="nova-comunidade__imagem-icone bi bi-image" viewBox="0 0 16 16" aria-hidden="true">
                                                    <path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0"/>
                                                    <path d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1z"/>
                                                </svg>
                                                <p className="nova-comunidade__imagem-texto">Adicionar imagem da comunidade</p>
                                            </div>
                                        </>
                                    )}
                                </label>

                                <div className="nova-comunidade__imagem-acoes">
                                    <button 
                                        className="nova-comunidade__imagem-aleatorio" 
                                        type="button" aria-label="Imagem aleatória da comunidade" 
                                        title="Imagem aleatória da comunidade"
                                        onClick={() => {
                                            setFotoComunidade(null);
                                            setFotoPreview(null);
                                            setIconeAleatorio(emojiAleatorio());
                                            setCorIconeAleatorio(corAleatoria());
                                        }}
                                    >
                                        <svg width="16" height="16" fill="currentColor" className="nova-comunidade__imagem-aleatorio-icone bi bi-arrow-clockwise" viewBox="0 0 16 16" aria-hidden="true">
                                            <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/>
                                            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <div 
                                className="nova-comunidade__campo"
                                title="Nome da comunidade."
                            >
                                <input 
                                    ref={nomeComunidadeRef}
                                    className="nova-comunidade__input"
                                    type="text" 
                                    name="nome__comunidade" 
                                    id="nome__comunidade" 
                                    placeholder="Nome da comunidade"
                                    maxLength={150}
                                    required
                                    autoComplete="off"
                                />
                            </div>

                            <div 
                                className="nova-comunidade__campo nova-comunidade__campo--descricao"
                                title="Qual o propósito desta comunidade? É importante adicionar regras para os membros."
                            >
                                <label className="nova-comunidade__campo-rotulo" htmlFor="descricao__comunidade">
                                    Descrição da comunidade
                                </label>
                                <textarea
                                    ref={descricaoRef}
                                    className="nova-comunidade__descricao"
                                    name="descricao__comunidade"
                                    id="descricao__comunidade"
                                    value={descricaoComunidade}
                                    onChange={(evento) => setDescricaoComunidade(evento.target.value)}
                                    placeholder="Digite uma descrição para a comunidade"
                                    rows={3}
                                    maxLength={400}
                                    required
                                />
                                <div className="nova-comunidade__descricao-linha" aria-hidden="true"></div>
                            </div>

                            <div className="nova-comunidade__privacidade">
                                <input
                                    ref={ocultarMunicipesRef}
                                    className="nova-comunidade__privacidade-checkbox"
                                    type="checkbox"
                                    name="ocultar"
                                    id="ocultar"
                                />
                                <label
                                    className="nova-comunidade__privacidade-rotulo"
                                    htmlFor="ocultar"
                                >
                                    <span className="nova-comunidade__privacidade-controle" aria-hidden="true"></span>
                                    <span>Ocultar comunidade para munícipes</span>
                                </label>
                            </div>

                            <div className="nova-comunidade-container__selecao">
                                <label htmlFor="categoria">Categoria </label>
                                <select 
                                    name="categoria" 
                                    id="categoria" 
                                    className="nova-comunidade__selecao"
                                    ref={categoriasRef}
                                    required
                                >
                                    {categoriasCriarComunidades.map((categoria) => (
                                        <option key={categoria.value} value={categoria.value}>
                                            {categoria.opcao}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </section>

                        <div className="nova-comunidade__acoes">
                            <button
                                className="nova-comunidade__comecar" 
                                type="button"
                                onClick={cadastrarComunidade}
                                disabled={salvando}
                            >
                                {salvando ? 'Criando…' : 'Criar'}
                            </button>
                        </div>
                    </main>
                }
            </>
        );
    }

    return (
        <>
            <header className="comunidades-header">
                <div className="comunidades-header__conteudo">
                    <strong className="comunidades-header__titulo">
                        Comunidades
                    </strong>
                    
                    {podeCriarComunidade && (
                        <button
                            type="button"
                            className="comunidades-header__adicionar"
                            aria-label="Criar nova comunidade"
                            title="Criar nova comunidade"
                            onClick={() => setNovaComunidade(true)}
                        >
                            <svg
                                width="20"
                                height="20"
                                fill="currentColor"
                                className="bi bi-plus-circle"
                                viewBox="0 0 16 16"
                                aria-hidden="true"
                            >
                                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
                                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4"/>
                            </svg>
                        </button>
                    )}

                </div>
            </header>

            <main className="comunidades-conteudo background-comunidades">

                {participa 
                    .map((comunidade) => (
                        <section
                            className="comunidades-acoes"
                            key={comunidade.id}
                        >
                            <div
                                role="button"
                                tabIndex={0}
                                className="comunidades-acoes__nova"
                                onClick={() => aoAbrir(comunidade)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        aoAbrir(comunidade);
                                    }
                                }}
                                aria-pressed={comunidadeSelecionada?.id === comunidade.id}
                            >
                                <div
                                    className="comunidades-acoes__icone"
                                    aria-hidden="true"
                                >
                                    {comunidade.imagem_comunidade !== null
                                        ? <img
                                            className="comunidades-acoes__imagem"
                                            src={obterUrlImagemComunidade(comunidade.imagem_comunidade)}
                                            alt=""
                                        />
                                        : <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                                            <path fill="currentColor" strokeWidth="0.3" paintOrder="fill stroke" fillRule="evenodd" d="M6.37 18.67a1.81 1.81 0 0 1-.58-1.24c-.01-.5-.03-1.5.03-1.94a2.7 2.7 0 0 1 .4-1.1 2.84 2.84 0 0 1 .9-.82c.46-.28.98-.46 1.4-.58A12.2 12.2 0 0 1 12 12.5a12.69 12.69 0 0 1 3.47.49 5.76 5.76 0 0 1 1.52.65c.28.19.56.44.78.76a2.41 2.41 0 0 1 .41 1.1c.06.43.04 1.43.03 1.93a1.9 1.9 0 0 1-.58 1.24c-.22.2-.48.33-.75.33H7.12c-.27 0-.53-.13-.75-.33Zm13.6-3.27c.04.6.03.86.02 1.6v.49a4.58 4.58 0 0 1-.3 1.51h2.97c.72 0 1.31-1.85 1.33-2.58.01-.4.02-.13-.02-.46a2.34 2.34 0 0 0-.95-1.6 4.27 4.27 0 0 0-1.41-.68h-.02v-.01a7.72 7.72 0 0 0-2.35-.27 4.18 4.18 0 0 1 .72 2Zm-2.04-3.95a2.65 2.65 0 0 0 3.16.06 2.67 2.67 0 1 0-3.16-.06ZM14.9 9.62A3.54 3.54 0 0 0 15.5 7a3.56 3.56 0 1 0-.61 2.62Zm-7.88.4a2.67 2.67 0 1 0-5.16-1.38 2.67 2.67 0 0 0 5.16 1.38Zm-4.42 3.6-.18.05h-.03a4.3 4.3 0 0 0-1.41.69 2.3 2.3 0 0 0-.95 1.6c-.04.33-.03 1.06-.02 1.46.02.73.61 1.58 1.33 1.58H4.3a4.58 4.58 0 0 1-.3-1.51V17c-.01-.74-.02-1 .03-1.6 0-.05 0-.1.02-.15a4.48 4.48 0 0 1 .7-1.85 7.22 7.22 0 0 0-2.16.22Zm9.4.88c-1.21 0-2.22.2-2.92.4-.37.12-.68.23-.91.38-.23.13-.3.25-.34.34a.7.7 0 0 0-.03.14s0-.01 0 0L7.79 17h8.42v-1.24c-.01-.01 0 .01 0 0a.7.7 0 0 0-.04-.14c-.03-.09-.11-.2-.34-.34a3.84 3.84 0 0 0-.91-.37c-.7-.2-1.7-.41-2.92-.41ZM12 6a1.55 1.55 0 1 0 0 3.11c.86 0 1.56-.7 1.56-1.55C13.56 6.7 12.86 6 12 6Z" clipRule="evenodd"></path>
                                        </svg>
                                    }
                                    
                                </div>
                                <span className="comunidades-acoes__texto">
                                    {comunidade.nome_comunidade}
                                </span>
                            </div>
                        </section>
                    ))
                }

                {comunidadeSeguindo.length > 0 && (
                    <header className="comunidade-acoes-header">
                        <span>Seguindo</span>
                    </header>
                )}

                {comunidadeSeguindo.map((comunidade) => (
                    <section
                        className="comunidades-acoes"
                        key={comunidade.id}
                    >
                        <div
                            role="button"
                            tabIndex={0}
                            className="comunidades-acoes__nova comunidades-acoes__nova-nao_participa"
                            onClick={() => aoAbrir(comunidade)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    aoAbrir(comunidade);
                                }
                            }}
                            aria-pressed={comunidadeSelecionada?.id === comunidade.id}
                        >
                            <div className="comunidade-acoes_icone_texto">
                                <div
                                    className="comunidades-acoes__icone"
                                    aria-hidden="true"
                                >
                                    {comunidade.imagem_comunidade !== null
                                        ? <img
                                            className="comunidades-acoes__imagem"
                                            src={obterUrlImagemComunidade(comunidade.imagem_comunidade)}
                                            alt=""
                                        />
                                        : <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                                            <path fill="currentColor" strokeWidth="0.3" paintOrder="fill stroke" fillRule="evenodd" d="M6.37 18.67a1.81 1.81 0 0 1-.58-1.24c-.01-.5-.03-1.5.03-1.94a2.7 2.7 0 0 1 .4-1.1 2.84 2.84 0 0 1 .9-.82c.46-.28.98-.46 1.4-.58A12.2 12.2 0 0 1 12 12.5a12.69 12.69 0 0 1 3.47.49 5.76 5.76 0 0 1 1.52.65c.28.19.56.44.78.76a2.41 2.41 0 0 1 .41 1.1c.06.43.04 1.43.03 1.93a1.9 1.9 0 0 1-.58 1.24c-.22.2-.48.33-.75.33H7.12c-.27 0-.53-.13-.75-.33Zm13.6-3.27c.04.6.03.86.02 1.6v.49a4.58 4.58 0 0 1-.3 1.51h2.97c.72 0 1.31-1.85 1.33-2.58.01-.4.02-.13-.02-.46a2.34 2.34 0 0 0-.95-1.6 4.27 4.27 0 0 0-1.41-.68h-.02v-.01a7.72 7.72 0 0 0-2.35-.27 4.18 4.18 0 0 1 .72 2Zm-2.04-3.95a2.65 2.65 0 0 0 3.16.06 2.67 2.67 0 1 0-3.16-.06ZM14.9 9.62A3.54 3.54 0 0 0 15.5 7a3.56 3.56 0 1 0-.61 2.62Zm-7.88.4a2.67 2.67 0 1 0-5.16-1.38 2.67 2.67 0 0 0 5.16 1.38Zm-4.42 3.6-.18.05h-.03a4.3 4.3 0 0 0-1.41.69 2.3 2.3 0 0 0-.95 1.6c-.04.33-.03 1.06-.02 1.46.02.73.61 1.58 1.33 1.58H4.3a4.58 4.58 0 0 1-.3-1.51V17c-.01-.74-.02-1 .03-1.6 0-.05 0-.1.02-.15a4.48 4.48 0 0 1 .7-1.85 7.22 7.22 0 0 0-2.16.22Zm9.4.88c-1.21 0-2.22.2-2.92.4-.37.12-.68.23-.91.38-.23.13-.3.25-.34.34a.7.7 0 0 0-.03.14s0-.01 0 0L7.79 17h8.42v-1.24c-.01-.01 0 .01 0 0a.7.7 0 0 0-.04-.14c-.03-.09-.11-.2-.34-.34a3.84 3.84 0 0 0-.91-.37c-.7-.2-1.7-.41-2.92-.41ZM12 6a1.55 1.55 0 1 0 0 3.11c.86 0 1.56-.7 1.56-1.55C13.56 6.7 12.86 6 12 6Z" clipRule="evenodd"></path>
                                        </svg>
                                    }
                                </div>
                                <span className="comunidades-acoes__texto">
                                    {comunidade.nome_comunidade}
                                </span>
                            </div>
                        </div>
                    </section>
                ))}

                    {ComunidadesComMaisPessoas.length > 0 
                    ?   (
                            <header className="comunidade-acoes-header">
                                <span>Encontrar comunidades para participar</span>
                            </header>
                        )
                    : ('')
                    }

                    {ComunidadesComMaisPessoas
                        .map((comunidade) => (
                            <section
                                className="comunidades-acoes"
                                key={comunidade.id}
                            >
                                <div
                                    role="button"
                                    tabIndex={0}
                                    className="comunidades-acoes__nova comunidades-acoes__nova-nao_participa"
                                    onClick={() => aoAbrir(comunidade)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            aoAbrir(comunidade);
                                        }
                                    }}
                                    aria-pressed={comunidadeSelecionada?.id === comunidade.id}
                                >
                                    <div className="comunidade-acoes_icone_texto">
                                        <div
                                            className="comunidades-acoes__icone"
                                            aria-hidden="true"
                                        >
                                            {comunidade.imagem_comunidade !== null
                                                ? <img
                                                    className="comunidades-acoes__imagem"
                                                    src={obterUrlImagemComunidade(comunidade.imagem_comunidade)}
                                                    alt=""
                                                />
                                                : <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                                                    <path fill="currentColor" strokeWidth="0.3" paintOrder="fill stroke" fillRule="evenodd" d="M6.37 18.67a1.81 1.81 0 0 1-.58-1.24c-.01-.5-.03-1.5.03-1.94a2.7 2.7 0 0 1 .4-1.1 2.84 2.84 0 0 1 .9-.82c.46-.28.98-.46 1.4-.58A12.2 12.2 0 0 1 12 12.5a12.69 12.69 0 0 1 3.47.49 5.76 5.76 0 0 1 1.52.65c.28.19.56.44.78.76a2.41 2.41 0 0 1 .41 1.1c.06.43.04 1.43.03 1.93a1.9 1.9 0 0 1-.58 1.24c-.22.2-.48.33-.75.33H7.12c-.27 0-.53-.13-.75-.33Zm13.6-3.27c.04.6.03.86.02 1.6v.49a4.58 4.58 0 0 1-.3 1.51h2.97c.72 0 1.31-1.85 1.33-2.58.01-.4.02-.13-.02-.46a2.34 2.34 0 0 0-.95-1.6 4.27 4.27 0 0 0-1.41-.68h-.02v-.01a7.72 7.72 0 0 0-2.35-.27 4.18 4.18 0 0 1 .72 2Zm-2.04-3.95a2.65 2.65 0 0 0 3.16.06 2.67 2.67 0 1 0-3.16-.06ZM14.9 9.62A3.54 3.54 0 0 0 15.5 7a3.56 3.56 0 1 0-.61 2.62Zm-7.88.4a2.67 2.67 0 1 0-5.16-1.38 2.67 2.67 0 0 0 5.16 1.38Zm-4.42 3.6-.18.05h-.03a4.3 4.3 0 0 0-1.41.69 2.3 2.3 0 0 0-.95 1.6c-.04.33-.03 1.06-.02 1.46.02.73.61 1.58 1.33 1.58H4.3a4.58 4.58 0 0 1-.3-1.51V17c-.01-.74-.02-1 .03-1.6 0-.05 0-.1.02-.15a4.48 4.48 0 0 1 .7-1.85 7.22 7.22 0 0 0-2.16.22Zm9.4.88c-1.21 0-2.22.2-2.92.4-.37.12-.68.23-.91.38-.23.13-.3.25-.34.34a.7.7 0 0 0-.03.14s0-.01 0 0L7.79 17h8.42v-1.24c-.01-.01 0 .01 0 0a.7.7 0 0 0-.04-.14c-.03-.09-.11-.2-.34-.34a3.84 3.84 0 0 0-.91-.37c-.7-.2-1.7-.41-2.92-.41ZM12 6a1.55 1.55 0 1 0 0 3.11c.86 0 1.56-.7 1.56-1.55C13.56 6.7 12.86 6 12 6Z" clipRule="evenodd"></path>
                                                </svg>
                                            }
                    
                                        </div>
                                        <span className="comunidades-acoes__texto">
                                            {comunidade.nome_comunidade}
                                        </span>
                                    </div>
                                </div>
                            </section>
                        ))
                    }

                    {ComunidadesComMaisPessoas.length > 0
                        ?(
                            <div className="descobrir_mais">
                                <button 
                                    type="button"
                                    className="btn_descobrir_mais"
                                    onClick={() => setAbrirModalDescobrirMais(true)}
                                >
                                    <div className="descobrir_mais-icon">
                                        <svg width="16" height="16" fill="currentColor" className="bi bi-grid" viewBox="0 0 16 16">
                                            <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5zM2.5 2a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5zm6.5.5A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5zM1 10.5A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5zm6.5.5A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5z"/>
                                        </svg>
                                    </div>
                                    <div className="descobrir_mais-text">
                                        <span>Descobrir mais</span>
                                    </div>
                                </button>
                            </div>
                        )
                        :('')
                    }

            </main>

            <ModalFeedback
                aberto={feedback.aberto}
                tipo={feedback.tipo}
                mensagem={feedback.mensagem}
                aoFechar={() =>
                    setFeedback((estadoAtual) => ({
                        ...estadoAtual,
                        aberto: false,
                    }))
                }
            />

            {abrirModalDescobrirMais && (
                <ModalDescobrirComunidades
                    comunidades={comunidadesParaDescobrir}
                    comunidadesSemFiltro={comunidades}
                    aoAbrir={aoAbrir}
                    aoFechar={() => setAbrirModalDescobrirMais(false)}
                    funcaoCriarComunidade={() => {
                        setNovaComunidade(true), 
                        setAbrirModalDescobrirMais(false)
                    }}
                />
            )}

        </>
    );
}

export default Comunidades;
