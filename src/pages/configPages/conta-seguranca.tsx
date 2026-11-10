import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ModalFeedback } from "../../components/ModalFeedback";
import { NotificacaoConfiguracao } from "../../components/NotificacaoConfiguracao";
import { useAutenticacao } from "../../components/AutenticacaoContext";
import { apiFetch } from "../../services/api";
import { autenticarComBiometria } from "../../services/biometria.service";
import {
  ehClienteCapacitor,
  obterBiometriaHabilitada,
  removerBiometriaHabilitada,
  salvarBiometriaHabilitada,
} from "../../services/armazenamentoSessao";

type EtapaModal =
  | "senha-ativacao"
  | "codigo-ativacao"
  | "senha-desativacao"
  | "codigo-desativacao"
  | "recuperacao-desativacao"
  | "codigos-recuperacao"
  | null;

interface RespostaApi {
  ativo?: boolean;
  message?: string | string[];
  mensagem?: string;
  token?: string;
  email_mascarado?: string;
  expira_em?: string;
  codigos_recuperacao?: string[];
}

interface Desafio {
  token: string;
  emailMascarado: string;
  finalidade: "ativacao" | "desativacao";
}

function mensagemDaResposta(resultado: RespostaApi) {
  if (Array.isArray(resultado.message)) {
    return resultado.message.join(", ");
  }

  return (
    resultado.message ||
    resultado.mensagem ||
    "Não foi possível concluir a solicitação."
  );
}

function formatarCodigoRecuperacao(valor: string) {
  const codigoLimpo = valor
    .toUpperCase()
    .replace(/[ILO01]/g, "")
    .replace(/[^A-Z2-9]/g, "")
    .slice(0, 8);

  if (codigoLimpo.length <= 4) {
    return codigoLimpo;
  }

  return `${codigoLimpo.slice(0, 4)}-${codigoLimpo.slice(4)}`;
}

