// Informa quando o usuário não possui acesso à página.
import brasao from "../assets/img/brasao.webp";
import "./SemPermissao.css";
import { Link, useNavigate } from "react-router";

function SemPermissao() {
    const navigate = useNavigate();

    return (
        <main className="sem-permissao">

            <header className="sem-permissao__header">
                <div className="sem-permissao__marca">
                    <img
                        src={brasao}
                        alt="Brasão da Prefeitura"
                    />

                    <span>Fala Pommer</span>
                </div>
            </header>

            <section className="sem-permissao__conteudo">

                <div
                    className="sem-permissao__icone"
                    aria-hidden="true"
                >
                    <svg
                        viewBox="0 0 240 240"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <circle
                            cx="120"
                            cy="115"
                            r="105"
                            fill="#e7f0ff"
                        />

                        {/* Escudo */}
                        <path
                            d="
                                M120 35
                                L190 65
                                V115
                                C190 165 160 198 120 215
                                C80 198 50 165 50 115
                                V65
                                Z
                            "
                            fill="#f7faff"
                            stroke="#1351B4"
                            strokeWidth="10"
                            strokeLinejoin="round"
                        />

                        {/* Parte interna */}
                        <path
                            d="
                                M120 55
                                L170 76
                                V115
                                C170 150 151 175 120 191
                                C89 175 70 150 70 115
                                V76
                                Z
                            "
                            fill="#dceaff"
                        />

                        {/* Arco do cadeado */}
                        <path
                            d="
                                M95 130
                                V108
                                C95 93 105 82 120 82
                                C135 82 145 93 145 108
                                V130
                            "
                            fill="none"
                            stroke="#0c3e8a"
                            strokeWidth="11"
                            strokeLinecap="round"
                        />

                        {/* Cadeado */}
                        <rect
                            x="82"
                            y="122"
                            width="76"
                            height="68"
                            rx="12"
                            fill="#1351B4"
                        />

                        {/* Buraco da chave */}
                        <circle
                            cx="120"
                            cy="148"
                            r="9"
                            fill="white"
                        />

                        <rect
                            x="116"
                            y="153"
                            width="8"
                            height="18"
                            rx="4"
                            fill="white"
                        />
                    </svg>
                </div>

                <span className="sem-permissao__codigo">
                    ERRO 403
                </span>

                <h1>Acesso restrito</h1>

                <p className="sem-permissao__descricao">
                    Você não tem permissão para acessar esta área.
                </p>

                <p className="sem-permissao__ajuda">
                    Se acredita que isso é um engano, entre em contato
                    com o administrador do sistema.
                </p>

                <div className="sem-permissao__acoes">

                    <button
                        type="button"
                        className="sem-permissao__voltar"
                        onClick={() => navigate(-1)}
                    >
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 16 16"
                            fill="currentColor"
                        >
                            <path
                                fillRule="evenodd"
                                d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8"
                            />
                        </svg>

                        Voltar para o Fala Pommer
                    </button>

                    <Link
                        to="/home"
                        className="sem-permissao__inicio"
                    >
                        Ir para a página inicial
                    </Link>

                </div>

            </section>

        </main>
    );
}

export default SemPermissao;
