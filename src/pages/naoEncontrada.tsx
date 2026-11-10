import { Link, useLocation, useNavigate } from "react-router";
import brasao from "../assets/img/brasao.webp";
import "./css/naoEncontrada.css";

function NaoEncontrada() {
    const navigate = useNavigate();
    const localizacao = useLocation();

    function voltarPaginaAnterior() {
        if (window.history.length > 1) {
            navigate(-1);
            return;
        }

        navigate("/");
    }

    return (
        <main
            className="nao-encontrada"
            aria-labelledby="nao-encontrada-titulo"
        >
            <header className="nao-encontrada__header">
                <Link
                    to="/"
                    className="nao-encontrada__marca"
                    aria-label="Ir para o início do Fala Pommer"
                >
                    <img
                        src={brasao}
                        alt=""
                        aria-hidden="true"
                    />

                    <span>Fala Pommer</span>
                </Link>

                <span className="nao-encontrada__status">
                    Página não encontrada
                </span>
            </header>

            <section className="nao-encontrada__conteudo">
                <div
                    className="nao-encontrada__decoracao"
                    aria-hidden="true"
                >
                    <span className="nao-encontrada__forma nao-encontrada__forma--rosa" />
                    <span className="nao-encontrada__forma nao-encontrada__forma--amarela" />
                    <span className="nao-encontrada__forma nao-encontrada__forma--verde" />
                </div>

                <div className="nao-encontrada__texto">
                    <span className="nao-encontrada__etiqueta">
                        Erro 404
                    </span>

                    <h1 id="nao-encontrada-titulo">
                        Parece que esta página saiu para conversar.
                    </h1>

                    <p className="nao-encontrada__descricao">
                        O endereço informado não existe, foi alterado ou
                        não está mais disponível.
                    </p>

                    <p className="nao-encontrada__caminho">
                        <span>Endereço procurado:</span>
                        <code>{localizacao.pathname}</code>
                    </p>

                    <nav
                        className="nao-encontrada__acoes"
                        aria-label="Opções para continuar navegando"
                    >
                        <button
                            type="button"
                            className="nao-encontrada__botao nao-encontrada__botao--principal"
                            onClick={voltarPaginaAnterior}
                        >
                            <svg
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                            >
                                <path
                                    d="M19 12H5m6-6-6 6 6 6"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>

                            Voltar à página anterior
                        </button>

                        <Link
                            to="/"
                            className="nao-encontrada__botao nao-encontrada__botao--secundario"
                        >
                            Ir para o início
                        </Link>
                    </nav>
                </div>

                <div
                    className="nao-encontrada__ilustracao"
                    aria-hidden="true"
                >
                    <div className="nao-encontrada__numero">
                        <span>4</span>

                        <div className="nao-encontrada__lupa">
                            <svg viewBox="0 0 160 160">
                                <circle
                                    cx="68"
                                    cy="68"
                                    r="48"
                                    fill="currentColor"
                                    fillOpacity="0.08"
                                    stroke="currentColor"
                                    strokeWidth="10"
                                />

                                <path
                                    d="M104 104 142 142"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="14"
                                    strokeLinecap="round"
                                />

                                <path
                                    d="M48 70c8-13 27-18 41-8"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="7"
                                    strokeLinecap="round"
                                />
                            </svg>
                        </div>

                        <span>4</span>
                    </div>

                    <div className="nao-encontrada__balao nao-encontrada__balao--um">
                        <span />
                        <span />
                        <span />
                    </div>

                    <div className="nao-encontrada__balao nao-encontrada__balao--dois">
                        <svg viewBox="0 0 24 24">
                            <path
                                d="m12 3 .8 5.2L17 6l-2.2 4.2L20 11l-5.2.8L17 16l-4.2-2.2L12 19l-.8-5.2L7 16l2.2-4.2L4 11l5.2-.8L7 6l4.2 2.2L12 3Z"
                                fill="currentColor"
                            />
                        </svg>
                    </div>

                    <svg
                        className="nao-encontrada__trilha"
                        viewBox="0 0 420 230"
                        preserveAspectRatio="none"
                    >
                        <path
                            d="M15 190C80 80 135 220 205 115S330 40 405 70"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeDasharray="2 14"
                        />
                    </svg>
                </div>
            </section>
        </main>
    );
}

export default NaoEncontrada;
