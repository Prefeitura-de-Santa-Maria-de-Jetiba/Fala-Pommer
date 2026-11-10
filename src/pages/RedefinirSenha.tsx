// Exibe o formulário para redefinir a senha do usuário.
import { Link, useSearchParams } from "react-router";
import { ModalFeedback } from "../components/ModalFeedback";
import "./css/RedefinirSenha.css";
import React, { useState } from "react";

function RedefinirSenha() {
    const [parametros] = useSearchParams();
    const token = parametros.get("token");

    const [feedback, setFeedback] = useState({
        aberto: false,
        tipo: "erro" as "erro" | "sucesso",
        mensagem: ""
    });

    if (!token) {
        return (
            <main className="redefinir redefinir--invalido">
                <section className="redefinir__mensagem">
                    <div className="redefinir__icone-erro">!</div>

                    <h1>Link inválido</h1>

                    <p>
                        O link de recuperação não possui um token
                        válido ou está incompleto.
                    </p>

                    <Link to="/recuperar-senha">
                        Solicitar outro link
                    </Link>
                </section>
            </main>
        );
    }

    async function cadastrarNovaSenha(
        event: React.SubmitEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        const dadosFormulario = new FormData(event.currentTarget);

        const dados = {
            ...Object.fromEntries(dadosFormulario.entries()),
            token
        };

        try {
            const resposta = await fetch(
                `${import.meta.env.VITE_API_URL}/recuperacao-senha/redefinir`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(dados)
                }
            );

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
                mensagem:
                    resultado.mensagem ||
                    "Sua senha foi redefinida com sucesso."
            });
            
        } catch (erro) {
            console.error("Falha ao redefinir a senha:", erro);

            setFeedback({
                aberto: true,
                tipo: "erro",
                mensagem: "Não foi possível conectar com o servidor."
            });
        }
    }

    return (
        <main className="redefinir">
            <section className="redefinir__painel">
                <div className="redefinir__painel-conteudo">
                    <div className="redefinir__cadeado">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M17 8h-1V6a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2Zm-7-2a2 2 0 0 1 4 0v2h-4V6Zm3 9.73V18h-2v-2.27a2 2 0 1 1 2 0Z" />
                        </svg>
                    </div>

                    <h2>Proteja sua conta</h2>

                    <p>
                        Crie uma senha segura e diferente das que
                        você já utilizou.
                    </p>
                </div>
            </section>

            <section className="redefinir__formulario">
                <div className="redefinir__conteudo">
                    <Link className="voltar" to="/">
                        <span aria-hidden="true">←</span>
                        Voltar para o login
                    </Link>

                    <h1>Crie uma nova senha</h1>

                    <p className="redefinir__descricao">
                        Informe e confirme sua nova senha para recuperar
                        o acesso à sua conta.
                    </p>

                    <form method="POST" onSubmit={cadastrarNovaSenha}>
                        <div className="redefinir__campo">
                            <label htmlFor="novaSenha">
                                Nova senha
                                <span className="obrigatorio">*</span>
                            </label>

                            <input
                                id="novaSenha"
                                name="novaSenha"
                                type="password"
                                placeholder="Digite sua nova senha"
                                autoComplete="new-password"
                                minLength={8}
                                required
                            />

                            <small>
                                Use pelo menos 8 caracteres, incluindo
                                letras, números e símbolo.
                            </small>
                        </div>

                        <div className="redefinir__campo">
                            <label htmlFor="confirmarNovaSenha">
                                Confirmar nova senha
                                <span className="obrigatorio">*</span>
                            </label>

                            <input
                                id="confirmarNovaSenha"
                                name="confirmarNovaSenha"
                                type="password"
                                placeholder="Confirme sua nova senha"
                                autoComplete="new-password"
                                minLength={8}
                                required
                            />
                        </div>

                        <button
                            className="redefinir__botao"
                            type="submit"
                        >
                            Redefinir senha
                        </button>
                    </form>
                </div>
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

export default RedefinirSenha;
