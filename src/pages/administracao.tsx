// Organiza as páginas disponíveis na área administrativa.
import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import brasao from "../assets/img/brasao.webp";
import "./css/administracao.css";
import VisaoGeral from "./pagesAdmin/visaoGeral";
import RelatoriosLogs from "./pagesAdmin/relatoriosLogs";
import RelatorioError from "./pagesAdmin/relatoriosError";
import RelatorioLinkConvite from "./pagesAdmin/relatoriosLinkConvite";
import CriarSectors from "./pagesAdmin/criarSectors";
import CriarUsers from "./pagesAdmin/usuarios";
import GerenciarAvaliações from "./pagesAdmin/gerenciarAvaliacoes";
import RelatorioPromocaoComunidade from "./pagesAdmin/relatoriosPromocaoComunidade";
import RelatorioRebaixamentoComunidade from "./pagesAdmin/relatoriosRebaixamentosComunidades";

// Define os dados necessários para cada opção do menu administrativo.
type ItemMenu = {
    id: string;
    label: string;
    title: string;
    icon: ReactNode;
};

// Centraliza as páginas disponíveis e seus respectivos ícones.
const itensMenu: ItemMenu[] = [
    {
        id: "visao-geral",
        label: "Visão geral",
        title: "",
        icon: (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z" />
            </svg>
        ),
    },
    {
        id: "usuarios",
        label: "Usuários",
        title: "",
        icon: (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M16 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8 1c-1.47 0-4.41.74-4.91 2.2C10.17 14.4 8.55 14 7 14c-2.33 0-7 1.17-7 3.5V21h13v-3.5c0-.47-.12-.88-.32-1.25.91-.66 2.34-1.25 3.32-1.25 1.86 0 4 .92 4 1.5V19h4v-2.5c0-2.33-5.67-3.5-8-3.5Z" />
            </svg>
        ),
    },
    {
        id: "criarSectors",
        label: "Secretarias/Setores",
        title: "Criação de secretarias ou setores",
        icon: (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 21V8l9-5 9 5v13h-7v-7h-4v7H3Zm3-8h2v-2H6v2Zm0 4h2v-2H6v2Zm10-4h2v-2h-2v2Zm0 4h2v-2h-2v2Z" />
            </svg>
        ),
    },
    {
        id: "avaliacoes-setores",
        label: "Avaliações",
        title: "",
        icon: (
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
                <path fillRule="evenodd" d="M0 .5A.5.5 0 0 1 .5 0h2a.5.5 0 0 1 0 1h-2A.5.5 0 0 1 0 .5m4 0a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1h-10A.5.5 0 0 1 4 .5m-4 2A.5.5 0 0 1 .5 2h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5m4 0a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5m-4 2A.5.5 0 0 1 .5 4h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5m4 0a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5m-4 2A.5.5 0 0 1 .5 6h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5m4 0a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 0 1h-8a.5.5 0 0 1-.5-.5m-4 2A.5.5 0 0 1 .5 8h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5m4 0a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 0 1h-8a.5.5 0 0 1-.5-.5m-4 2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5m4 0a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1h-10a.5.5 0 0 1-.5-.5m-4 2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5m4 0a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1h-6a.5.5 0 0 1-.5-.5m-4 2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5m4 0a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5" />
            </svg>
        ),
    },
];