function ContaSeguranca() {
  const navigate = useNavigate();
  const { encerrarSessao } = useAutenticacao();
  const [ativo, setAtivo] = useState(false);
  const [biometriaAtiva, setBiometriaAtiva] = useState(false);
  const [carregandoBiometria, setCarregandoBiometria] = useState(true);
  const [carregandoStatus, setCarregandoStatus] = useState(true);
  const [carregando, setCarregando] = useState(false);
  const [etapaModal, setEtapaModal] = useState<EtapaModal>(null);
  const [senha, setSenha] = useState("");
  const [codigo, setCodigo] = useState("");
  const [codigoRecuperacao, setCodigoRecuperacao] = useState("");
  const [desafio, setDesafio] = useState<Desafio | null>(null);
  const [codigosRecuperacao, setCodigosRecuperacao] = useState<string[]>([]);
  const [erroModal, setErroModal] = useState("");
  const [segundosReenvio, setSegundosReenvio] = useState(0);
  const [notificacao, setNotificacao] = useState<{
    id: number;
    estado: "ativado" | "desativado";
  } | null>(null);
  const [feedback, setFeedback] = useState({
    aberto: false,
    tipo: "erro" as "erro" | "sucesso",
    mensagem: "",
  });

  function mostrarNotificacao(estado: "ativado" | "desativado") {
    setNotificacao((notificacaoAtual) => ({
      id: (notificacaoAtual?.id ?? 0) + 1,
      estado,
    }));
  }

  useEffect(() => {
    void (async () => {
      try {
        const resposta = await apiFetch("/auth/2fa/status");
        const resultado = (await resposta.json()) as RespostaApi;

        if (!resposta.ok) {
          throw new Error(mensagemDaResposta(resultado));
        }

        setAtivo(Boolean(resultado.ativo));
      } catch (erro) {
        setFeedback({
          aberto: true,
          tipo: "erro",
          mensagem:
            erro instanceof Error
              ? erro.message
              : "Não foi possível consultar a verificação em duas etapas.",
        });
      } finally {
        setCarregandoStatus(false);
      }
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        setBiometriaAtiva(await obterBiometriaHabilitada());
      } catch {
        setFeedback({
          aberto: true,
          tipo: "erro",
          mensagem: "Não foi possível consultar a configuração de biometria.",
        });
      } finally {
        setCarregandoBiometria(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (segundosReenvio <= 0) return;

    const temporizador = window.setInterval(() => {
      setSegundosReenvio((segundos) => Math.max(0, segundos - 1));
    }, 1000);

    return () => window.clearInterval(temporizador);
  }, [segundosReenvio]);

  async function requisicaoAutenticada(
    endpoint: string,
    opcoes: RequestInit = {},
  ) {
    const resposta = await apiFetch(
      endpoint,
      {
        ...opcoes,
        headers: {
          "Content-Type": "application/json",
          ...opcoes.headers,
        },
      },
    );
    const resultado = (await resposta.json()) as RespostaApi;

    if (!resposta.ok) {
      throw new Error(mensagemDaResposta(resultado));
    }

    return resultado;
  }

  function abrirConfiguracao() {
    setSenha("");
    setCodigo("");
    setCodigoRecuperacao("");
    setErroModal("");
    setDesafio(null);
    setEtapaModal(ativo ? "senha-desativacao" : "senha-ativacao");
  }

  function limparModal() {
    setEtapaModal(null);
    setSenha("");
    setCodigo("");
    setCodigoRecuperacao("");
    setDesafio(null);
    setCodigosRecuperacao([]);
    setErroModal("");
    setSegundosReenvio(0);
  }

  function fecharModal() {
    if (carregando) return;

    limparModal();
  }

  function mostrarErroModal(erro: unknown) {
    setErroModal(
      erro instanceof Error
        ? erro.message
        : "Não foi possível conectar com o servidor.",
    );
  }

  async function iniciarAtivacao(evento: React.SubmitEvent<HTMLFormElement>) {
    evento.preventDefault();
    setCarregando(true);
    setErroModal("");

    try {
      const resultado = await requisicaoAutenticada("/auth/2fa/setup", {
        method: "POST",
        body: JSON.stringify({ senha }),
      });

      if (!resultado.token || !resultado.email_mascarado) {
        throw new Error("Não foi possível iniciar a ativação.");
      }

      setDesafio({
        token: resultado.token,
        emailMascarado: resultado.email_mascarado,
        finalidade: "ativacao",
      });
      setCodigo("");
      setSegundosReenvio(60);
      setEtapaModal("codigo-ativacao");
    } catch (erro) {
      mostrarErroModal(erro);
    } finally {
      setCarregando(false);
    }
  }

  async function confirmarAtivacao(
    evento: React.SubmitEvent<HTMLFormElement>,
  ) {
    evento.preventDefault();
    if (!desafio) return;

    setCarregando(true);
    setErroModal("");

    try {
      const resultado = await requisicaoAutenticada("/auth/2fa/confirm", {
        method: "POST",
        body: JSON.stringify({
          token: desafio.token,
          codigo,
        }),
      });

      setAtivo(true);
      mostrarNotificacao("ativado");
      setCodigosRecuperacao(resultado.codigos_recuperacao || []);
      setEtapaModal("codigos-recuperacao");
      setCodigo("");
      setDesafio(null);
      setSegundosReenvio(0);
    } catch (erro) {
      mostrarErroModal(erro);
    } finally {
      setCarregando(false);
    }
  }

  async function iniciarDesativacao(
    evento: React.SubmitEvent<HTMLFormElement>,
  ) {
    evento.preventDefault();
    setCarregando(true);
    setErroModal("");

    try {
      const resultado = await requisicaoAutenticada(
        "/auth/2fa/disable/request",
        {
          method: "POST",
          body: JSON.stringify({ senha }),
        },
      );

      if (!resultado.token || !resultado.email_mascarado) {
        throw new Error("Não foi possível iniciar a desativação.");
      }

      setDesafio({
        token: resultado.token,
        emailMascarado: resultado.email_mascarado,
        finalidade: "desativacao",
      });
      setCodigo("");
      setSegundosReenvio(60);
      setEtapaModal("codigo-desativacao");
    } catch (erro) {
      mostrarErroModal(erro);
    } finally {
      setCarregando(false);
    }
  }

  async function confirmarDesativacao(
    evento: React.SubmitEvent<HTMLFormElement>,
  ) {
    evento.preventDefault();
    if (!desafio) return;

    setCarregando(true);
    setErroModal("");

    try {
      await requisicaoAutenticada("/auth/2fa/disable", {
        method: "POST",
        body: JSON.stringify({
          token: desafio.token,
          codigo,
        }),
      });

      setAtivo(false);
      limparModal();
      mostrarNotificacao("desativado");
    } catch (erro) {
      mostrarErroModal(erro);
    } finally {
      setCarregando(false);
    }
  }

  async function desativarComRecuperacao(
    evento: React.SubmitEvent<HTMLFormElement>,
  ) {
    evento.preventDefault();
    setCarregando(true);
    setErroModal("");

    try {
      await requisicaoAutenticada(
        "/auth/2fa/disable/recovery",
        {
          method: "POST",
          body: JSON.stringify({ senha, codigoRecuperacao }),
        },
      );

      setAtivo(false);
      limparModal();
      mostrarNotificacao("desativado");
    } catch (erro) {
      mostrarErroModal(erro);
    } finally {
      setCarregando(false);
    }
  }

  async function reenviarCodigo() {
    if (!desafio || segundosReenvio > 0) return;

    setCarregando(true);
    setErroModal("");

    try {
      const resultado = await requisicaoAutenticada("/auth/2fa/resend", {
        method: "POST",
        body: JSON.stringify({
          token: desafio.token,
          finalidade: desafio.finalidade,
        }),
      });

      setDesafio((atual) =>
        atual
          ? {
              ...atual,
              emailMascarado:
                resultado.email_mascarado || atual.emailMascarado,
            }
          : atual,
      );
      setSegundosReenvio(60);
    } catch (erro) {
      mostrarErroModal(erro);
    } finally {
      setCarregando(false);
    }
  }

  async function copiarCodigos() {
    try {
      await navigator.clipboard.writeText(codigosRecuperacao.join("\n"));
      setFeedback({
        aberto: true,
        tipo: "sucesso",
        mensagem: "Códigos de recuperação copiados.",
      });
    } catch {
      setFeedback({
        aberto: true,
        tipo: "erro",
        mensagem: "Não foi possível copiar os códigos automaticamente.",
      });
    }
  }

  async function sair() {
    try {
      // Usa o fluxo central para revogar a sessão e limpar os tokens.
      await encerrarSessao();
    } finally {
      navigate("/");
    }
  }

  async function alternarBiometria() {
    if (!ehClienteCapacitor()) {
      setFeedback({
        aberto: true,
        tipo: "erro",
        mensagem: "O login por biometria está disponível apenas no aplicativo.",
      });
      return;
    }

    setCarregandoBiometria(true);

    try {
      if (biometriaAtiva) {
        await removerBiometriaHabilitada();
        setBiometriaAtiva(false);
        setFeedback({
          aberto: true,
          tipo: "sucesso",
          mensagem: "Login por biometria desativado.",
        });
        return;
      }

      await autenticarComBiometria();
      await salvarBiometriaHabilitada();
      setBiometriaAtiva(true);
      setFeedback({
        aberto: true,
        tipo: "sucesso",
        mensagem: "Login por biometria ativado.",
      });
    } catch {
      setFeedback({
        aberto: true,
        tipo: "erro",
        mensagem:
          "Não foi possível confirmar a biometria. Verifique se ela está cadastrada no aparelho e tente novamente.",
      });
    } finally {
      setCarregandoBiometria(false);
    }
  }

  const modalCodigo =
    etapaModal === "codigo-ativacao" || etapaModal === "codigo-desativacao";

  return (
    <main className="conta-seguranca">
      <section className="conta-seguranca__item conta-seguranca__item--senha">
        <a
          className="conta-seguranca__acao"
          href="/recuperar-senha"
          target="_blank"
          rel="noreferrer"
        >
          <div className="conta-seguranca__icone">
            <svg width="22" height="22" fill="currentColor" className="bi bi-key seguranca-icone" viewBox="0 0 16 16">
              <path d="M0 8a4 4 0 0 1 7.465-2H14a.5.5 0 0 1 .354.146l1.5 1.5a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0L13 9.207l-.646.647a.5.5 0 0 1-.708 0L11 9.207l-.646.647a.5.5 0 0 1-.708 0L9 9.207l-.646.647A.5.5 0 0 1 8 10h-.535A4 4 0 0 1 0 8m4-3a3 3 0 1 0 2.712 4.285A.5.5 0 0 1 7.163 9h.63l.853-.854a.5.5 0 0 1 .708 0l.646.647.646-.647a.5.5 0 0 1 .708 0l.646.647.646-.647a.5.5 0 0 1 .708 0l.646.647.793-.793-1-1h-6.63a.5.5 0 0 1-.451-.285A3 3 0 0 0 4 5" />
              <path d="M4 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0" />
            </svg>
          </div>

          <div className="conta-seguranca__conteudo">
            <strong className="conta-seguranca__titulo">Alterar senha</strong>
            <span className="conta-seguranca__descricao">Recomendamos a alteração periódica da sua senha para garantir a segurança dos seus dados.</span>
          </div>

          <span className="conta-seguranca__indicador bi-arrow-right">
            <svg width="20" height="20" fill="currentColor" className="bi" viewBox="0 0 16 16">
              <path fillRule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8" />
            </svg>
          </span>
        </a>
      </section>

      <section className="conta-seguranca__item conta-seguranca__item--autenticacao">
        <div className="conta-seguranca__acao">
          <div className="conta-seguranca__icone">
            <svg width="22" height="22" fill="currentColor" className="bi bi-person-check seguranca-icone" viewBox="0 0 16 16">
              <path d="M12.5 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7m1.679-4.493-1.335 2.226a.75.75 0 0 1-1.174.144l-.774-.773a.5.5 0 0 1 .708-.708l.547.548 1.17-1.951a.5.5 0 1 1 .858.514M11 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0M8 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4" />
              <path d="M8.256 14a4.5 4.5 0 0 1-.229-1.004H3c.001-.246.154-.986.832-1.664C4.484 10.68 5.711 10 8 10q.39 0 .74.025c.226-.341.496-.65.804-.918Q8.844 9.002 8 9c-5 0-6 3-6 4s1 1 1 1z" />
            </svg>
          </div>

          <div className="conta-seguranca__conteudo">
            <strong className="conta-seguranca__titulo">Autenticação de duas etapas</strong>
            <span className="conta-seguranca__descricao">
              {carregandoStatus
                ? "Consultando a proteção da sua conta..."
                : ativo
                  ? "Ativa. Um código será enviado por e-mail ao entrar na conta."
                  : "Inativa. Ative para receber um código por e-mail ao entrar na conta."}
            </span>
          </div>

          <span className="conta-seguranca__indicador">
            <button
              className={`conta-seguranca__alternador${ativo ? " conta-seguranca__alternador--ativo" : ""}`}
              type="button"
              role="switch"
              aria-label={`${ativo ? "Desativar" : "Ativar"} autenticação de duas etapas`}
              aria-checked={ativo}
              disabled={carregandoStatus}
              onClick={abrirConfiguracao}
            />
          </span>
        </div>
      </section>

      <section className="conta-seguranca__item conta-seguranca__item--biometria">
        <div className="conta-seguranca__acao">
          <div className="conta-seguranca__icone">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 11a2 2 0 0 1 2 2c0 3.2-.8 5.9-2.3 8" />
              <path d="M8.2 20.2A18.4 18.4 0 0 0 9 13a3 3 0 0 1 6 0c0 2.5-.4 4.8-1.2 7" />
              <path d="M5.1 18.2c.6-1.8.9-3.5.9-5.2a6 6 0 0 1 12 0c0 1.9-.2 3.7-.7 5.4" />
              <path d="M3 14.5V13a9 9 0 0 1 18 0" />
              <path d="M5.5 5.5A9 9 0 0 1 12 3" />
            </svg>
          </div>

          <div className="conta-seguranca__conteudo">
            <strong className="conta-seguranca__titulo">Login por biometria</strong>
            <span className="conta-seguranca__descricao">
              Funcionalidade disponível apenas em dispositivos móveis.
            </span>
          </div>

          <span className="conta-seguranca__indicador">
            <button
              className={`conta-seguranca__alternador alternador-configuracao${biometriaAtiva ? " conta-seguranca__alternador--ativo" : ""}`}
              type="button"
              role="switch"
              aria-label={`${biometriaAtiva ? "Desativar" : "Ativar"} login por biometria`}
              aria-checked={biometriaAtiva}
              disabled={carregandoBiometria}
              onClick={alternarBiometria}
            />
          </span>
        </div>
      </section>

      <section className="conta-seguranca__item conta-seguranca__item--sessoes">
        <button className="conta-seguranca__acao conta-seguranca__acao--botao" type="button" onClick={sair}>
          <div className="conta-seguranca__icone seguranca-icone-sair">
            <svg width="22" height="22" fill="currentColor" className="bi bi-box-arrow-left seguranca-icone" viewBox="0 0 16 16">
              <path fillRule="evenodd" d="M6 12.5a.5.5 0 0 0 .5.5h8a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-8a.5.5 0 0 0-.5.5v2a.5.5 0 0 1-1 0v-2A1.5 1.5 0 0 1 6.5 2h8A1.5 1.5 0 0 1 16 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 5 12.5v-2a.5.5 0 0 1 1 0z" />
              <path fillRule="evenodd" d="M.146 8.354a.5.5 0 0 1 0-.708l3-3a.5.5 0 1 1 .708.708L1.707 7.5H10.5a.5.5 0 0 1 0 1H1.707l2.147 2.146a.5.5 0 0 1-.708.708z" />
            </svg>
          </div>

          <div className="conta-seguranca__conteudo">
            <strong className="conta-seguranca__titulo conta-seguranca__titulo-sair">Encerrar sessões</strong>
            <span className="conta-seguranca__descricao">Desconecte de outros dispositivos para garantir sua segurança.</span>
          </div>

          <span className="conta-seguranca__indicador bi-arrow-right icone-seta-sair">
            <svg width="20" height="20" fill="currentColor" className="bi" viewBox="0 0 16 16" color="#b41313">
              <path fillRule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8" />
            </svg>
          </span>
        </button>
      </section>

      {etapaModal && (
        <div className="duas-etapas-modal__fundo" onMouseDown={fecharModal}>
          <section
            className="duas-etapas-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="duas-etapas-titulo"
            onMouseDown={(evento) => evento.stopPropagation()}
          >
            {etapaModal === "senha-ativacao" && (
              <form onSubmit={iniciarAtivacao}>
                <h2 id="duas-etapas-titulo">Ativar verificação em duas etapas</h2>
                <p>Confirme sua senha. Enviaremos um código de 6 dígitos para o e-mail cadastrado.</p>
                <label className="duas-etapas-modal__campo">
                  <span>Senha atual</span>
                  <input type="password" autoComplete="current-password" value={senha} onChange={(evento) => setSenha(evento.target.value)} required autoFocus />
                </label>
                {erroModal && <p className="duas-etapas-modal__erro" role="alert">{erroModal}</p>}
                <div className="duas-etapas-modal__acoes">
                  <button className="duas-etapas-modal__secundario" type="button" onClick={fecharModal}>Cancelar</button>
                  <button className="duas-etapas-modal__primario" type="submit" disabled={carregando}>{carregando ? "Enviando..." : "Enviar código"}</button>
                </div>
              </form>
            )}

            {modalCodigo && desafio && (
              <form onSubmit={etapaModal === "codigo-ativacao" ? confirmarAtivacao : confirmarDesativacao}>
                <h2 id="duas-etapas-titulo">
                  {etapaModal === "codigo-ativacao" ? "Confirmar ativação" : "Confirmar desativação"}
                </h2>
                <p>Digite o código enviado para <strong>{desafio.emailMascarado}</strong>. Ele expira em 5 minutos.</p>
                <label className="duas-etapas-modal__campo">
                  <span>Código de verificação</span>
                  <input type="text" inputMode="numeric" autoComplete="one-time-code" placeholder="000000" value={codigo} onChange={(evento) => setCodigo(evento.target.value.replace(/\D/g, "").slice(0, 6))} minLength={6} maxLength={6} required autoFocus />
                </label>
                {erroModal && <p className="duas-etapas-modal__erro" role="alert">{erroModal}</p>}
                <button className="duas-etapas-modal__link" type="button" onClick={reenviarCodigo} disabled={carregando || segundosReenvio > 0}>
                  {segundosReenvio > 0 ? `Reenviar em ${segundosReenvio}s` : "Reenviar código"}
                </button>
                <div className="duas-etapas-modal__acoes">
                  <button className="duas-etapas-modal__secundario" type="button" onClick={fecharModal}>Cancelar</button>
                  <button className="duas-etapas-modal__primario" type="submit" disabled={carregando}>{carregando ? "Verificando..." : "Confirmar"}</button>
                </div>
              </form>
            )}

            {etapaModal === "senha-desativacao" && (
              <form onSubmit={iniciarDesativacao}>
                <h2 id="duas-etapas-titulo">Desativar verificação em duas etapas</h2>
                <p>Confirme sua senha para receber por e-mail o código de desativação.</p>
                <label className="duas-etapas-modal__campo">
                  <span>Senha atual</span>
                  <input type="password" autoComplete="current-password" value={senha} onChange={(evento) => setSenha(evento.target.value)} required autoFocus />
                </label>
                {erroModal && <p className="duas-etapas-modal__erro" role="alert">{erroModal}</p>}
                <button className="duas-etapas-modal__link" type="button" onClick={() => { setErroModal(""); setCodigoRecuperacao(""); setEtapaModal("recuperacao-desativacao"); }}>Usar código de recuperação</button>
                <div className="duas-etapas-modal__acoes">
                  <button className="duas-etapas-modal__secundario" type="button" onClick={fecharModal}>Cancelar</button>
                  <button className="duas-etapas-modal__perigo" type="submit" disabled={carregando}>{carregando ? "Enviando..." : "Enviar código"}</button>
                </div>
              </form>
            )}

            {etapaModal === "recuperacao-desativacao" && (
              <form onSubmit={desativarComRecuperacao}>
                <h2 id="duas-etapas-titulo">Usar código de recuperação</h2>
                <p>Informe sua senha e um código de recuperação ainda não utilizado.</p>
                <label className="duas-etapas-modal__campo">
                  <span>Senha atual</span>
                  <input type="password" autoComplete="current-password" value={senha} onChange={(evento) => setSenha(evento.target.value)} required autoFocus />
                </label>
                <label className="duas-etapas-modal__campo">
                  <span>Código de recuperação</span>
                  <input type="text" placeholder="ABCD-EFGH" value={codigoRecuperacao} onChange={(evento) => setCodigoRecuperacao(formatarCodigoRecuperacao(evento.target.value))} minLength={9} maxLength={9} required />
                </label>
                {erroModal && <p className="duas-etapas-modal__erro" role="alert">{erroModal}</p>}
                <button className="duas-etapas-modal__link" type="button" onClick={() => { setErroModal(""); setEtapaModal("senha-desativacao"); }}>Receber código por e-mail</button>
                <div className="duas-etapas-modal__acoes">
                  <button className="duas-etapas-modal__secundario" type="button" onClick={fecharModal}>Cancelar</button>
                  <button className="duas-etapas-modal__perigo" type="submit" disabled={carregando}>{carregando ? "Desativando..." : "Desativar"}</button>
                </div>
              </form>
            )}

            {etapaModal === "codigos-recuperacao" && (
              <div>
                <h2 id="duas-etapas-titulo">Guarde seus códigos de recuperação</h2>
                <p>Estes códigos serão exibidos somente agora. Guarde-os em um local seguro, cada um pode ser usado uma única vez.</p>
                <div className="duas-etapas-modal__codigos" aria-label="Códigos de recuperação">
                  {codigosRecuperacao.map((codigoAtual) => (
                    <code key={codigoAtual}>{codigoAtual}</code>
                  ))}
                </div>
                <div className="duas-etapas-modal__acoes">
                  <button className="duas-etapas-modal__secundario" type="button" onClick={copiarCodigos}>Copiar códigos</button>
                  <button className="duas-etapas-modal__primario" type="button" onClick={fecharModal}>Já salvei os códigos</button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {notificacao && (
        <NotificacaoConfiguracao
          key={notificacao.id}
          estado={notificacao.estado}
          aoFechar={() => setNotificacao(null)}
        />
      )}

      <ModalFeedback
        aberto={feedback.aberto}
        tipo={feedback.tipo}
        mensagem={feedback.mensagem}
        aoFechar={() => setFeedback((estado) => ({ ...estado, aberto: false }))}
      />
    </main>
  );
}

export default ContaSeguranca;
