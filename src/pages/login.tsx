// Exibe o formulário de acesso e a segunda etapa de verificação.
import brasao from "../assets/img/brasao.webp";
import { useEffect, useRef, useState } from "react";
import imagemLogin from "../assets/img/imagem-pagina-login.png";
import "./css/LoginCadastro.css";
import "./css/RecuperarSenha.css";
import { Link, Navigate, useNavigate } from "react-router";
import { ModalFeedback } from "../components/ModalFeedback";
import { ModalCadastroGoogle } from "../components/ModalCadastroGoogle";
import { useAutenticacao } from "../components/AutenticacaoContext";
import { requisicaoPublica } from "../services/api";
import { useRecaptchaToken } from "../hooks/useRecaptchaToken";
import RestaurarSessao from "../components/restaurarSessao/RestaurarSessao";

import {
  GoogleLogin,
  type CredentialResponse,
} from "@react-oauth/google";

interface PerfilGoogle {
  nome: string;
  email: string;
  foto?: string;
}

interface CadastroGooglePendente {
  token: string;
  perfil: PerfilGoogle;
}

interface RespostaApi {
  message?: string | string[];
  requer_segunda_etapa?: boolean;
  requer_complemento_cadastro?: boolean;
  access_token?: string;
  refresh_token?: string;
  token?: string;
  cadastro_token?: string;
  email_mascarado?: string;
  expira_em?: string;
  perfil_google?: PerfilGoogle;
  usuario?: {
    tipo: "user" | "admin" | "funcionario" | "superAdmin";
  };
}

interface DesafioLogin {
  token: string;
  emailMascarado: string;
  expiraEm?: string;
}

function mensagemDaResposta(resultado: RespostaApi) {
  if (Array.isArray(resultado.message)) {
    return resultado.message.join(", ");
  }

  return resultado.message || "Não foi possível concluir a solicitação.";
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

function aplicarMascaraCpf(event: React.FormEvent<HTMLInputElement>) {
  event.currentTarget.value = event.currentTarget.value
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function aplicarMascaraTelefone(event: React.FormEvent<HTMLInputElement>) {
  event.currentTarget.value = event.currentTarget.value
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d)(\d{4})$/, "$1-$2");
}

