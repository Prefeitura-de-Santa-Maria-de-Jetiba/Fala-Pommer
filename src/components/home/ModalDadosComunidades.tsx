import { useState, useRef, type ReactNode, type RefObject } from "react";
import type { Comunidade } from "./Comunidades";
import type { ConversaComunidade } from "../../pages/home";
import { apiFetch } from "../../services/api";
import { ModalFeedback } from "../ModalFeedback";
import { useLayoutEffect, useEffect } from "react";
import { ModalConfirmacao } from "../ModalConfirmacao";

type TipoUsuario = "user" | "admin" | "funcionario" | "superAdmin";

interface UsuarioBasico {
    id: number;
    nome: string;
    foto_perfil_url: string | null;
}

interface UsuarioConversa extends UsuarioBasico {
    tipoUsuario: TipoUsuario;
}

interface ResultadoAdicionarMembros {
    participantes: ConversaComunidade["participantes"];
    totalParticipantes: number;
}

interface ModalDadosComunidadeProps {
    aberto: boolean;
    comunidade: Comunidade | null;
    conversaSelecionada: ConversaComunidade | null;
    usuario: { sub: number } | null;
    aoFechar: () => void;
    botaoFecharRef: RefObject<HTMLButtonElement | null>;
    renderizarAvatar: (
        nome: string,
        imagem: string | null,
        comunidade?: boolean,
    ) => ReactNode;
    aoAdicionarMembros: (
        comunidadeId: number,
        resultado: ResultadoAdicionarMembros,
    ) => void;
}

export interface FuncaoDosMembrosComunidade {
    id: number,
    comunidade_id: number,
    usuario_id: number,
    tipo_funcao: string,
    promovido_em: string
}

