import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { apiFetch } from "../services/api";
import type { Comunidade } from "../components/home/Comunidades";
import "./css/convite-comunidade.css";

function ConviteComunidade() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState("");

    async function entrarNaComunidade() {
        if (!token || carregando) return;

        setCarregando(true);
        setErro("");

        try {
            const resposta = await apiFetch(
                `/comunidades/convites/${token}/aceitar`,
                { method: "POST" },
            );
            const dados = await resposta.json();

            if (!resposta.ok) {
                throw new Error(
                    Array.isArray(dados.message)
                        ? dados.message.join(", ")
                        : dados.message ?? "Não foi possível aceitar o convite.",
                );
            }

            navigate("/home", {
                replace: true,
                state: { comunidade: dados as Comunidade },
            });
        } catch (causa) {
            setErro(
                causa instanceof Error
                    ? causa.message
                    : "Não foi possível aceitar o convite.",
            );
        } finally {
            setCarregando(false);
        }
    }

    return (
        <main className="convite-comunidade">
            <section className="convite-comunidade__cartao">
                <div className="convite-comunidade__icone" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                        <path d="M7 12.5 10 15.5 17 8.5" />
                    </svg>
                </div>
                <h1>Você recebeu um convite</h1>
                <p>
                    Entre na comunidade para conversar e acompanhar as novidades.
                </p>
                <button
                    type="button"
                    onClick={() => void entrarNaComunidade()}
                    disabled={!token || carregando}
                >
                    {carregando ? "Entrando…" : "Entrar na comunidade"}
                </button>
                {erro && <p className="convite-comunidade__erro" role="alert">{erro}</p>}
            </section>
        </main>
    );
}

export default ConviteComunidade;