// Páginas agrupadas dentro do submenu "Logs".
const itensMenuLogs: ItemMenu[] = [
    {
        id: "relatorios-logs",
        label: "Relatórios de Login",
        title: "",
        icon: (
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M0 8a4 4 0 0 1 7.465-2H14a.5.5 0 0 1 .354.146l1.5 1.5a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0L13 9.207l-.646.647a.5.5 0 0 1-.708 0L11 9.207l-.646.647a.5.5 0 0 1-.708 0L9 9.207l-.646.647A.5.5 0 0 1 8 10h-.535A4 4 0 0 1 0 8m4-3a3 3 0 1 0 2.712 4.285A.5.5 0 0 1 7.163 9h.63l.853-.854a.5.5 0 0 1 .708 0l.646.647.646-.647a.5.5 0 0 1 .708 0l.646.647.646-.647a.5.5 0 0 1 .708 0l.646.647.793-.793-1-1h-6.63a.5.5 0 0 1-.451-.285A3 3 0 0 0 4 5" />
                <path d="M4 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0" />
            </svg>
        ),
    },
    {
        id: "relatorios-error",
        label: "Relatórios de Erros",
        title: "",
        icon: (
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M7.938 2.016A.13.13 0 0 1 8.002 2a.13.13 0 0 1 .063.016.15.15 0 0 1 .054.057l6.857 11.667c.036.06.035.124.002.183a.2.2 0 0 1-.054.06.1.1 0 0 1-.066.017H1.146a.1.1 0 0 1-.066-.017.2.2 0 0 1-.054-.06.18.18 0 0 1 .002-.183L7.884 2.073a.15.15 0 0 1 .054-.057m1.044-.45a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767z" />
                <path d="M7.002 12a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 5.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z" />
            </svg>
        ),
    },
    {
        id: "relatorios-links-convite",
        label: "Relatórios de Links",
        title: "Relatórios de criação de links de convite",
        icon: (
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M6.354 5.5H4a3 3 0 0 0 0 6h3a3 3 0 0 0 2.83-4H9q-.13 0-.25.031A2 2 0 0 1 7 10.5H4a2 2 0 1 1 0-4h1.535c.218-.376.495-.714.82-1z"/>
                <path d="M9 5.5a3 3 0 0 0-2.83 4h1.098A2 2 0 0 1 9 6.5h3a2 2 0 1 1 0 4h-1.535a4 4 0 0 1-.82 1H12a3 3 0 1 0 0-6z"/>
            </svg>
        ),
    },
    {
        id: "relatorios-promocao-comunidade",
        label: "Relatórios de Promoções",
        title: "",
        icon:(
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M12.5 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7m.354-5.854 1.5 1.5a.5.5 0 0 1-.708.708L13 11.707V14.5a.5.5 0 0 1-1 0v-2.793l-.646.647a.5.5 0 0 1-.708-.708l1.5-1.5a.5.5 0 0 1 .708 0M11 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0M8 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4"/>
                <path d="M8.256 14a4.5 4.5 0 0 1-.229-1.004H3c.001-.246.154-.986.832-1.664C4.484 10.68 5.711 10 8 10q.39 0 .74.025c.226-.341.496-.65.804-.918Q8.844 9.002 8 9c-5 0-6 3-6 4s1 1 1 1z"/>
            </svg>
        ),
    },
    {
        id: "relatorios-rebaixamento-comunidade",
        label: "Relatórios de Rebaixamentos",
        title: "",
        icon:(
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M12.5 9a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7m.354 5.854 1.5-1.5a.5.5 0 0 0-.708-.708l-.646.647V10.5a.5.5 0 0 0-1 0v2.793l-.646-.647a.5.5 0 0 0-.708.708l1.5 1.5a.5.5 0 0 0 .708 0M11 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0M8 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4"/>
                <path d="M8.256 14a4.5 4.5 0 0 1-.229-1.004H3c.001-.246.154-.986.832-1.664C4.484 10.68 5.711 10 8 10q.39 0 .74.025c.226-.341.496-.65.804-.918Q8.844 9.002 8 9c-5 0-6 3-6 4s1 1 1 1z"/>
            </svg>
        ),
    },
];

