// Permite consultar e gerenciar os usuários cadastrados.
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { obterItensPaginacao } from "../../../library/paginacao";
import { ModalConfirmacao } from "../../../components/ModalConfirmacao";
import { ModalFeedback } from "../../../components/ModalFeedback";
import { apiFetch } from "../../../services/api";

// Define os dados de usuário utilizados na listagem e na edição.
interface Usuario {
    id: number;
    nome: string;
    telefone: string;
    email: string;
    tipo_usuario: string;
    setor_id?: number | null;
    secretaria_id?: number | null;
    desativado_em?: string | null;
    motivo_desativacao?: string | null;
}

// Representa as opções de setor disponíveis para funcionários.
interface Setor {
    id: number;
    setor: string;
    sigla_setor: string;
}

// Representa as opções de secretaria disponíveis para administradores.
interface Secretaria {
    id: number;
    secretaria: string;
    sigla_secretaria: string;
}

const ITENS_POR_PAGINA = 20;

// Retorna um aviso de desativação adequado ao perfil atual do usuário.
function obterAvisoDesativacao(usuario: Usuario) {
    if (usuario.tipo_usuario === "funcionario") {
        return "Ao desativar, este funcionário perderá o vínculo com o setor, será alterado para usuário comum, sairá dos grupos e deixará de ver as conversas antigas. Ele poderá entrar novamente e receber novas mensagens privadas.";
    }

    if (usuario.tipo_usuario === "admin") {
        return "Ao desativar, este admin perderá o vínculo com a secretaria, será alterado para usuário comum, sairá dos grupos e deixará de ver as conversas antigas. Ele poderá entrar novamente e receber novas mensagens privadas.";
    }

    return "Ao desativar, este perfil será alterado para usuário comum, sairá dos grupos e deixará de ver as conversas antigas. Ele poderá entrar novamente e receber novas mensagens privadas.";
}

// Permite reutilizar a tela para usuários ativos ou desativados.
interface UsuariosAtivosProps {
    exibirDesativados?: boolean;
}

// Armazena o conteúdo e a posição do tooltip de desativação.
interface TooltipMotivo {
    motivo: string | null;
    top: number;
    left: number;
    abrirAbaixo: boolean;
}

