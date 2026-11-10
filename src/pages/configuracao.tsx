// Organiza as opções disponíveis na área de configurações.
import { useState, type ReactNode, useEffect } from "react";
import { Link } from "react-router";
import brasao from "../assets/img/brasao.webp";
import MeuPerfil from "./configPages/meu-perfil";
import ContaSeguranca from "./configPages/conta-seguranca";
import Aparencia from "./configPages/aparencia";
import Acessibilidade from "./configPages/acessibilidade";
import PrivacidadeDados from "./configPages/privacidade-dados";
import { apiFetch } from "../services/api";
import { useAutenticacao } from "../components/AutenticacaoContext";
import "./css/configuracao.css";

type ItemMenu = {
    id: string;
    label: string;
    icon: ReactNode;
};

interface Perfil {
    nome: string;
    tipo_usuario: "user" | "admin" | "funcionario" | "superAdmin";
    foto_perfil_url: string | null;
}

const itensMenu: ItemMenu[] = [
    {
        id: "meu-perfil",
        label: "Meu Perfil",
        icon: (
            <svg width="16" height="16" fill="currentColor" className="bi bi-person-circle" viewBox="0 0 16 16">
                <path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0"/>
                <path fillRule="evenodd" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1"/>
            </svg>
        ),
    },
    {
        id: "aparencia",
        label: "Aparência",
        icon: (
            <svg width="16" height="16" fill="currentColor" className="bi bi-palette" viewBox="0 0 16 16">
                <path d="M8 5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3m4 3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3M5.5 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m.5 6a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3"/>
                <path d="M16 8c0 3.15-1.866 2.585-3.567 2.07C11.42 9.763 10.465 9.473 10 10c-.603.683-.475 1.819-.351 2.92C9.826 14.495 9.996 16 8 16a8 8 0 1 1 8-8m-8 7c.611 0 .654-.171.655-.176.078-.146.124-.464.07-1.119-.014-.168-.037-.37-.061-.591-.052-.464-.112-1.005-.118-1.462-.01-.707.083-1.61.704-2.314.369-.417.845-.578 1.272-.618.404-.038.812.026 1.16.104.343.077.702.186 1.025.284l.028.008c.346.105.658.199.953.266.653.148.904.083.991.024C14.717 9.38 15 9.161 15 8a7 7 0 1 0-7 7"/>
            </svg>
        ),
    },
    {
        id: "conta-seguranca",
        label: "Conta e segurança",
        icon: (
            <svg width="16" height="16" fill="currentColor" className="bi bi-shield-lock" viewBox="0 0 16 16">
                <path d="M5.338 1.59a61 61 0 0 0-2.837.856.48.48 0 0 0-.328.39c-.554 4.157.726 7.19 2.253 9.188a10.7 10.7 0 0 0 2.287 2.233c.346.244.652.42.893.533q.18.085.293.118a1 1 0 0 0 .101.025 1 1 0 0 0 .1-.025q.114-.034.294-.118c.24-.113.547-.29.893-.533a10.7 10.7 0 0 0 2.287-2.233c1.527-1.997 2.807-5.031 2.253-9.188a.48.48 0 0 0-.328-.39c-.651-.213-1.75-.56-2.837-.855C9.552 1.29 8.531 1.067 8 1.067c-.53 0-1.552.223-2.662.524zM5.072.56C6.157.265 7.31 0 8 0s1.843.265 2.928.56c1.11.3 2.229.655 2.887.87a1.54 1.54 0 0 1 1.044 1.262c.596 4.477-.787 7.795-2.465 9.99a11.8 11.8 0 0 1-2.517 2.453 7 7 0 0 1-1.048.625c-.28.132-.581.24-.829.24s-.548-.108-.829-.24a7 7 0 0 1-1.048-.625 11.8 11.8 0 0 1-2.517-2.453C1.928 10.487.545 7.169 1.141 2.692A1.54 1.54 0 0 1 2.185 1.43 63 63 0 0 1 5.072.56"/>
                <path d="M9.5 6.5a1.5 1.5 0 0 1-1 1.415l.385 1.99a.5.5 0 0 1-.491.595h-.788a.5.5 0 0 1-.49-.595l.384-1.99a1.5 1.5 0 1 1 2-1.415"/>
            </svg>
        ),
    },
    {
        id: "privacidade-dados",
        label: "Privacidade e dados",
        icon: (
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 16 16">
                <path d="M8 1.2 2.8 3.4V7c0 3.5 2.2 6.6 5.2 7.7 3-1.1 5.2-4.2 5.2-7.7V3.4L8 1.2Z" />
                <path d="m5.8 8 1.5 1.5 3.1-3.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
    },
    {
        id: "acessibilidade",
        label: "Acessibilidade",
        icon: (
            <svg width="16" height="16" fill="currentColor" className="bi bi-universal-access-circle" viewBox="0 0 16 16">
                <path d="M8 4.143A1.071 1.071 0 1 0 8 2a1.071 1.071 0 0 0 0 2.143m-4.668 1.47 3.24.316v2.5l-.323 4.585A.383.383 0 0 0 7 13.14l.826-4.017c.045-.18.301-.18.346 0L9 13.139a.383.383 0 0 0 .752-.125L9.43 8.43v-2.5l3.239-.316a.38.38 0 0 0-.047-.756H3.379a.38.38 0 0 0-.047.756Z"/>
                <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0M1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8"/>
            </svg>
        ),
    },
];


function Configuracao() {
    const { usuario } = useAutenticacao();
    const [menuAberto, setMenuAberto] = useState(true);
    const [itemAtivo, setItemAtivo] = useState("meu-perfil");
    const [perfil, setPerfil] = useState<Perfil | null>(null);

    function renderizarConteudo() {
        switch (itemAtivo) {
            case "meu-perfil":
                return <MeuPerfil />;

            case "aparencia":
                return <Aparencia />;

            case "conta-seguranca":
                return <ContaSeguranca />;

            case "privacidade-dados":
                return <PrivacidadeDados />;

            case "acessibilidade":
                return <Acessibilidade />;
        }
    }

    useEffect(() => {
        async function carregarPerfil() {
            const resposta = await apiFetch("/usuarios/me");

            if (!resposta.ok) {
                throw new Error("Não foi possível carregar o perfil.");
            }

            const dados: Perfil = await resposta.json();
            setPerfil(dados);
        }

        carregarPerfil().catch(console.error);
    }, []);

    function obterUrlFoto(url: string) {
        return url.startsWith("http://") || url.startsWith("https://")
            ? url
            : `${import.meta.env.VITE_API_URL}${url}`;
    }

    return (
        <div className={`administracao ${menuAberto ? "menu-aberto" : "menu-fechado"}`}>
            <aside className="admin-sidebar" aria-label="Menu de administração" data-lenis-prevent>
                <div className="admin-sidebar-header">
                    <img className="admin-logo" src={brasao} alt="Fala Pommer" />
                    <div className="admin-brand">
                        <strong>Fala Pommer</strong>
                        <span>Configurações</span>
                    </div>

                    <button
                        className="admin-toggle"
                        type="button"
                        onClick={() => setMenuAberto((aberto) => !aberto)}
                        aria-label={menuAberto ? "Fechar menu lateral" : "Abrir menu lateral"}
                        aria-expanded={menuAberto}
                        title={menuAberto ? "Fechar menu" : "Abrir menu"}
                    >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="m14.7 6.3-1.4-1.4L6.2 12l7.1 7.1 1.4-1.4-5.6-5.7 5.6-5.7Zm4 0-1.4-1.4-7.1 7.1 7.1 7.1 1.4-1.4-5.6-5.7 5.6-5.7Z" />
                        </svg>
                    </button>
                </div>

                <nav className="admin-nav">
                    <span className="admin-nav-title">MENU</span>
                    <div className="admin-profile">
                        <div className="admin-profile-avatar">
                            {perfil?.nome.charAt(0).toUpperCase()}
                                {perfil?.foto_perfil_url && (
                                    <img
                                        className="admin-profile-image"
                                        src={obterUrlFoto(perfil.foto_perfil_url)}
                                        alt={`Foto de perfil de ${perfil.nome}`}
                                        onError={(evento) =>
                                            evento.currentTarget.remove()
                                        }
                                    />
                                )}
                        </div>
                        <div className="admin-profile-info">
                            <strong className="admin-profile-name">
                                {perfil?.nome ?? "Carregando..."}
                            </strong>

                            <div className="container-admin-profile-role">
                                <span className="admin-profile-role">
                                    {perfil?.tipo_usuario === "superAdmin" ? "Super Admin" : perfil?.tipo_usuario}
                                </span>
                            </div>
                        </div>
                    </div>

                    {itensMenu.map((item) => (
                        <button
                            key={item.id}
                            className={`admin-nav-item ${itemAtivo === item.id ? "ativo" : ""}`}
                            type="button"
                            onClick={() => setItemAtivo(item.id)}
                            title={!menuAberto ? item.label : undefined}
                            aria-current={itemAtivo === item.id ? "page" : undefined}
                        >
                            <span className="admin-nav-icon">{item.icon}</span>
                            <span className="admin-nav-label">{item.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="admin-sidebar-footer">
                    <Link
                        className="admin-nav-item"
                        to={usuario?.tipo === "user" ? "/sectors" : "/home"}
                        title={!menuAberto ? "Voltar ao início" : undefined}
                    >
                        <span className="admin-nav-icon">
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8h5Z" />
                            </svg>
                        </span>
                        <span className="admin-nav-label">Voltar ao início</span>
                    </Link>
                </div>
            </aside>

            <main className="admin-content">
                <header className="admin-content-header">
                    <div>
                        <span className="admin-eyebrow">PAINEL DE CONFIGURAÇÕES</span>
                        <h1>{itensMenu.find((item) => item.id === itemAtivo)?.label}</h1>
                    </div>
                </header>
                <div className="admin-page-content">
                    {renderizarConteudo()}
                </div>
            </main>
        </div>
    );
}

export default Configuracao;