function ModalDadosComunidades({
    aberto,
    comunidade,
    conversaSelecionada,
    usuario,
    aoFechar,
    botaoFecharRef,
    renderizarAvatar,
    aoAdicionarMembros
}: ModalDadosComunidadeProps) {
    {/*retorna um elemento html*/}
    const [iconChangeMessage, setIconChangeMessage] = useState<React.JSX.Element | null>(null);
    const [feedback, setFeedback] = useState({
        aberto: false,
        tipo: "erro" as "erro" | "sucesso",
        mensagem: "",
    });
    const [alterarDescricaoComunidade, setAlterarDescricaoComunidade] = useState(comunidade?.descricao_comunidade ?? "");
    const [alterarNomeComunidade, setAlterarNomeComunidade] = useState(comunidade?.nome_comunidade ?? "");
    const descricaoRef = useRef<HTMLTextAreaElement>(null);
    const nomeRef = useRef<HTMLInputElement>(null);
    const [isDisabledDescription, setIsDisabledDescription] = useState<boolean>(true);
    const [isDisabledName, setIsDisabledName] = useState<boolean>(true);
    const [detectarHandlerCliqueNome, setDetectarHandlerCliqueNome] = useState(false);
    const [detectarHandlerCliqueDescricao, setDetectarHandlerCliqueDescricao] = useState(false);
    const [adicionarNovaClass, setAdicionarNovaClass] = useState(false);
    const [abrirModalAdicionarMembro, setAbrirModalAdicionarMembro] = useState(false);
    const [novaFotoComunidade, setNovaFotoComunidade] = useState<File | null>(null);
    const [fotoPreview, setFotoPreview] = useState<string | null>(null);
    const [contatosDisponiveisModalAdicionarPessoas,
        setContatosDisponiveisModalAdicionarPessoas] = useState<UsuarioConversa[]>([]);
    const [buscaPessoaComunidade, setBuscaPessoaComunidade] = useState("");
    const botaoFecharModalAdicionarMembroRef =
            useRef<HTMLButtonElement>(null);
    const [contatosModalAdicionarPessoasSelecionados,
            setContatosModalAdicionarPessoasSelecionados] =
            useState<Set<number>>(new Set());
    const menuComunidadeRef = useRef<HTMLDetailsElement>(null);
    const [modalSairComunidadeAberto, setModalSairComunidadeAberto] = useState(false)
    const [versaoMembros, setVersaoMembros] = useState(0);
    const [saindoDaComunidade, setSaindoDaComunidade] = useState(false);
    const [usuarioParaRemover, setUsuarioParaRemover] = useState<{
        id: number;
        nome: string;
    } | null>(null);
    const [adicionandoPessoasComunidade, setAdicionandoPessoasComunidade] = useState(false);
    const [usuarioMenuAbertoId, setUsuarioMenuAbertoId] = useState<number | null>(null);
    const [buscarUsuariosComunidade, setBuscarUsuariosComunidade] = useState("");
    const [buscarFuncoesDosUsuariosNaComunidade, setBuscarFuncoesDosUsuariosNaComunidade] = 
        useState<FuncaoDosMembrosComunidade[]>([])
    const buscaRef = useRef<HTMLInputElement>(null);

    function alternarPesquisa() {
        if (adicionarNovaClass) {
            setBuscarUsuariosComunidade("");
        } else {
            // o input está com display:none; espera o React renderizar antes de focar
            setTimeout(() => buscaRef.current?.focus(), 0);
        }
        setAdicionarNovaClass((adicionar) => !adicionar);
    }

    //função de ativação do textarea para alteração da descrição
    const handleCliqueDescricao = () => {
        // Ativa o input mudando o estado
        setIsDisabledDescription(false);
        setDetectarHandlerCliqueDescricao(true);

        // Coloca o cursor no input. Usa o setTimeout para garantir
        // que o React já renderizou o input como habilitado antes do foco.
        setTimeout(() => {
        descricaoRef.current?.focus();
        }, 0);
    };

    const handlerCliqueNome = () => {
        setIsDisabledName(false);
        setDetectarHandlerCliqueNome(true)

        setTimeout(() => {
            nomeRef.current?.focus();
        }, 0);
    };

    useEffect(() => {
        if (!novaFotoComunidade) {
            setFotoPreview(null);
            return;
        }

        const urlPreview = URL.createObjectURL(novaFotoComunidade);
        setFotoPreview(urlPreview);

        return () => URL.revokeObjectURL(urlPreview);
    }, [novaFotoComunidade]);

    useLayoutEffect(() => {
        const campoDescricao = descricaoRef.current;

        if (!campoDescricao) return;

        campoDescricao.style.height = "auto";
        campoDescricao.style.height = `${campoDescricao.scrollHeight}px`;
    }, [alterarDescricaoComunidade]);

    useLayoutEffect(() => {
        if (aberto && comunidade) {
            setAlterarDescricaoComunidade(comunidade.descricao_comunidade ?? "");
            setAlterarNomeComunidade(comunidade?.nome_comunidade ?? "");
            setBuscarUsuariosComunidade("");
            setAdicionarNovaClass(false);
            setUsuarioMenuAbertoId(null);
        }
    }, [aberto, comunidade]);

    useEffect( () => {
        if (!aberto || !comunidade) return

        const comunidadeId = comunidade.id

        async function buscarFuncaoUsuarioComunidade() {
            try {
                const resposta = await apiFetch(`/comunidades/${comunidadeId}/funcaoComunidade`)

                if (!resposta.ok) {
                    throw new Error("Não foi possivel buscar a função de cada usuário")
                }

                const dados: FuncaoDosMembrosComunidade[] = await resposta.json();
                setBuscarFuncoesDosUsuariosNaComunidade(dados);

            } catch (erro) {
                setFeedback({
                    aberto: true,
                    tipo: "erro",
                    mensagem: `${erro}`
                })
            }
        }

        buscarFuncaoUsuarioComunidade();
    }, [aberto, comunidade?.id, versaoMembros])

    if (!aberto || !comunidade || !conversaSelecionada) {
        return null;
    }

    const svgPen = <svg width="16" height="16" fill="currentColor" className="bi bi-pen" viewBox="0 0 16 16">
        <path d="m13.498.795.149-.149a1.207 1.207 0 1 1 1.707 1.708l-.149.148a1.5 1.5 0 0 1-.059 2.059L4.854 14.854a.5.5 0 0 1-.233.131l-4 1a.5.5 0 0 1-.606-.606l1-4a.5.5 0 0 1 .131-.232l9.642-9.642a.5.5 0 0 0-.642.056L6.854 4.854a.5.5 0 1 1-.708-.708L9.44.854A1.5 1.5 0 0 1 11.5.796a1.5 1.5 0 0 1 1.998-.001m-.644.766a.5.5 0 0 0-.707 0L1.95 11.756l-.764 3.057 3.057-.764L14.44 3.854a.5.5 0 0 0 0-.708z"/>
    </svg>

    const svgImage = <svg width="16" height="16" fill="currentColor" className="bi bi-card-image" viewBox="0 0 16 16">
        <path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0"/>
        <path d="M1.5 2A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2zm13 1a.5.5 0 0 1 .5.5v6l-3.775-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12v.54L1 12.5v-9a.5.5 0 0 1 .5-.5z"/>
    </svg>

    const svgCheck = <svg width="16" height="16" fill="currentColor" className="bi bi-check-lg" viewBox="0 0 16 16">
        <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425z"/>
    </svg>

    const dataFormatada = new Date(comunidade.comunidade_criada_em).toLocaleDateString('pt-br');

    function IconChangeMessage() {
        return (
            <div>
                <span>Alterar a foto da comunidade</span>
                {svgImage}
            </div>
        )
    };

    function normalizarTexto(texto: string) {
        return texto
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
    }

    const termoBusca = normalizarTexto(buscarUsuariosComunidade);

    const participantesOrdenados = [...conversaSelecionada.participantes].sort(
        (primeiro, segundo) => {
            if (primeiro.id === usuario?.sub) return -1;
            if (segundo.id === usuario?.sub) return 1;
            return primeiro.nome.localeCompare(segundo.nome, "pt-BR");
        },
    );

    const participantesFiltrados = termoBusca
        ? participantesOrdenados.filter((participante) =>
            normalizarTexto(participante.nome).includes(termoBusca),
        )
        : participantesOrdenados;

    async function gerarConvite(comunidadeId: number) {
        try {
            const resposta = await apiFetch(
                `/comunidades/${comunidadeId}/convite`,
                {
                    method: 'POST',
                    headers: {
                    'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                },
            );

            if (!resposta.ok) {
            throw new Error('Erro ao gerar convite');
            }

            const dados = await resposta.json();

            await navigator.clipboard.writeText(dados.link);

            setFeedback({
                aberto: true,
                tipo: "sucesso",
                mensagem: "Convite copiado para a área de transferência.",
            });
        } catch (erro) {
            setFeedback({
                aberto: true,
                tipo: "erro",
                mensagem: `Erro: ${erro}`
            });
        }
    }

    //atualização dos dados das comunidades
    async function enviarNomeDescricaoAlteradoComunidade() {
        if (!comunidade) return;

        try {
            const resposta = await apiFetch(`/comunidades/${comunidade.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    nome_comunidade: nomeRef.current?.value.trim() ?? "",
                    descricao_comunidade: alterarDescricaoComunidade,
                }),
            });

            if (!resposta.ok) {
                throw new Error("Não foi possivel atualizar a comunidade.")
            }

            setFeedback({
                aberto: true,
                tipo: "sucesso",
                mensagem: `Alteração feita com sucesso!`
            });

            setDetectarHandlerCliqueDescricao(false);
            setDetectarHandlerCliqueNome(false);
            setIsDisabledDescription(true);
            setIsDisabledName(true);

        } catch (erro) {
            setFeedback({
                aberto: true,
                tipo: "erro",
                mensagem: `${erro}`
            })
        }
    }

    async function contatosModalAdicionarContatoComunidade() {
        if (!usuario || conversaSelecionada?.tipo !== "comunidade") return

        setBuscaPessoaComunidade("");
        setContatosDisponiveisModalAdicionarPessoas([]);
        setContatosModalAdicionarPessoasSelecionados(new Set());
        setAdicionandoPessoasComunidade(false);

        try {
            const resposta = await apiFetch("usuarios/comunidades/contatos");
        
            if (!resposta.ok) {
                throw new Error("Não foi possível carregar os contatos.");
            }

            const contatos = await resposta.json() as UsuarioConversa[];
            setContatosDisponiveisModalAdicionarPessoas(contatos);

        } catch (erro) {
            setFeedback({
                aberto: true,
                tipo: "erro",
                mensagem: `${erro}`
            })
        }
    }

    async function atualizarImagemComunidade(comunidadeId: number) {
        if (!comunidade || !novaFotoComunidade) return

        try {
            const formData = new FormData();
            formData.append("imagem_comunidade", novaFotoComunidade);

            const resposta = await apiFetch(`/comunidades/${comunidadeId}`, {
                method: "PATCH",
                body: formData
            });

            if (!resposta.ok) {
                throw new Error("Não foi possivel atualizar a foto da comunidade.")
            }

            setFeedback({
                aberto: true,
                tipo: "sucesso",
                mensagem: "Foto alterada com sucesso!"
            });
        } catch (erro) {
            setFeedback({
                aberto: true,
                tipo: "erro",
                mensagem: `${erro}`
            });
        }
    }

    function alternarContatoModalAdicionarPessoas(contatoId: number) {
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

    async function adicionarPessoasAComunidade(comunidadeId: number) {
            if (
                conversaSelecionada?.tipo !== "comunidade" ||
                contatosModalAdicionarPessoasSelecionados.size < 1 ||
                adicionandoPessoasComunidade
            ) {
                return;
            }

            setAdicionandoPessoasComunidade(true);
            
            try {

                const resposta = await apiFetch(`/comunidades/${comunidadeId}/adicionarComunidade`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        usuarioIds: Array.from(
                            contatosModalAdicionarPessoasSelecionados,
                        ),
                    })
                });

                if (!resposta.ok) {
                    const erroApi = await resposta.json().catch(() => null);
                    throw new Error(erroApi?.message ?? "Não foi possível adicionar as pessoas.");
                }

                const resultado: ResultadoAdicionarMembros = await resposta.json();

                aoAdicionarMembros(comunidadeId, resultado);
                setVersaoMembros((v) => v + 1);
                setAbrirModalAdicionarMembro(false);
                setContatosModalAdicionarPessoasSelecionados(new Set());

                setFeedback({
                    aberto: true,
                    tipo: "sucesso",
                    mensagem: "Usuário adicionado com sucesso!"
                })

            } catch (erro) {
                setFeedback({
                    aberto: true,
                    tipo: "erro",
                    mensagem: `${erro}`
                })
            } finally {
                setAdicionandoPessoasComunidade(false);
            }
        }

    const minhaFuncao = buscarFuncoesDosUsuariosNaComunidade.find(
        (funcao) => funcao.usuario_id === usuario?.sub,
    )?.tipo_funcao;

    const eAdmin = minhaFuncao === "admin";
    const eMembro = minhaFuncao === "membro";

    const contatosDisponiveisParaComunidade =
        contatosDisponiveisModalAdicionarPessoas.filter((contato) => {
            if (
                conversaSelecionada?.tipo !== "comunidade" ||
                conversaSelecionada.participantes.some(
                    (participante) => participante.id === contato.id,
                )
            ) {
                return false;
            }

            const busca = buscaPessoaComunidade.trim().toLowerCase();
            const descricao = `${contato.nome} ${contato.tipoUsuario}`;

            return descricao.toLowerCase().includes(busca);
        });

    function abrirModalDeAdicionarMembroComunidade() {
        setAbrirModalAdicionarMembro(true)

        if (menuComunidadeRef.current) {
            menuComunidadeRef.current.open = false;
        }
        void contatosModalAdicionarContatoComunidade();
    }

    async function setModalConfirmarSaida(comunidadeId: number, conversaId: number) {
        
        if (conversaSelecionada?.tipo !== "comunidade" || saindoDaComunidade)  return;

        setSaindoDaComunidade(true);

        try {

            const resposta = await apiFetch(`/comunidades/${conversaId}/${comunidadeId}/sair`,
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
                throw new Error(mensagemDoBackend || "Não foi possível sair da comunidade.");
            }

            setModalSairComunidadeAberto(false);

            setFeedback({
                aberto: true,
                tipo: "sucesso",
                mensagem:
                    eAdmin
                        ? "Você saiu da comunidade. E não será mais administrador da comunidade."
                        : "Você saiu da comunidade e não possui mais acesso a ela.",
            });

        } catch (erro) {
            setFeedback({
                aberto: true,
                tipo: "erro",
                mensagem: `${erro}`
            })
        } finally {
            setSaindoDaComunidade(false);
        }
    }

    async function setModalConfirmarRemocao(
        comunidadeId: number, conversaId: number, id: number
    ) {
        if (conversaSelecionada?.tipo !== "comunidade")  return;

        try {
            const resposta = await apiFetch(
                `/comunidades/${conversaId}/${comunidadeId}/${id}/remover`,
                { method: "DELETE" }
            );

            if (!resposta.ok) {
                throw new Error(
                    "Não foi possível remover este usuário da comunidade",
                );
            }

            setFeedback({
                aberto: true,
                tipo: "sucesso",
                mensagem: "Usuário removido da comunidade com sucesso!"
            });
        } catch (erro) {
            setFeedback({
                aberto: true,
                tipo: "erro",
                mensagem: `${erro}`
            })
        }
    }

    async function promoverMembro(id: number, comunidadeId: number) {
        try {
            const resposta = await apiFetch(`/comunidades/${id}/${comunidadeId}/promover`, 
                { method: "POST" },
            );

            if (!resposta.ok) {
                throw new Error(
                    "Não foi possível promover usuário",
                );
            }

            setFeedback({
                aberto: true,
                tipo: "sucesso",
                mensagem:
                    "Usuário promovido com sucesso!"
            });

        } catch (erro) {
            setFeedback({
                aberto: true,
                tipo: "erro",
                mensagem: `${erro}`
            });
        };
    }

    async function rebaixarAdmin(id: number, comunidadeId: number) {
        try {
            const resposta = await apiFetch(`/comunidades/${id}/${comunidadeId}/rebaixar`, 
                { method: "POST" },
            );

            if (!resposta.ok) {
                throw new Error(
                    "Não foi possível rebaixar usuário",
                );
            }

            setFeedback({
                aberto: true,
                tipo: "sucesso",
                mensagem:
                    "Usuário rebaixado com sucesso!"
            });

        } catch (erro) {
            setFeedback({
                aberto: true,
                tipo: "erro",
                mensagem: `${erro}`
            });
        };
    }

    return (
        <>
            <div 
                className="modal-dados__fundo" 
                onClick={(evento) => {
                    if (evento.target === evento.currentTarget) aoFechar();
                }} 
                data-lenis-prevent
            >
                <section
                    className="modal-dados modal-dados-comunidade"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="modal-dados-comunidade-titulo"
                    onClick={(evento) => evento.stopPropagation()}
                >
                    <header className="modal-dados__cabecalho">
                        <h2 id="modal-dados-comunidade-titulo">Dados da comunidade</h2>
                        <button
                            ref={botaoFecharRef}
                            type="button"
                            aria-label="Fechar"
                            onClick={aoFechar}
                        >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="m6 6 12 12M18 6 6 18" />
                            </svg>
                        </button>
                    </header>

                    <div className="modal-dados__conteudo">
                        <section className="dados-comunidade__informacoes">
                            <div className="dados-comunidade__avatar-container">
                                <div className="dados-comunidade__avatar">
                                    <div
                                        className={
                                            `dados-comunidade__avatar-comunidade
                                            ${fotoPreview
                                                ? " dados-comunidade__avatar-comunidade--com-foto"
                                                : ""}`
                                        }
                                        title="Alterar imagem"
                                        onMouseEnter={() => setIconChangeMessage(IconChangeMessage())}
                                        onMouseLeave={() => setIconChangeMessage(null)}
                                    >
                                        {!fotoPreview && renderizarAvatar(
                                            comunidade.nome_comunidade,
                                            comunidade.imagem_comunidade,
                                            true,
                                        )}
                                        {eAdmin && (
                                            <>
                                                <input
                                                    type="file"
                                                    name="nova-foto__comunidade"
                                                    id="nova-foto__comunidade"
                                                    accept="image/jpeg,image/png,image/webp"
                                                    hidden
                                                    onChange={(evento) => {
                                                        setNovaFotoComunidade(evento.target.files?.[0] ?? null);
                                                        evento.target.value = "";
                                                    }}
                                                />
                                                <label
                                                    className="nova__imagem-preview"
                                                    htmlFor="nova-foto__comunidade"
                                                    title="Selecionar imagem"
                                                >
                                                    {fotoPreview && (
                                                        <img
                                                            className="nova-comunidade__imagem-selecionada"
                                                            src={fotoPreview}
                                                            alt="Prévia da imagem da comunidade"
                                                        />
                                                    )}
                                                </label>
                                            </>
                                        )}

                                        {eAdmin && iconChangeMessage && (
                                            <div className="dados-comunidade_avatar-messagem">
                                                {iconChangeMessage}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/*Adiciona o botão de salvar imagem ao colocar nova imagem*/}
                                {eAdmin && fotoPreview && (
                                    <button
                                        className="dados-comunidade__salvar-avatar-comunidade"
                                        type="button"
                                        title="Salvar imagem"
                                        onClick={() => atualizarImagemComunidade(comunidade.id)}
                                    >
                                        {svgCheck}
                                    </button>
                                )}
                            </div>

                            <div className={`
                                dados-comunidade__identificacao
                                ${eMembro ? 'dados-comunidade__identificacao-membro' : ''}
                            `}>
                                <input 
                                    type="text" 
                                    name="nome_comunidade" 
                                    id="nome_comunidade" 
                                    className={`
                                        dados-comunidade__nome 
                                        ${eMembro ? 'dados-comunidade__nome--membro' : ''}
                                    `}
                                    ref={nomeRef}
                                    value={alterarNomeComunidade}
                                    onChange={(evento) => setAlterarNomeComunidade(evento.target.value)}
                                    disabled={isDisabledName}
                                    placeholder="Adicione um novo nome para a comunidade"
                                    maxLength={150}
                                    required
                                    autoComplete="off"
                                />

                                {eAdmin && (
                                    detectarHandlerCliqueNome === true 
                                        ? <button
                                            className="dados-comunidade_alter-nome"
                                            type="button"
                                            title="Confirmar alteração"
                                            onClick={enviarNomeDescricaoAlteradoComunidade}
                                        >
                                            {svgCheck}
                                        </button>

                                        : <button
                                            className="dados-comunidade_alter-nome"
                                            type="button"
                                            title="Editar nome da comunidade"
                                            onClick={handlerCliqueNome}
                                        >
                                            {svgPen}
                                        </button>
                                )}
                            </div>

                            <div className="dados-comunidade__resumo">
                                <p className="dados-comunidade__participantes">
                                    Comunidade <span className="dados-comunidade__separador">·</span>{" "}
                                    {comunidade.totalParticipantes}{" "}
                                    {comunidade.totalParticipantes === 1 ? "membro" : "membros"}
                                </p>
                            </div>

                            <div className="dados-comunidade__acoes">
                                <div className="dados-comunidade__acao">
                                    <button 
                                        className={`
                                            dados-comunidade__acao-botao
                                            ${eMembro 
                                                ? 'dados-comunidade__acao-botao-membro' 
                                                : ''
                                            }
                                        `}
                                        id="convidar"
                                        type="button"
                                        title="Convidar usando link"
                                        onClick={() => gerarConvite(comunidade.id)}
                                    >
                                        <svg width="16" height="16" fill="currentColor" className="dados-comunidade__acao-icone bi bi-link" viewBox="0 0 16 16">
                                            <path d="M6.354 5.5H4a3 3 0 0 0 0 6h3a3 3 0 0 0 2.83-4H9q-.13 0-.25.031A2 2 0 0 1 7 10.5H4a2 2 0 1 1 0-4h1.535c.218-.376.495-.714.82-1z"/>
                                            <path d="M9 5.5a3 3 0 0 0-2.83 4h1.098A2 2 0 0 1 9 6.5h3a2 2 0 1 1 0 4h-1.535a4 4 0 0 1-.82 1H12a3 3 0 1 0 0-6z"/>
                                        </svg>
                                    </button>
                                    <label 
                                        htmlFor="convidar"
                                        className="dados-comunidade__acao-texto"
                                    >
                                        Convidar
                                    </label>
                                </div>

                                {eAdmin && (
                                    <div className="dados-comunidade__acao">
                                        <button 
                                            className="dados-comunidade__acao-botao"
                                            id="adicionar_membro"
                                            type="button"
                                            title="Adicionar membro"
                                            onClick={() => abrirModalDeAdicionarMembroComunidade()}
                                        >
                                            <svg width="16" height="16" fill="currentColor" className="dados-comunidade__acao-icone bi bi-person-add" viewBox="0 0 16 16">
                                                <path d="M12.5 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7m.5-5v1h1a.5.5 0 0 1 0 1h-1v1a.5.5 0 0 1-1 0v-1h-1a.5.5 0 0 1 0-1h1v-1a.5.5 0 0 1 1 0m-2-6a3 3 0 1 1-6 0 3 3 0 0 1 6 0M8 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4"/>
                                                <path d="M8.256 14a4.5 4.5 0 0 1-.229-1.004H3c.001-.246.154-.986.832-1.664C4.484 10.68 5.711 10 8 10q.39 0 .74.025c.226-.341.496-.65.804-.918Q8.844 9.002 8 9c-5 0-6 3-6 4s1 1 1 1z"/>
                                            </svg>
                                        </button>
                                        <label 
                                            htmlFor="adicionar_membro" 
                                            className="dados-comunidade__acao-texto"
                                        >
                                            Adicionar membro
                                        </label>
                                    </div>
                                )}
                            </div>

                        </section>

                        <section className="dados-comunidade__descricao">
                            <div className="dados-comunidade__descricao-conteudo">
                                <div className="dados-comunidade__descricao-cabecalho">
                                    <strong className="dados-comunidade__descricao-titulo">Comunidade</strong>
                                </div>

                                <div className="dados-comunidade__descricao-texto">
                                    <textarea 
                                        name="descricao_comunidade" 
                                        id="descricao_comunidade" 
                                        ref={descricaoRef}
                                        className="dados-comunidade__descricao-mensagem"
                                        value={alterarDescricaoComunidade}
                                        onChange={(evento) => setAlterarDescricaoComunidade(evento.target.value)}
                                        disabled={isDisabledDescription}
                                        placeholder="Adicione uma nova descrição para a comunidade"
                                        rows={3}
                                        maxLength={400}
                                        required
                                    ></textarea>

                                    {eAdmin && (
                                        detectarHandlerCliqueDescricao
                                            ? <button
                                                className="dados-comunidade__descricao-editar"
                                                type="button"
                                                title="Confirmar alteração"
                                                onClick={enviarNomeDescricaoAlteradoComunidade}
                                            >
                                                {svgCheck}
                                            </button>
                                            : <button
                                                className="dados-comunidade__descricao-editar"
                                                type="button"
                                                title="Editar descrição da comunidade"
                                                onClick={handleCliqueDescricao}
                                            >
                                                {svgPen}
                                            </button>
                                    )}
                                </div>
                            </div>
                        </section>

                        <div className="dados-comunidade__membros">
                            <div className="dados-comunidade__membros-conteudo">
                                <div className="dados-comunidade__membros-cabecalho">
                                    <span className="dados-comunidade__membros-total">
                                        {comunidade.totalParticipantes}{" "}
                                        {comunidade.totalParticipantes === 1 ? "membro da comunidade" : "membros da comunidade"}
                                    </span>
                                    <div className={`dados-comunidade__membros-pesquisar
                                        ${adicionarNovaClass 
                                            ? " dados-comunidade__membros-pesquisar--ativo" : ""
                                        }`}
                                    >
                                        <input 
                                            type="search"
                                            className={!adicionarNovaClass  
                                                ?`dados-comunidade__membros-pesquisar-input`
                                                :`dados-comunidade__membros-pesquisar-input dados-comunidade__membros-pesquisar-input-ativo`
                                            } 
                                            ref={buscaRef}
                                            aria-label="Pesquisar usuários"
                                            autoComplete="off"
                                            placeholder="Pesquisar usuários"
                                            value={buscarUsuariosComunidade}
                                            onChange={(evento) => setBuscarUsuariosComunidade(evento.target.value)}
                                        />
                                        <button
                                            className={!adicionarNovaClass 
                                                ?`dados-comunidade__membros-pesquisar-botao` 
                                                :`dados-comunidade__membros-pesquisar-botao dados-comunidade__membros-pesquisar-botao--input-ativo`
                                            }
                                            onClick={alternarPesquisa}
                                            type="button"
                                            aria-label="Abrir pesquisa"
                                            aria-expanded={adicionarNovaClass}
                                        >
                                            <svg width="16" height="16" fill="currentColor" className="bi bi-search" viewBox="0 0 16 16">
                                                <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/>
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {eAdmin && (
                                    <button 
                                        className="dados-comunidade__membros-adicionar"
                                        type="button"
                                        title="Adicionar membro"
                                        onClick={() => abrirModalDeAdicionarMembroComunidade()}
                                    >
                                        <div className="dados-comunidade__membros-adicionar-icone">
                                            <svg width="16" height="16" fill="currentColor" className="bi bi-person-add" viewBox="0 0 16 16">
                                                <path d="M12.5 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7m.5-5v1h1a.5.5 0 0 1 0 1h-1v1a.5.5 0 0 1-1 0v-1h-1a.5.5 0 0 1 0-1h1v-1a.5.5 0 0 1 1 0m-2-6a3 3 0 1 1-6 0 3 3 0 0 1 6 0M8 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4"/>
                                                <path d="M8.256 14a4.5 4.5 0 0 1-.229-1.004H3c.001-.246.154-.986.832-1.664C4.484 10.68 5.711 10 8 10q.39 0 .74.025c.226-.341.496-.65.804-.918Q8.844 9.002 8 9c-5 0-6 3-6 4s1 1 1 1z"/>
                                            </svg>
                                        </div>
                                        <div className="dados-comunidade__membros-adicionar-texto">
                                            <span>Adicionar membro</span>
                                        </div>
                                    </button>
                                )}

                                {participantesFiltrados.length > 0 ? (
                                    <ul className="dados-comunidade__membros-lista" data-lenis-prevent>
                                        {participantesFiltrados.map((participante) => {
                                            
                                            const funcao = buscarFuncoesDosUsuariosNaComunidade.find((f) => f.usuario_id === participante.id,);

                                            const tipoFuncao = funcao?.tipo_funcao ?? "membro";

                                            const menuAberto = usuarioMenuAbertoId === participante.id;
                                            const podeGerenciar =
                                                eAdmin && participante.id !== usuario?.sub;

                                            return(
                                                <li 
                                                    key={participante.id} 
                                                    className={`dados-comunidade__membro ${
                                                        menuAberto ? "dados-comunidade__membro--aberto" : ""
                                                    }`}
                                                    onClick={() => {
                                                        if (!podeGerenciar) return;
                                                        setUsuarioMenuAbertoId((atual) =>
                                                            atual === participante.id ? null : participante.id,
                                                        );
                                                    }}
                                                >
                                                        <div className="dados-comunidade__membro-avatar">
                                                            {renderizarAvatar(
                                                                participante.nome,
                                                                participante.foto_perfil_url,
                                                            )}
                                                        </div>
                                                        <div className="dados-comunidade__membro-dados">
                                                            <div className="dados-comunidade__membro-cabecalho">
                                                                <strong>{participante.nome}</strong>
                                                                {participante.id === usuario?.sub && (
                                                                    <span className="dados-comunidade__membro-voce">
                                                                        Você
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {funcao && (
                                                            <span
                                                                className={`
                                                                    dados-comunidade__membro-funcao
                                                                    dados-comunidade__membro-funcao--${tipoFuncao}`
                                                                }
                                                            >
                                                                {funcao.tipo_funcao}
                                                            </span>
                                                        )}
                                                    
                                                    {eAdmin && menuAberto && (
                                                        <div 
                                                            className="opcoes-informacao__usuarios-comunidade"
                                                        >
                                                            {tipoFuncao !== "admin" 
                                                                ? <button
                                                                    type="button"
                                                                    className="opcao-informacao__usuario"
                                                                    onClick={() => promoverMembro(participante.id, comunidade.id)}
                                                                >
                                                                    <svg width="16" height="16" fill="currentColor" className="bi bi-person-lock" viewBox="0 0 16 16">
                                                                        <path d="M11 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0M8 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4m0 5.996V14H3s-1 0-1-1 1-4 6-4q.845.002 1.544.107a4.5 4.5 0 0 0-.803.918A11 11 0 0 0 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664zM9 13a1 1 0 0 1 1-1v-1a2 2 0 1 1 4 0v1a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1zm3-3a1 1 0 0 0-1 1v1h2v-1a1 1 0 0 0-1-1"/>
                                                                    </svg>
                                                                    <span>Promover a admin</span>
                                                                </button>
                                                                : <button
                                                                    type="button"
                                                                    className="opcao-informacao__usuario"
                                                                    onClick={() => rebaixarAdmin(participante.id, comunidade.id)}
                                                                >
                                                                    <svg width="16" height="16" fill="currentColor" className="bi bi-person" viewBox="0 0 16 16">
                                                                        <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10s-3.516.68-4.168 1.332c-.678.678-.83 1.418-.832 1.664z"/>
                                                                    </svg>
                                                                    <span>Rebaixar a membro</span>
                                                                </button>
                                                            
                                                            }
                                                            <button
                                                                type="button"
                                                                className="opcao-informacao__usuario remover__comunidade"
                                                                onClick={(evento) => {
                                                                    evento.stopPropagation();
                                                                    setUsuarioParaRemover({ id: participante.id, nome: participante.nome });
                                                                    }
                                                                }
                                                            >
                                                                <svg width="16" height="16" fill="currentColor" className="bi bi-x-circle" viewBox="0 0 16 16">
                                                                    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
                                                                    <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>
                                                                </svg>
                                                                <span>Remover da comunidade</span>
                                                            </button>
                                                        </div>
                                                    )}

                                                </li>
                                                
                                            );
                                        })}
                                    </ul>
                                ) : (
                                    <p className="dados-comunidade__membros-vazio">
                                        {termoBusca
                                            ? "Nenhum usuário encontrado."
                                            : "Esta comunidade não possui participantes."
                                        }
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="dados-comunidade__sair-container">
                            <button 
                                className="dados-comunidade__sair" 
                                type="button"
                                onClick={() => setModalSairComunidadeAberto(true)}
                            >
                                <div className="dados-comunidade__sair-icone">
                                    <svg width="16" height="16" fill="currentColor" className="bi bi-box-arrow-right" viewBox="0 0 16 16">
                                        <path fillRule="evenodd" d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0z"/>
                                        <path fillRule="evenodd" d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708z"/>
                                    </svg>
                                </div>
                                <div className="dados-comunidade__sair-texto">
                                    <span className="dados-comunidade__sair-rotulo">
                                        Sair da comunidade
                                    </span>
                                </div>
                            </button>
                        </div>

                        <footer className="dados-comunidade__rodape">
                            <span className="dados-comunidade__criacao">
                                Essa comunidade foi criada por {comunidade.criador_nome} no dia {dataFormatada}
                            </span>
                        </footer>
                    </div>

                </section>

                {eAdmin && abrirModalAdicionarMembro && (
                    <div
                        className="modal-adicionar-comunidade"
                        role="presentation"
                        onMouseDown={(evento) => {
                            if (evento.target === evento.currentTarget) {
                                setAbrirModalAdicionarMembro(false);
                            }
                        }}
                    >
                        <section
                            className="modal-comunidade__janela modal-comunidade__janela--adicionar-pessoa"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="modal-adicionar-pessoa-titulo"
                            aria-describedby="modal-adicionar-pessoa-descricao"
                        >
                            <header className="modal-comunidade__cabecalho">
                                <div className="modal-comunidade__titulo">
                                    <span className="modal-comunidade__icone" aria-hidden="true">
                                        <svg viewBox="0 0 24 24">
                                            <path d="M15 19c0-2.21-2.69-4-6-4s-6 1.79-6 4" />
                                            <circle cx="9" cy="8" r="4" />
                                            <path d="M18 8v6M15 11h6" />
                                        </svg>
                                    </span>

                                    <div>
                                        <span className="modal-comunidade__etapa">
                                            NOVO PARTICIPANTE
                                        </span>
                                        <h2 id="modal-adicionar-pessoa-titulo">
                                            Adicionar pessoa
                                        </h2>
                                        <p id="modal-adicionar-pessoa-descricao">
                                            Escolha quem você deseja adicionar na comunidade.
                                        </p>
                                    </div>
                                </div>

                                <button
                                    ref={botaoFecharModalAdicionarMembroRef}
                                    type="button"
                                    className="modal-comunidade__fechar"
                                    onClick={() => setAbrirModalAdicionarMembro(false)}
                                    aria-label="Fechar adição de pessoa"
                                >
                                    <svg viewBox="0 0 24 24" aria-hidden="true">
                                        <path d="M6 6l12 12M18 6 6 18" />
                                    </svg>
                                </button>
                            </header>

                            <div className="modal-comunidade__pesquisa">
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <circle cx="11" cy="11" r="7" />
                                    <path d="m16 16 4 4" />
                                </svg>
                                <input
                                    onChange={(evento) =>
                                        setBuscaPessoaComunidade(evento.target.value)
                                    }
                                    type="search"
                                    placeholder="Pesquisar pessoa"
                                    aria-label="Pesquisar pessoa para adicionar na comunidade"
                                    autoComplete="off"
                                />
                            </div>

                            <div className="modal-comunidade__rotulo-lista" data-lenis-prevent>
                                <span>PESSOAS DISPONÍVEIS</span>
                                    <span>{contatosDisponiveisParaComunidade.length}</span>
                            </div>

                            <div className="modal-comunidade__contatos">
                                {contatosDisponiveisParaComunidade.map((contato) => {
                                    const selecionado =
                                        contatosModalAdicionarPessoasSelecionados.has(
                                            contato.id,
                                        );

                                    return (
                                        <button
                                        key={contato.id}
                                        type="button"
                                        className={`modal-comunidade__contato ${
                                            selecionado
                                                ? "modal-comunidade__contato--selecionado"
                                                : ""
                                        }`}
                                        onClick={() =>
                                            alternarContatoModalAdicionarPessoas(
                                                contato.id,
                                            )
                                        }
                                        aria-pressed={selecionado}
                                        >
                                            <span className="modal-comunidade__avatar">
                                                {renderizarAvatar(
                                                    contato.nome,
                                                    contato.foto_perfil_url
                                                )}
                                            </span>

                                            <span className="modal-comunidade__dados">
                                                <strong>{contato.nome}</strong>
                                                {eAdmin && (
                                                    <span className={`modal-comunidade__perfil modal-comunidade__perfil--${contato.tipoUsuario}`}>
                                                        { contato.tipoUsuario === "superAdmin"
                                                            ? "Super Administrador"
                                                            : (contato.tipoUsuario === "admin"
                                                                ? "Administrador"
                                                                : (contato.tipoUsuario === "funcionario"
                                                                    ? "Funcionário"
                                                                    : "Usuário"
                                                                )
                                                            )
                                                        }
                                                    </span>
                                                )}
                                            </span>

                                            <span className="modal-comunidade__selecao">
                                                {selecionado && (
                                                    <svg viewBox="0 0 16 16">
                                                        <path d="m3 8 3 3 7-7" />
                                                    </svg>
                                                )}
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>

                            <footer className="modal-comunidade__rodape">
                                <div className="modal-comunidade__resumo">
                                    <span
                                        className={
                                            contatosModalAdicionarPessoasSelecionados.size > 0
                                                ? "modal-comunidade__contador modal-comunidade__contador--ativo"
                                                : "modal-comunidade__contador"
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
                                </div>
                                <button
                                    type="button"
                                    disabled={
                                        contatosModalAdicionarPessoasSelecionados.size < 1 ||
                                        adicionandoPessoasComunidade
                                    }
                                    onClick={() => void adicionarPessoasAComunidade(comunidade.id)}
                                >
                                    {adicionandoPessoasComunidade
                                        ? "Adicionando..."
                                        : "Adicionar ao grupo"}
                                </button>
                            </footer>

                        </section>
                    </div>
                )}

            </div>

            <ModalConfirmacao
                aberto={modalSairComunidadeAberto}
                titulo="Sair da Comunidade?"
                mensagem={
                    eAdmin
                        ? "Ao sair da comunidade, você deixará de ser administrador e não fará mais parte da comunidade. Tem certeza que deseja continuar?"
                        : "Ao sair, você não fará mais parte da comunidade nem verá as mensagens. Tem certeza que deseja continuar?"
                }
                carregando={saindoDaComunidade}
                textoConfirmar="Sair"
                textoCarregando="Saindo..."
                aoCancelar={() => setModalSairComunidadeAberto(false)}
                aoConfirmar={() => setModalConfirmarSaida(comunidade.id, conversaSelecionada.id)}
            />

            <ModalConfirmacao
                aberto={usuarioParaRemover !== null}
                titulo="Remover este usuário da comunidade?"
                mensagem={`Deseja realmente remover ${usuarioParaRemover?.nome ?? "este usuário"} da comunidade?`}
                textoConfirmar="Remover"
                textoCarregando="Removendo..."
                aoCancelar={() => setUsuarioParaRemover(null)}
                aoConfirmar={() => {
                    if (!usuarioParaRemover) return;
                    void setModalConfirmarRemocao(
                        comunidade.id,
                        conversaSelecionada.id,
                        usuarioParaRemover.id,
                    );
                }}
            />

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
        </>
    );
}

export default ModalDadosComunidades;