function UsuariosAtivos({ exibirDesativados = false }: UsuariosAtivosProps) {
    // Mantém os dados e os estados das operações disponíveis na tela.
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [setores, setSetores] = useState<Setor[]>([]);
    const [secretarias, setSecretarias] = useState<Secretaria[]>([]);
    const [paginaAtual, setPaginaAtual] = useState(1);
    const [pesquisa, setPesquisa] = useState("");
    const [tooltipMotivo, setTooltipMotivo] = useState<TooltipMotivo | null>(null);
    const [usuarioParaAlterarStatus, setUsuarioParaAlterarStatus] = useState<Usuario | null>(null);
    const [motivoDesativacao, setMotivoDesativacao] = useState("");
    const [usuarioSendoAlterado, setUsuarioSendoAlterado] = useState<number | null>(null);
    const [usuarioEmEdicao, setUsuarioEmEdicao] = useState<Usuario | null>(null);
    const [setorEmEdicao, setSetorEmEdicao] = useState("");
    const [secretariaEmEdicao, setSecretariaEmEdicao] = useState("");
    const [salvandoAlteracoes, setSalvandoAlteracoes] = useState(false);
    const [feedback, setFeedback] = useState({
        aberto: false,
        tipo: "erro" as "erro" | "sucesso",
        mensagem: "",
    });

    // Filtra os usuários pelo termo pesquisado e pelo status solicitado.
    const termoPesquisa = pesquisa.trim().toLocaleLowerCase("pt-BR");
    const usuariosFiltrados = usuarios.filter((usuario) => {
        const correspondePesquisa =
            String(usuario.id).includes(termoPesquisa) ||
            usuario.nome.toLocaleLowerCase("pt-BR").includes(termoPesquisa) ||
            usuario.telefone.toLocaleLowerCase("pt-BR").includes(termoPesquisa) ||
            usuario.email.toLocaleLowerCase("pt-BR").includes(termoPesquisa);

        const correspondeStatus = exibirDesativados
            ? Boolean(usuario.desativado_em)
            : !usuario.desativado_em;

        return correspondePesquisa && correspondeStatus;
    });

    // Pagina somente os usuários que correspondem aos filtros atuais.
    const totalPaginas = Math.ceil(usuariosFiltrados.length / ITENS_POR_PAGINA);
    const inicioPagina = (paginaAtual - 1) * ITENS_POR_PAGINA;
    const usuariosPaginados = usuariosFiltrados.slice(
        inicioPagina,
        inicioPagina + ITENS_POR_PAGINA,
    );

    useEffect(() => {
        // Carrega a lista completa de usuários ao abrir a tela.
        async function carregarUsuarios() {
            const resposta = await apiFetch("/usuarios");

            if (!resposta.ok) {
                throw new Error("Não foi possível carregar os usuários");
            }

            const dados: Usuario[] = await resposta.json();
            setUsuarios(dados);
        }

        carregarUsuarios().catch(console.error);
    }, []);

    useEffect(() => {
        // Carrega os setores disponíveis para edição de funcionários.
        async function carregarSetores() {
            const resposta = await apiFetch("/setores");

            if (!resposta.ok) {
                throw new Error("Não foi possível carregar os setores");
            }

            const dados: Setor[] = await resposta.json();
            setSetores(dados);
        }

        carregarSetores().catch(console.error);
    }, []);

    useEffect(() => {
        // Carrega as secretarias disponíveis para edição de administradores.
        async function carregarSecretarias() {
            const resposta = await apiFetch("/secretaria");

            if (!resposta.ok) {
                throw new Error("Não foi possível carregar as secretarias");
            }

            const dados: Secretaria[] = await resposta.json();
            setSecretarias(dados);
        }

        carregarSecretarias().catch(console.error);
    }, []);

    useEffect(() => {
        // Corrige a página atual quando os filtros reduzem o total de páginas.
        if (totalPaginas > 0 && paginaAtual > totalPaginas) {
            setPaginaAtual(totalPaginas);
        }
    }, [paginaAtual, totalPaginas]);

    useEffect(() => {
        // Permite fechar o painel de edição pressionando a tecla Escape.
        if (!usuarioEmEdicao) return;

        function fecharComEscape(evento: KeyboardEvent) {
            if (evento.key === "Escape") {
                setUsuarioEmEdicao(null);
            }
        }

        document.addEventListener("keydown", fecharComEscape);
        return () => document.removeEventListener("keydown", fecharComEscape);
    }, [usuarioEmEdicao]);

    function abrirEdicao(usuario: Usuario) {
        // Cria uma cópia editável e prepara os vínculos atuais do usuário.
        setUsuarioEmEdicao({ ...usuario });
        setSetorEmEdicao(usuario.setor_id ? String(usuario.setor_id) : "");
        setSecretariaEmEdicao(usuario.secretaria_id ? String(usuario.secretaria_id) : "");
    }

    async function salvarAlteracoes() {
        // Impede o envio quando nenhum usuário está aberto para edição.
        if (!usuarioEmEdicao) return;

        setSalvandoAlteracoes(true);

        try {
            const resposta = await apiFetch(
                `/usuarios/${usuarioEmEdicao.id}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        telefone: usuarioEmEdicao.telefone,
                        email: usuarioEmEdicao.email,
                        tipo_usuario: usuarioEmEdicao.tipo_usuario,
                        setor_id: setorEmEdicao ? Number(setorEmEdicao) : null,
                        secretaria_id: secretariaEmEdicao
                            ? Number(secretariaEmEdicao)
                            : null,
                    }),
                },
            );

            const resultado = await resposta.json();

            if (!resposta.ok) {
                const mensagem = Array.isArray(resultado.message)
                    ? resultado.message.join(" ")
                    : resultado.message;
                throw new Error(mensagem ?? "Não foi possível salvar as alterações.");
            }

            // Substitui localmente somente o usuário atualizado pela API.
            const usuarioAtualizado = resultado as Usuario;
            setUsuarios((usuariosAtuais) =>
                usuariosAtuais.map((usuarioAtual) =>
                    usuarioAtual.id === usuarioAtualizado.id
                        ? usuarioAtualizado
                        : usuarioAtual,
                ),
            );
            setUsuarioEmEdicao(null);
            setFeedback({
                aberto: true,
                tipo: "sucesso",
                mensagem: "As alterações do usuário foram salvas com sucesso.",
            });
        } catch (erro) {
            setFeedback({
                aberto: true,
                tipo: "erro",
                mensagem: erro instanceof Error
                    ? erro.message
                    : "Não foi possível salvar as alterações.",
            });
        } finally {
            setSalvandoAlteracoes(false);
        }
    }

    async function alterarStatus() {
        // A alteração depende de um usuário previamente selecionado.
        if (!usuarioParaAlterarStatus) return;

        const estaDesativado = Boolean(usuarioParaAlterarStatus.desativado_em);
        const motivo = motivoDesativacao.trim();

        // Exige uma justificativa válida apenas nas desativações.
        if (!estaDesativado && motivo.length < 3) {
            setFeedback({
                aberto: true,
                tipo: "erro",
                mensagem: "Informe um motivo com pelo menos 3 caracteres.",
            });
            return;
        }

        setUsuarioSendoAlterado(usuarioParaAlterarStatus.id);

        try {
            // Define dinamicamente o endpoint conforme o status atual.
            const acao = estaDesativado ? "ativar" : "desativar";
            const resposta = await apiFetch(
                `/usuarios/${usuarioParaAlterarStatus.id}/${acao}`,
                {
                    method: "PATCH",
                    headers: {
                        ...(!estaDesativado
                            ? { "Content-Type": "application/json" }
                            : {}),
                    },
                    ...(!estaDesativado
                        ? { body: JSON.stringify({ motivo }) }
                        : {}),
                },
            );

            const resultado = await resposta.json();

            if (!resposta.ok) {
                const mensagem = Array.isArray(resultado.message)
                    ? resultado.message.join(" ")
                    : resultado.message;
                throw new Error(
                    mensagem ?? `Não foi possível ${acao} o usuário.`,
                );
            }

            // Mescla no estado local somente os campos retornados pela operação.
            const usuarioAtualizado = resultado as Partial<Usuario> & { id: number };
            setUsuarios((usuariosAtuais) =>
                usuariosAtuais.map((usuarioAtual) =>
                    usuarioAtual.id === usuarioAtualizado.id
                        ? { ...usuarioAtual, ...usuarioAtualizado }
                        : usuarioAtual,
                ),
            );
            setUsuarioParaAlterarStatus(null);
            setMotivoDesativacao("");
            setFeedback({
                aberto: true,
                tipo: "sucesso",
                mensagem: estaDesativado
                    ? "O usuário foi reativado como usuário comum."
                    : "O perfil foi desativado como usuário comum e suas conversas anteriores foram removidas da conta.",
            });
        } catch (erro) {
            setFeedback({
                aberto: true,
                tipo: "erro",
                mensagem: erro instanceof Error
                    ? erro.message
                    : "Não foi possível alterar o status do usuário.",
            });
        } finally {
            setUsuarioSendoAlterado(null);
        }
    }

    return (
        <section className="usuarios">
            <header className="usuarios__header">
                <div>
                    <span>CONTROLE DE USUÁRIOS</span>
                    <h2 id="titulo-usuarios">
                        {exibirDesativados
                            ? "Usuários desativados"
                            : "Alterar informações do usuário"}
                    </h2>
                    <p>
                        {exibirDesativados
                            ? "Consulte e reative usuários desativados."
                            : "Ajuste o cargo e o setor/secretaria de atuação do usuário no sistema."}
                    </p>
                </div>
            </header>

            <div className="usuarios__pesquisa">
                {/* Reinicia a paginação quando o termo de pesquisa muda. */}
                <input
                    type="search"
                    value={pesquisa}
                    onChange={(evento) => {
                        setPesquisa(evento.target.value);
                        setPaginaAtual(1);
                    }}
                    placeholder="Pesquisar usuários..."
                    aria-label="Pesquisar usuários"
                />
            </div>

            <div className="usuarios__tabela-container">
                <table className="usuarios__tabela">
                    <thead>
                        <tr>
                            <th scope="col">ID</th>
                            <th scope="col">Nome</th>
                            <th scope="col">Telefone</th>
                            <th scope="col">Email</th>
                            <th scope="col">Tipo de Usuário</th>
                            <th scope="col">Status</th>
                            <th scope="col">Ações</th>
                        </tr>
                    </thead>

                    <tbody>
                        {/* Renderiza apenas os usuários pertencentes à página atual. */}
                        {usuariosPaginados.map((usuario) => (
                            <tr
                                key={usuario.id}
                                className={`usuarios__linha${
                                    usuario.desativado_em
                                        ? " usuarios__linha--desativada"
                                        : ""
                                }`}
                                tabIndex={exibirDesativados ? undefined : 0}
                                onClick={() => {
                                    if (!exibirDesativados) abrirEdicao(usuario);
                                }}
                                onMouseEnter={(evento) => {
                                    // Posiciona o motivo próximo ao status do usuário desativado.
                                    if (!exibirDesativados) return;

                                    const status = evento.currentTarget.querySelector<HTMLElement>(
                                        ".usuarios__status",
                                    );

                                    if (!status) return;

                                    const posicao = status.getBoundingClientRect();
                                    const abrirAbaixo = posicao.top < 180;

                                    setTooltipMotivo({
                                        motivo: usuario.motivo_desativacao ?? null,
                                        top: abrirAbaixo
                                            ? posicao.bottom + 8
                                            : posicao.top - 8,
                                        left: posicao.left + posicao.width / 2,
                                        abrirAbaixo,
                                    });
                                }}
                                onMouseLeave={() => {
                                    if (exibirDesativados) setTooltipMotivo(null);
                                }}
                                onKeyDown={(evento) => {
                                    // Oferece acesso ao painel de edição também pelo teclado.
                                    if (exibirDesativados) return;
                                    if (evento.target !== evento.currentTarget) return;

                                    if (evento.key === "Enter" || evento.key === " ") {
                                        evento.preventDefault();
                                        abrirEdicao(usuario);
                                    }
                                }}
                            >
                                <td>{usuario.id}</td>
                                <td>{usuario.nome}</td>
                                <td>{usuario.telefone}</td>
                                <td>{usuario.email}</td>
                                <td>{usuario.tipo_usuario}</td>
                                <td>
                                    <span
                                        className={`usuarios__status usuarios__status--${
                                            usuario.desativado_em
                                                ? "desativada"
                                                : "ativa"
                                        }`}
                                    >
                                        {usuario.desativado_em
                                            ? "Desativado"
                                            : "Ativo"}
                                    </span>
                                </td>
                                <td className="usuarios__acoes">
                                    <div className="usuarios__acoes-botoes">
                                        {!exibirDesativados && (
                                            <button
                                                className="usuarios__botao-editar"
                                                type="button"
                                                onClick={(evento) => {
                                                    evento.stopPropagation();
                                                    abrirEdicao(usuario);
                                                }}
                                            >
                                                Editar
                                            </button>
                                        )}

                                        <button
                                            className={usuario.desativado_em
                                                ? "usuarios__botao-ativar"
                                                : "usuarios__botao-desativar"}
                                            type="button"
                                            onClick={(evento) => {
                                                evento.stopPropagation();
                                                setUsuarioParaAlterarStatus(usuario);
                                                setMotivoDesativacao("");
                                            }}
                                            disabled={usuarioSendoAlterado === usuario.id}
                                        >
                                            {usuarioSendoAlterado === usuario.id
                                                ? "Processando..."
                                                : usuario.desativado_em
                                                    ? "Ativar"
                                                    : "Desativar"}
                                        </button>

                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Renderiza o tooltip fora da tabela para evitar cortes pelo contêiner. */}
            {exibirDesativados && tooltipMotivo && createPortal(
                <span
                    className={`usuarios__tooltip${
                        tooltipMotivo.abrirAbaixo
                            ? " usuarios__tooltip--abaixo"
                            : ""
                    }`}
                    role="tooltip"
                    style={{
                        top: tooltipMotivo.top,
                        left: tooltipMotivo.left,
                    }}
                >
                    {tooltipMotivo.motivo
                        ? `Motivo: ${tooltipMotivo.motivo}`
                        : "Motivo não informado"}
                </span>,
                document.body,
            )}

            {/* Mostra a navegação somente quando há mais de uma página. */}
            {totalPaginas > 1 && (
                <nav
                    aria-label="Paginação dos usuários"
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

            {/* Exibe o painel lateral somente durante a edição de um usuário. */}
            {usuarioEmEdicao && (
                <div
                    className="usuarios__painel-fundo"
                    onClick={() => setUsuarioEmEdicao(null)}
                >
                    <aside
                        className="usuarios__painel-lateral"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Editar usuário"
                        onClick={(evento) => evento.stopPropagation()}
                    >
                        <header className="header__painel-lateral">
                            <span>Informações</span>
                            <button
                                className="usuarios__painel-fechar"
                                type="button"
                                onClick={() => setUsuarioEmEdicao(null)}
                                aria-label="Fechar painel"
                            >
                                ×
                            </button>
                        </header>

                        <section className="container-info__painel-lateral">

                            <div className="info__painel-lateral">
                                <label>ID</label>
                                <input type="text" value={usuarioEmEdicao.id} readOnly />
                            </div>

                            <div className="info__painel-lateral">
                                <label htmlFor="">Nome</label>
                                <input type="text" value={usuarioEmEdicao.nome} readOnly />
                            </div>

                            <div className="info__painel-lateral">
                                <label>Status</label>
                                <input
                                    type="text"
                                    value={usuarioEmEdicao.desativado_em
                                        ? "Desativado"
                                        : "Ativo"}
                                    readOnly
                                />
                            </div>

                            {usuarioEmEdicao.desativado_em && (
                                <div className="info__painel-lateral">
                                    <label>Motivo da desativação</label>
                                    <textarea
                                        value={usuarioEmEdicao.motivo_desativacao ?? ""}
                                        readOnly
                                    />
                                </div>
                            )}

                            <div className="info__painel-lateral">
                                <label htmlFor="telefone">Telefone</label>
                                <input
                                    type="text"
                                    id="telefone"
                                    value={usuarioEmEdicao.telefone}
                                    onChange={(evento) => {
                                        setUsuarioEmEdicao((usuarioAtual) =>
                                            usuarioAtual
                                                ? { ...usuarioAtual, telefone: evento.target.value }
                                                : null,
                                        );
                                    }}
                                />
                            </div>

                            <div className="info__painel-lateral">
                                <label htmlFor="email">E-mail</label>
                                <input
                                    type="text"
                                    id="email"
                                    value={usuarioEmEdicao.email}
                                    onChange={(evento) => {
                                        setUsuarioEmEdicao((usuarioAtual) =>
                                            usuarioAtual
                                                ? { ...usuarioAtual, email: evento.target.value }
                                                : null,
                                        );
                                    }}
                                />
                            </div>

                            <div className="info__painel-lateral">
                                <label htmlFor="tipo-usuario">Tipo de Usuario</label>
                                <select
                                    id="tipo-usuario"
                                    value={usuarioEmEdicao.tipo_usuario}
                                    onChange={(evento) => {
                                        const tipoUsuario = evento.target.value;

                                        setUsuarioEmEdicao((usuarioAtual) =>
                                            usuarioAtual
                                                ? { ...usuarioAtual, tipo_usuario: tipoUsuario }
                                                : null,
                                        );

                                        if (tipoUsuario !== "funcionario") {
                                            setSetorEmEdicao("");
                                        }

                                        if (tipoUsuario !== "admin") {
                                            setSecretariaEmEdicao("");
                                        }
                                    }}
                                >
                                    <option value="user">Usuário</option>
                                    <option value="funcionario">Funcionário</option>
                                    <option value="admin">Administrador</option>
                                    <option value="superAdmin">Super administrador</option>
                                </select>
                            </div>

                            {/* Funcionários precisam estar vinculados a um setor. */}
                            {usuarioEmEdicao.tipo_usuario === "funcionario" && (
                                <div className="info__painel-lateral">
                                    <label htmlFor="setor-vinculado">Setor vinculado</label>
                                    <select
                                        id="setor-vinculado"
                                        value={setorEmEdicao}
                                        onChange={(evento) => setSetorEmEdicao(evento.target.value)}
                                    >
                                        <option value="" disabled>Selecione um setor</option>
                                        {setores.map((setor) => (
                                            <option key={setor.id} value={setor.id}>
                                                {setor.sigla_setor} - {setor.setor}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Administradores podem ser vinculados a uma secretaria. */}
                            {usuarioEmEdicao.tipo_usuario === "admin" && (
                                <div className="info__painel-lateral">
                                    <label htmlFor="secretaria-vinculada">Secretaria vinculada</label>
                                    <select
                                        id="secretaria-vinculada"
                                        value={secretariaEmEdicao}
                                        onChange={(evento) => setSecretariaEmEdicao(evento.target.value)}
                                    >
                                        <option value="" disabled>Selecione uma secretaria</option>
                                        {secretarias.map((secretaria) => (
                                            <option key={secretaria.id} value={secretaria.id}>
                                                {secretaria.sigla_secretaria} - {secretaria.secretaria}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={() => void salvarAlteracoes()}
                                className="botao__info-painel-lateral"
                                disabled={salvandoAlteracoes}
                            >
                                {salvandoAlteracoes ? "Salvando..." : "Salvar alterações"}
                            </button>

                        </section>

                        <div className="usuarios__painel-conteudo" />
                    </aside>
                </div>
            )}

            {/* Confirma a ativação ou desativação antes de enviar a operação. */}
            <ModalConfirmacao
                aberto={usuarioParaAlterarStatus !== null}
                titulo={usuarioParaAlterarStatus?.desativado_em
                    ? "Reativar usuário?"
                    : "Desativar usuário?"}
                mensagem={usuarioParaAlterarStatus
                    ? usuarioParaAlterarStatus.desativado_em
                        ? `Deseja reativar ${usuarioParaAlterarStatus.nome} como usuário comum?`
                        : obterAvisoDesativacao(usuarioParaAlterarStatus)
                    : ""}
                carregando={usuarioSendoAlterado !== null}
                textoConfirmar={usuarioParaAlterarStatus?.desativado_em
                    ? "Ativar"
                    : "Desativar"}
                textoCarregando="Processando..."
                confirmarDesabilitado={Boolean(
                    usuarioParaAlterarStatus &&
                    !usuarioParaAlterarStatus.desativado_em &&
                    motivoDesativacao.trim().length < 3
                )}
                aoCancelar={() => {
                    setUsuarioParaAlterarStatus(null);
                    setMotivoDesativacao("");
                }}
                aoConfirmar={() => void alterarStatus()}
            >
                {/* Solicita o motivo somente quando a conta será desativada. */}
                {usuarioParaAlterarStatus && !usuarioParaAlterarStatus.desativado_em && (
                    <div className="usuarios__modal-motivo">
                        <label htmlFor="motivo-desativacao">
                            Motivo da desativação <span aria-hidden="true">*</span>
                        </label>
                        <textarea
                            id="motivo-desativacao"
                            value={motivoDesativacao}
                            onChange={(evento) => setMotivoDesativacao(evento.target.value)}
                            maxLength={500}
                            required
                            placeholder="Informe o motivo da desativação"
                        />
                        <small>{motivoDesativacao.length}/500 caracteres</small>
                    </div>
                )}
            </ModalConfirmacao>

            {/* Comunica o resultado das alterações realizadas na tela. */}
            <ModalFeedback
                aberto={feedback.aberto}
                tipo={feedback.tipo}
                mensagem={feedback.mensagem}
                aoFechar={() => {
                    setFeedback((estadoAtual) => ({
                        ...estadoAtual,
                        aberto: false,
                    }));
                }}
            />
        </section>
    )
}

export default UsuariosAtivos;
