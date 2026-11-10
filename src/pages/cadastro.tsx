// Exibe o formulário de cadastro de usuário.
import React, { useState } from "react";
import imagemCadastro from "../assets/img/imagem-pagina-cadastro.png";
import { ModalFeedback } from "../components/ModalFeedback";
import { Link } from "react-router";
import { useRecaptchaToken } from "../hooks/useRecaptchaToken";

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

function Cadastro() {
    const gerarTokenRecaptcha = useRecaptchaToken();

    const [feedback, setFeedback] = useState({
        aberto: false,
        tipo: "erro" as "erro" | "sucesso",
        mensagem: ""
    });

    async function cadastrar(
    event: React.SubmitEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        const formulario = event.currentTarget;
        const dadosFormulario = new FormData(formulario);

        const dados = Object.fromEntries(dadosFormulario.entries());

        try {
            const recaptchaToken = await gerarTokenRecaptcha("cadastro");
            const resposta = await fetch(`${import.meta.env.VITE_API_URL}/usuarios`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...dados,
                    recaptchaToken,
                }),
            });

            const resultado = await resposta.json();

            if (!resposta.ok) {
                setFeedback({
                    aberto: true,
                    tipo: "erro",
                    mensagem: Array.isArray(resultado.message)
                        ? resultado.message.join(", ")
                        : resultado.message
                });

                return;
            }

            setFeedback({
                aberto: true,
                tipo: "sucesso",
                mensagem: "Seu cadastro foi realizado com sucesso."
            });

            formulario.reset();
            setForcaSenha("");

            console.log(resultado.mensagem);
        } catch (erro) {
            console.error("Falha ao enviar o cadastro:", erro);

            setFeedback({
                aberto: true,
                tipo: "erro",
                mensagem: erro instanceof Error
                    ? erro.message
                    : "Não foi possível conectar com o servidor."
            });
        }
    }

    const estiloObrigatorio: React.CSSProperties = {
        color: 'red',
    }
    const obrigatorio = <span style={estiloObrigatorio}>*</span>;


    const [forcaSenha, setForcaSenha] = useState<
        "" | "Fraca" | "Media" | "Forte"
    >("");

    function verificarForcaSenha(
        evento: React.ChangeEvent<HTMLInputElement>
    ) {
        const senha = evento.target.value

        const temMinuscula = /[a-z]/.test(senha);
        const temMaiuscula = /[A-Z]/.test(senha);
        const temNumero = /[0-9]/.test(senha);
        const temEspecial = /[^0-9A-Za-z\s]/.test(senha);
        const temTamanhoMinimo = senha.length >= 8;

        if (senha === "") {
            setForcaSenha("");
            return;
        }

        if (
            temTamanhoMinimo &&
            temMinuscula &&
            temMaiuscula &&
            temNumero &&
            temEspecial
        ) {
            setForcaSenha("Forte");
            return;
        }

        if (
            temTamanhoMinimo &&
            temMinuscula &&
            temMaiuscula &&
            temNumero
        ) {
            setForcaSenha("Media");
            return;
        }

        setForcaSenha("Fraca");
    }

    return (
        <main className="cadastro">
            <section className="cadastro__ilustracao">
                <img
                  src={imagemCadastro}
                  alt="Ilustração de comunicação e atendimento"
                />
              </section>

              <section className="cadastro__formulario">

                <section className="cadastro__conteudo">
                    <Link
                        className="voltar"
                        to="/"
                    >
                        <span aria-hidden="true">←</span>
                        Voltar para o login
                    </Link>

                    <h1>Bem-vindo ao Fala Pommer</h1>
                    <p>Preencha os dados para concluir o cadastro</p>
                    <form method="POST" onSubmit={cadastrar}>
                        <div className="campo">
                            <label htmlFor="nome">Nome completo{obrigatorio}</label>
                            <input
                                id="nome"
                                name="nome"
                                type="text"
                                placeholder="Digite seu nome completo"
                                autoComplete="additional-name"
                                required
                            />
                        </div>
                        <div className="campo">
                            <label htmlFor="dataNascimento">Data de nascimento{obrigatorio}</label>
                            <input
                                id="dataNascimento"
                                name="dataNascimento"
                                type="date"
                                required
                            />
                        </div>
                        <div className="campo">
                            <label htmlFor="cpf">CPF{obrigatorio}</label>
                            <input
                                id="cpf"
                                name="cpf"
                                type="text"
                                inputMode="numeric"
                                onInput={aplicarMascaraCpf}
                                placeholder="Ex: 999.999.999-99"
                                autoComplete="off"
                                maxLength={14}
                                required
                            />
                        </div>
                        <div className="campo">
                            <label htmlFor="numeroTelefone">Telefone{obrigatorio}</label>
                    
                            <input
                                id="numeroTelefone"
                                name="numeroTelefone"
                                type="tel"
                                inputMode="tel"
                                onInput={aplicarMascaraTelefone}
                                autoComplete="tel"
                                placeholder="Ex: (27) 99999-9999"
                                maxLength={15}
                                required
                            />
                        </div>
                        <div className="campo">
                            <label htmlFor="email">E-mail{obrigatorio}</label>
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
                            <label htmlFor="senha">Senha{obrigatorio}</label>
                            <input
                                id="senha"
                                name="senha"
                                type="password"
                                placeholder="Digite sua senha"
                                autoComplete="new-password"
                                required
                                minLength={8}
                                onChange={verificarForcaSenha}
                            />
                        </div>
                        <div className="campo">
                            <label htmlFor="confirmarSenha">Confirmar senha{obrigatorio}</label>
                            <input
                                id="confirmarSenha"
                                name="confirmarSenha"
                                type="password"
                                placeholder="Confirme sua senha"
                                autoComplete="new-password"
                                required
                                minLength={8}
                            />
                        </div>

                        {forcaSenha && (
                            <div className="container-forca-senha">
                                <p>
                                    Força da senha:
                                    <span className={`senha-${forcaSenha}`}>
                                        {" "}
                                        {forcaSenha === "Media" ? "Média" : forcaSenha}
                                    </span>
                                </p>
                                <div className={`barra-progressiva-${forcaSenha} barra-progressiva`}></div>
                            </div>
                        )}

                        <button className="cadastro__botao" type="submit">
                            Cadastrar
                        </button>
                    </form>
                </section>
              </section>

              <ModalFeedback
                    aberto={feedback.aberto}
                    tipo={feedback.tipo}
                    mensagem={feedback.mensagem}
                    aoFechar={() => {
                        setFeedback((estadoAtual) => ({
                            ...estadoAtual,
                            aberto: false
                        }));
                    }}
                />
        </main>
    );
}

export default Cadastro;