function Administracao() {
    // Controla a abertura do menu lateral, do submenu de logs e a página atual.
    const [menuAberto, setMenuAberto] = useState(true);
    const [itemAtivo, setItemAtivo] = useState("visao-geral");
    const [logsAberto, setLogsAberto] = useState(false);

    // Recupera os dados usados no título da página ativa (procura nos dois grupos).
    const itemSelecionado = [...itensMenu, ...itensMenuLogs].find(
        (item) => item.id === itemAtivo
    );

    // Destaca o toggler de Logs quando alguma página de logs está ativa.
    const logsAtivo = itensMenuLogs.some((item) => item.id === itemAtivo);

    // Renderiza a página correspondente à opção escolhida no menu.
    function renderizarConteudo() {
        switch (itemAtivo) {
            case "visao-geral":
                return (
                    <VisaoGeral
                        onVerUsuarios={() => setItemAtivo("usuarios")}
                        onVerAvaliacoes={() => setItemAtivo("avaliacoes-setores")}
                    />
                );

            case "usuarios":
                return <CriarUsers />;

            case "criarSectors":
                return <CriarSectors />;

            case "avaliacoes-setores":
                return <GerenciarAvaliações />;

            case "relatorios-logs":
                return <RelatoriosLogs />;

            case "relatorios-error":
                return <RelatorioError />;

            case "relatorios-links-convite":
                return <RelatorioLinkConvite />;

            case "relatorios-promocao-comunidade":
                return <RelatorioPromocaoComunidade />

            case "relatorios-rebaixamento-comunidade":
                return <RelatorioRebaixamentoComunidade />

            default:
                return null;
        }
    }

    return (
        <div className={`administracao ${menuAberto ? "menu-aberto" : "menu-fechado"}`}>
            {/* Menu lateral de navegação entre as áreas administrativas. */}
            <aside className="admin-sidebar" aria-label="Menu de administração" data-lenis-prevent>
                <div className="admin-sidebar-header">
                    <img className="admin-logo" src={brasao} alt="Fala Pommer" />
                    <div className="admin-brand">
                        <strong>Fala Pommer</strong>
                        <span>Administração</span>
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

                    {/* Cria uma opção de navegação para cada página cadastrada. */}
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

                    {/* Grupo "Logs": o toggler só abre/fecha, a navegação usa itemAtivo. */}
                    <div className="admin-nav-group">
                        <button
                            className={`admin-nav-item admin-nav-item__toggle ${logsAtivo ? "ativo" : ""}`}
                            type="button"
                            onClick={() => {
                                // Com o menu recolhido, reabre antes de expandir o submenu.
                                if (!menuAberto) setMenuAberto(true);
                                setLogsAberto((aberto) => !aberto);
                            }}
                            aria-expanded={logsAberto}
                            aria-controls="submenu-logs"
                            title={!menuAberto ? "Logs" : undefined}
                        >
                            <div className="admin-nav-txt__and__icon">
                                <span className="admin-nav-icon">
                                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                        <path d="M5.338 1.59a61 61 0 0 0-2.837.856.48.48 0 0 0-.328.39c-.554 4.157.726 7.19 2.253 9.188a10.7 10.7 0 0 0 2.287 2.233c.346.244.652.42.893.533q.18.085.293.118a1 1 0 0 0 .101.025 1 1 0 0 0 .1-.025q.114-.034.294-.118c.24-.113.547-.29.893-.533a10.7 10.7 0 0 0 2.287-2.233c1.527-1.997 2.807-5.031 2.253-9.188a.48.48 0 0 0-.328-.39c-.651-.213-1.75-.56-2.837-.855C9.552 1.29 8.531 1.067 8 1.067c-.53 0-1.552.223-2.662.524zM5.072.56C6.157.265 7.31 0 8 0s1.843.265 2.928.56c1.11.3 2.229.655 2.887.87a1.54 1.54 0 0 1 1.044 1.262c.596 4.477-.787 7.795-2.465 9.99a11.8 11.8 0 0 1-2.517 2.453 7 7 0 0 1-1.048.625c-.28.132-.581.24-.829.24s-.548-.108-.829-.24a7 7 0 0 1-1.048-.625 11.8 11.8 0 0 1-2.517-2.453C1.928 10.487.545 7.169 1.141 2.692A1.54 1.54 0 0 1 2.185 1.43 63 63 0 0 1 5.072.56"/>
                                        <path d="M7.001 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.553.553 0 0 1-1.1 0z"/>
                                    </svg>
                                </span>
                                <span className="admin-nav-label">Logs</span>
                            </div>

                            {/* Um único chevron, rotacionado por CSS quando aberto. */}
                            <span className={`admin-nav-chevron ${logsAberto ? "aberto" : ""}`}>
                                <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
                                    <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708" />
                                </svg>
                            </span>
                        </button>

                        {logsAberto && (
                            <div id="submenu-logs" className="admin-submenu">
                                {itensMenuLogs.map((item) => (
                                    <button
                                        key={item.id}
                                        className={`admin-nav-item ${itemAtivo === item.id ? "ativo" : ""}`}
                                        type="button"
                                        onClick={() => setItemAtivo(item.id)}
                                        title={!menuAberto ? item.label : undefined}
                                        aria-current={itemAtivo === item.id ? "page" : undefined}
                                    >
                                        <span className="admin-nav-icon logs-aberto-icon">{item.icon}</span>
                                        <span className="admin-nav-label">{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </nav>

                {/* Disponibiliza o retorno à página inicial do sistema. */}
                <div className="admin-sidebar-footer">
                    <Link className="admin-nav-item" to="/home" title={!menuAberto ? "Voltar ao início" : undefined}>
                        <span className="admin-nav-icon">
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8h5Z" />
                            </svg>
                        </span>
                        <span className="admin-nav-label">Voltar ao início</span>
                    </Link>
                </div>
            </aside>

            {/* Área principal atualizada conforme a opção ativa no menu. */}
            <main className="admin-content">
                <header className="admin-content-header">
                    <div>
                        <span className="admin-eyebrow">PAINEL ADMINISTRATIVO</span>
                        <h1>{itemSelecionado?.title || itemSelecionado?.label}</h1>
                    </div>
                </header>
                <div className="admin-page-content">
                    {/* Insere o conteúdo selecionado dentro do painel. */}
                    {renderizarConteudo()}
                </div>
            </main>
        </div>
    );
}

export default Administracao;