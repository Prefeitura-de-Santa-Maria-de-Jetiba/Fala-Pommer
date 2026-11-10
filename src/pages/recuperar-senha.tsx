// Exibe o formulário para solicitar a recuperação de senha.
import { useState } from "react";
import { Link } from "react-router";
import imagemRecuperacao from "../assets/img/imagem-recuperar-senha.png";
import { ModalFeedback } from "../components/ModalFeedback";
import { useRecaptchaToken } from "../hooks/useRecaptchaToken";
import "./css/RecuperarSenha.css";

function RecuperarSenha() {
  const gerarTokenRecaptcha = useRecaptchaToken();
  const [carregando, setCarregando] = useState(false);

  const [feedback, setFeedback] = useState({
    aberto: false,
    tipo: "sucesso" as "erro" | "sucesso",
    mensagem: "",
  });

  async function solicitarRecuperacao(
    event: React.SubmitEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const elementoFormulario = event.currentTarget;
    const formulario = new FormData(elementoFormulario);
    const email = String(formulario.get("email") ?? "");

    setCarregando(true);

    try {
      const recaptchaToken = await gerarTokenRecaptcha("recuperar_senha");
      const resposta = await fetch(
        `${import.meta.env.VITE_API_URL}/recuperacao-senha/solicitar`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            recaptchaToken,
          }),
        },
      );

      const resultado = await resposta.json();

      if (!resposta.ok) {
        const mensagem = Array.isArray(resultado.message)
          ? resultado.message.join(", ")
          : resultado.message;

        setFeedback({
          aberto: true,
          tipo: "erro",
          mensagem:
            mensagem || "Não foi possível solicitar a recuperação.",
        });

        return;
      }

      setFeedback({
        aberto: true,
        tipo: "sucesso",
        mensagem: resultado.mensagem,
      });

      elementoFormulario.reset();
    } catch (erro) {
      console.error("Erro ao solicitar recuperação:", erro);

      setFeedback({
        aberto: true,
        tipo: "erro",
        mensagem:
          erro instanceof Error
            ? erro.message
            : "Não foi possível conectar com o servidor.",
      });
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="recuperacao">
      <section
        className="recuperacao__ilustracao"
        aria-label="Ilustração de recuperação de senha"
      >
        <img
          src={imagemRecuperacao}
          alt="Pessoa recebendo um e-mail seguro para recuperar a senha"
        />
      </section>

      <section className="recuperacao__formulario">
        <div className="recuperacao__conteudo">
          <Link className="voltar" to="/">
            <span aria-hidden="true">←</span>
            Voltar para o login
          </Link>

          <h1>Recuperar senha</h1>

          <p>
            Informe o e-mail cadastrado. Enviaremos um link para você
            redefinir sua senha.
          </p>

          <form onSubmit={solicitarRecuperacao}>
            <div className="recuperacao__campo">
              <label htmlFor="email">E-mail</label>

              <div className="recuperacao__input">
                <svg aria-hidden="true" viewBox="0 0 24 24">
                  <path d="M3 5h18v14H3V5Zm2 2v.4l7 4.7 7-4.7V7H5Zm14 10V9.8l-7 4.7-7-4.7V17h14Z" />
                </svg>

                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Digite seu e-mail"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <button
              className="recuperacao__botao"
              type="submit"
              disabled={carregando}
              aria-busy={carregando}
            >
              {carregando
                ? "Enviando..."
                : "Enviar link de recuperação"}
            </button>
          </form>

          <p className="recuperacao__entrar">
            Lembrou sua senha? <Link to="/">Entrar</Link>
          </p>
        </div>
      </section>

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
    </main>
  );
}

export default RecuperarSenha;