function Login() {
  const gerarTokenRecaptcha = useRecaptchaToken();
  const googleButtonContainerRef = useRef<HTMLDivElement>(null);
  const [googleButtonWidth, setGoogleButtonWidth] = useState(400);
  const [googleButtonType, setGoogleButtonType] = useState<"standard" | "icon">(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 480px)").matches
        ? "icon"
        : "standard",
  );
  const [googleButtonTheme, setGoogleButtonTheme] = useState<"outline" | "filled_blue">(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 480px)").matches
        ? "filled_blue"
        : "outline",
  );
  const [etapa, setEtapa] = useState<"credenciais" | "verificacao">(
    "credenciais",
  );
  const [splash, setSplash] = useState(true);
  const [desafio, setDesafio] = useState<DesafioLogin | null>(null);
  const [codigo, setCodigo] = useState("");
  const [usarRecuperacao, setUsarRecuperacao] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [cadastroGooglePendente, setCadastroGooglePendente] =
    useState<CadastroGooglePendente | null>(null);
  const [forcaSenhaGoogle, setForcaSenhaGoogle] = useState<
    "" | "Fraca" | "Media" | "Forte"
  >("");
  const [segundosReenvio, setSegundosReenvio] = useState(0);
  const [feedback, setFeedback] = useState({
    aberto: false,
    tipo: "erro" as "erro" | "sucesso",
    mensagem: "",
  });

  const navigate = useNavigate();
  const {
    biometriaPendente,
    entrarComBiometria,
    iniciarSessao,
    situacao: situacaoAutenticacao,
    usuario: usuarioAutenticado,
  } = useAutenticacao();

  const carregar = situacaoAutenticacao === "carregando";

  async function tentarBiometria() {
    try {
      await entrarComBiometria();
    } catch (erro) {
      mostrarErro(erro);
    }
  }

  useEffect(() => {
    const container = googleButtonContainerRef.current;
    if (!container) return;

    const atualizarLargura = () => {
      setGoogleButtonWidth(Math.min(400, Math.floor(container.clientWidth)));
    };

    atualizarLargura();

    const observer = new ResizeObserver(atualizarLargura);
    observer.observe(container);

    return () => observer.disconnect();

  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 480px)");
    const atualizarTipoBotao = () => {
      setGoogleButtonType(mediaQuery.matches ? "icon" : "standard");
      setGoogleButtonTheme(mediaQuery.matches ? "filled_blue" : "outline");
    };

    atualizarTipoBotao();
    mediaQuery.addEventListener("change", atualizarTipoBotao);

    return () => mediaQuery.removeEventListener("change", atualizarTipoBotao);
  }, []);

  useEffect(() => {
    if (segundosReenvio <= 0) return;

    const temporizador = window.setInterval(() => {
      setSegundosReenvio((segundos) => Math.max(0, segundos - 1));
    }, 1000);

    return () => window.clearInterval(temporizador);
  }, [segundosReenvio]);

  async function lerResposta(resposta: Response) {
    const resultado = (await resposta.json()) as RespostaApi;

    if (!resposta.ok) {
      throw new Error(mensagemDaResposta(resultado));
    }

    return resultado;
  }

  async function concluirAcesso(resultado: RespostaApi) {
    if (!resultado.access_token || !resultado.usuario) {
      throw new Error("A resposta de autenticação está incompleta.");
    }

    // Na web o refresh token está no cookie; no APK ele vem no corpo da resposta.
    await iniciarSessao(
      {
        access_token: resultado.access_token,
        refresh_token: resultado.refresh_token,
      },
      resultado.usuario,
    );

    if (resultado.usuario.tipo === "user") {
      navigate("/sectors");
    } else {
      navigate("/home");
    }
  }

  function mostrarErro(erro: unknown) {
    setFeedback({
      aberto: true,
      tipo: "erro",
      mensagem:
        erro instanceof Error
          ? erro.message
          : "Não foi possível conectar com o servidor.",
    });
  }

  function verificarForcaSenhaGoogle(
    evento: React.ChangeEvent<HTMLInputElement>,
  ) {
    const senha = evento.target.value;
    const temMinuscula = /[a-z]/.test(senha);
    const temMaiuscula = /[A-Z]/.test(senha);
    const temNumero = /[0-9]/.test(senha);
    const temEspecial = /[^0-9A-Za-z\s]/.test(senha);
    const temTamanhoMinimo = senha.length >= 8;

    if (senha === "") {
      setForcaSenhaGoogle("");
      return;
    }

    if (
      temTamanhoMinimo &&
      temMinuscula &&
      temMaiuscula &&
      temNumero &&
      temEspecial
    ) {
      setForcaSenhaGoogle("Forte");
      return;
    }

    if (temTamanhoMinimo && temMinuscula && temMaiuscula && temNumero) {
      setForcaSenhaGoogle("Media");
      return;
    }

    setForcaSenhaGoogle("Fraca");
  }

  function fecharCadastroGoogle() {
    setCadastroGooglePendente(null);
    setForcaSenhaGoogle("");
  }

  async function concluirCadastroGoogle(
    event: React.SubmitEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!cadastroGooglePendente) return;

    const formulario = new FormData(event.currentTarget);
    setCarregando(true);

    try {
      const resposta = await requisicaoPublica("/auth/google/cadastro", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cadastroToken: cadastroGooglePendente.token,
          nome: formulario.get("nome"),
          dataNascimento: formulario.get("dataNascimento"),
          cpf: formulario.get("cpf"),
          numeroTelefone: formulario.get("numeroTelefone"),
          email: cadastroGooglePendente.perfil.email,
          senha: formulario.get("senha"),
          confirmarSenha: formulario.get("confirmarSenha"),
        }),
      });
      const resultado = await lerResposta(resposta);

      fecharCadastroGoogle();
      await concluirAcesso(resultado);
    } catch (erro) {
      mostrarErro(erro);
    } finally {
      setCarregando(false);
    }
  }

  async function processarResultadoLogin(resultado: RespostaApi) {
    if (resultado.requer_complemento_cadastro) {
      if (!resultado.cadastro_token || !resultado.perfil_google) {
        throw new Error("Não foi possível iniciar o cadastro com Google.");
      }

      setCadastroGooglePendente({
        token: resultado.cadastro_token,
        perfil: resultado.perfil_google,
      });
      return;
    }

    if (resultado.requer_segunda_etapa) {
      if (!resultado.token || !resultado.email_mascarado) {
        throw new Error("Não foi possível iniciar a segunda etapa.");
      }

      setDesafio({
        token: resultado.token,
        emailMascarado: resultado.email_mascarado,
        expiraEm: resultado.expira_em,
      });
      setCodigo("");
      setUsarRecuperacao(false);
      setSegundosReenvio(60);
      setEtapa("verificacao");
      return;
    }

    await concluirAcesso(resultado);
  }

  async function entrar(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setCarregando(true);

    const formulario = new FormData(event.currentTarget);

    try {
      const recaptchaToken = await gerarTokenRecaptcha("login");
      const resposta = await requisicaoPublica("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formulario.get("email"),
          senha: formulario.get("senha"),
          recaptchaToken,
        }),
      });
      const resultado = await lerResposta(resposta);
      await processarResultadoLogin(resultado);
    } catch (erro) {
      mostrarErro(erro);
    } finally {
      setCarregando(false);
    }
  }

  async function confirmarSegundaEtapa(
    event: React.SubmitEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!desafio) return;

    setCarregando(true);

    try {
      const endpoint = usarRecuperacao
        ? "/auth/2fa/login/recovery"
        : "/auth/2fa/login/confirm";
      const corpo = usarRecuperacao
        ? {
            token: desafio.token,
            codigoRecuperacao: codigo,
          }
        : {
            token: desafio.token,
            codigo,
          };
      const resposta = await requisicaoPublica(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(corpo),
      });
      const resultado = await lerResposta(resposta);
      await processarResultadoLogin(resultado);
    } catch (erro) {
      mostrarErro(erro);
    } finally {
      setCarregando(false);
    }
  }

  async function reenviarCodigo() {
    if (!desafio || segundosReenvio > 0) return;

    setCarregando(true);

    try {
      const resposta = await requisicaoPublica("/auth/2fa/login/resend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: desafio.token,
        }),
      });
      const resultado = await lerResposta(resposta);

      setDesafio((atual) =>
        atual
          ? {
              ...atual,
              emailMascarado:
                resultado.email_mascarado || atual.emailMascarado,
              expiraEm: resultado.expira_em,
            }
          : atual,
      );
      setSegundosReenvio(60);
      setFeedback({
        aberto: true,
        tipo: "sucesso",
        mensagem: "Um novo código foi enviado para o seu e-mail.",
      });
    } catch (erro) {
      mostrarErro(erro);
    } finally {
      setCarregando(false);
    }
  }

  function voltarParaCredenciais() {
    setEtapa("credenciais");
    setDesafio(null);
    setCodigo("");
    setUsarRecuperacao(false);
    setSegundosReenvio(0);
  }

  function alternarTipoCodigo() {
    setUsarRecuperacao((valor) => !valor);
    setCodigo("");
  }

  async function handleSuccess(response: CredentialResponse) {
    const credential = response.credential;

    if (!credential) {
      mostrarErro(new Error("O Google não retornou uma credencial."));
      return;
    }

    setCarregando(true);

    try {
      const resposta = await requisicaoPublica("/auth/google", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          credential,
        }),
      });

      const resultado = await lerResposta(resposta);

      await processarResultadoLogin(resultado);
    } catch (erro) {
      mostrarErro(erro);
    } finally {
      setCarregando(false);
    }
  }

  function handleError() {
    setFeedback({
      aberto: true,
      tipo: "erro",
      mensagem: "Falha na autenticação do Google.",
    });
  }

  if (usuarioAutenticado) {
    // Impede que uma sessão válida volte a exibir o formulário de login.
    return (
      <Navigate
        to={usuarioAutenticado.tipo === "user" ? "/sectors" : "/home"}
        replace
      />
    );
  }

  const estiloObrigatorio: React.CSSProperties = {
      color: 'red',
  }
  const obrigatorio = <span style={estiloObrigatorio}>*</span>;

  return (
    <>
      {!carregar && <main className="login">
        <section className="login__formulario">
          <header className="login__cabecalho">
            <img src={brasao} alt="Brasão da Prefeitura" />
            <span>Prefeitura Municipal de Santa Maria de Jetibá</span>
          </header>

          <div className="login__conteudo">
            <h1>
              {etapa === "credenciais"
                ? "Bem-vindo de volta"
                : "Verifique seu acesso"}
            </h1>
            <p>
              {etapa === "credenciais"
                ? "Informe seus dados para entrar"
                : usarRecuperacao
                  ? "Informe um dos seus códigos de recuperação"
                  : `Enviamos um código para ${desafio?.emailMascarado || "seu e-mail"}`}
            </p>

            {etapa === "credenciais" ? (
              <>
                {biometriaPendente && (
                  <button
                    className="login__botao"
                    type="button"
                    disabled={carregando}
                    onClick={tentarBiometria}
                  >
                    Tentar novamente com biometria
                  </button>
                )}

                <form onSubmit={entrar}>
                  <div className="campo">
                    <label htmlFor="email">E-mail</label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Digite seu e-mail"
                      autoComplete="email"
                      required
                    />
                  </div>

                  <div className="campo">
                    <label htmlFor="senha">Senha</label>
                    <input
                      id="senha"
                      name="senha"
                      type="password"
                      placeholder="Digite sua senha"
                      autoComplete="current-password"
                      required
                    />
                  </div>

                  <div className="login__opcoes">
                    <label className="lembrar">
                      <input type="checkbox" name="lembrar" />
                      Lembrar de mim
                    </label>
                    <Link to="/recuperar-senha">Esqueci minha senha</Link>
                  </div>

                  <button
                    className="login__botao"
                    type="submit"
                    disabled={carregando}
                  >
                    {carregando ? "Entrando..." : "Entrar"}
                  </button>
                </form>

                <div className="login__google">
                  <p>Ou continue com</p>
                  <div
                    className="login__google-botao"
                    ref={googleButtonContainerRef}
                  >
                    <GoogleLogin
                      key={`${googleButtonType}-${googleButtonWidth}-${googleButtonTheme}`}
                      onSuccess={handleSuccess}
                      onError={handleError}
                      text="signin_with"
                      type={googleButtonType}
                      theme={googleButtonTheme}
                      shape="rectangular"
                      use_fedcm_for_button
                      width={
                        googleButtonType === "standard"
                          ? googleButtonWidth
                          : undefined
                      }
                    />
                  </div>
                </div>

                <p className="login__cadastro">
                  Ainda não possui conta? <Link to="/cadastro">Cadastre-se</Link>
                </p>
              </>
            ) : (
              <form className="login-2fa" onSubmit={confirmarSegundaEtapa}>
                <div className="login-2fa__aviso" aria-live="polite">
                  <strong>
                    {usarRecuperacao ? "Código de recuperação" : "Código por e-mail"}
                  </strong>
                  <span>
                    {usarRecuperacao
                      ? "Cada código funciona uma única vez."
                      : "O código possui 6 dígitos e expira em 5 minutos."}
                  </span>
                </div>

                <div className="campo">
                  <label htmlFor="codigo-2fa">
                    {usarRecuperacao
                      ? "Código de recuperação"
                      : "Código de verificação"}
                  </label>
                  <input
                    id="codigo-2fa"
                    name="codigo"
                    type="text"
                    inputMode={usarRecuperacao ? "text" : "numeric"}
                    autoComplete="one-time-code"
                    placeholder={usarRecuperacao ? "ABCD-EFGH" : "000000"}
                    value={codigo}
                    onChange={(evento) =>
                      setCodigo(
                        usarRecuperacao
                          ? formatarCodigoRecuperacao(evento.target.value)
                          : evento.target.value.replace(/\D/g, "").slice(0, 6),
                      )
                    }
                    minLength={usarRecuperacao ? 9 : 6}
                    maxLength={usarRecuperacao ? 9 : 6}
                    required
                    autoFocus
                  />
                </div>

                <button
                  className="login__botao"
                  type="submit"
                  disabled={carregando}
                >
                  {carregando ? "Verificando..." : "Verificar e entrar"}
                </button>

                <div className="login-2fa__acoes">
                  {!usarRecuperacao && (
                    <button
                      type="button"
                      onClick={reenviarCodigo}
                      disabled={carregando || segundosReenvio > 0}
                    >
                      {segundosReenvio > 0
                        ? `Reenviar em ${segundosReenvio}s`
                        : "Reenviar código"}
                    </button>
                  )}
                  <button type="button" onClick={alternarTipoCodigo}>
                    {usarRecuperacao
                      ? "Usar código enviado por e-mail"
                      : "Usar código de recuperação"}
                  </button>
                  <button type="button" onClick={voltarParaCredenciais}>
                    Voltar ao login
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>

        <section className="login__ilustracao">
          <img
            src={imagemLogin}
            alt="Ilustração de comunicação e atendimento"
          />
        </section>

        <ModalCadastroGoogle
          aberto={cadastroGooglePendente !== null}
          aoFechar={fecharCadastroGoogle}
        >
          <form
            className="modal-cadastro-google__formulario"
            method="POST"
            onSubmit={concluirCadastroGoogle}
          >
          <header className="modal-cadastro-google__cabecalho">
            <div className="modal-cadastro-google__titulo">
              <span className="modal-cadastro-google__icone" aria-hidden="true">
                <svg width="16" height="16" fill="currentColor" className="bi bi-clipboard-plus" viewBox="0 0 16 16">
                  <path fillRule="evenodd" d="M8 7a.5.5 0 0 1 .5.5V9H10a.5.5 0 0 1 0 1H8.5v1.5a.5.5 0 0 1-1 0V10H6a.5.5 0 0 1 0-1h1.5V7.5A.5.5 0 0 1 8 7"/>
                  <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1z"/>
                  <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0z"/>
                </svg>
              </span>

              <div>
                <span className="modal-cadastro-google__etapa">
                  COMPLETE O CADASTRO
                </span>
                <h2 id="modal-cadastro-google-titulo">Cadastro</h2>
                <p>Termine o  cadastro para acessar o sistema</p>
              </div>
            </div>
          </header>

          <div className="modal-cadastro-google__conteudo">
              <div>
                <label htmlFor="cadastroGoogleNome">
                  Nome Completo 
                  <span>{obrigatorio}</span>
                </label>

                <input
                  id="cadastroGoogleNome"
                  placeholder="Digite seu nome completo"
                  autoComplete="additional-name"
                  required
                  type="text"
                  name="nome"
                  defaultValue={cadastroGooglePendente?.perfil.nome}
                />
              </div>

              <div>
                <label htmlFor="cadastroGoogleDataNascimento">
                  Data de nascimento 
                  <span>{obrigatorio}</span>
                </label>

                <input id="cadastroGoogleDataNascimento" required type="date" name="dataNascimento" />
              </div>

              <div>
                <label htmlFor="cadastroGoogleCpf">
                  CPF
                  <span>{obrigatorio}</span>
                </label>

                <input id="cadastroGoogleCpf" inputMode="numeric" onInput={aplicarMascaraCpf} placeholder="Ex: 999.999.999-99" autoComplete="off" maxLength={14} required type="text" name="cpf" />
              </div>

              <div>
                <label htmlFor="cadastroGoogleNumeroTelefone">
                  Telefone
                  <span>{obrigatorio}</span> 
                </label>

                <input id="cadastroGoogleNumeroTelefone" inputMode="tel" onInput={aplicarMascaraTelefone} autoComplete="tel" placeholder="Ex: (27) 99999-9999" maxLength={15} required type="tel" name="numeroTelefone" />
              </div>

              <div>
                <label htmlFor="cadastroGoogleEmail">
                  E-mail
                  <span>{obrigatorio}</span>
                </label>

                <input
                  id="cadastroGoogleEmail"
                  placeholder="Digite seu e-mail"
                  autoComplete="email"
                  required
                  readOnly
                  type="email"
                  name="email"
                  value={cadastroGooglePendente?.perfil.email ?? ""}
                />
              </div>

              <div>
                <label htmlFor="cadastroGoogleSenha">
                  Senha
                  <span>{obrigatorio}</span>
                </label>

                <input id="cadastroGoogleSenha" placeholder="Digite sua senha" autoComplete="new-password" required minLength={8} type="password" name="senha" onChange={verificarForcaSenhaGoogle}/>
              </div>

              <div>
                <label htmlFor="cadastroGoogleConfirmarSenha">
                  Confirmar senha
                  <span>{obrigatorio}</span>
                </label>

                <input id="cadastroGoogleConfirmarSenha" placeholder="Confirme sua senha" autoComplete="new-password" required minLength={8} type="password" name="confirmarSenha"/>
              </div>

              {forcaSenhaGoogle && (
                <div className="container-forca-senha modal-cadastro-google__forca-senha">
                  <p>
                    Força da senha:
                    <span className={`senha-${forcaSenhaGoogle}`}>
                      {" "}
                      {forcaSenhaGoogle === "Media" ? "Média" : forcaSenhaGoogle}
                    </span>
                  </p>
                  <div className={`barra-progressiva-${forcaSenhaGoogle} barra-progressiva`}></div>
                </div>
              )}
          </div>

          <footer className="modal-cadastro-google__rodape">
            <div className="modal-cadastro-google__resumo">
              <span
                className="modal-cadastro-google__icon"
                aria-live="polite"
              >
                <svg width="16" height="16" fill="currentColor" className="bi bi-exclamation-diamond-fill" viewBox="0 0 16 16">
                  <path d="M9.05.435c-.58-.58-1.52-.58-2.1 0L.436 6.95c-.58.58-.58 1.519 0 2.098l6.516 6.516c.58.58 1.519.58 2.098 0l6.516-6.516c.58-.58.58-1.519 0-2.098zM8 4c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995A.905.905 0 0 1 8 4m.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2"/>
                </svg>
                Cadastro não finalizado
              </span>
            </div>
            <button type="submit" disabled={carregando}>
              {carregando ? "Finalizando..." : "Finalizar cadastro"}
            </button>
          </footer>
          </form>
        </ModalCadastroGoogle>

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
      </main>}

      {splash && (
        <RestaurarSessao
          pronto={!carregar}
          onConcluir={() => setSplash(false)}
        />
      )}
    </>
  );
}

export default Login;
