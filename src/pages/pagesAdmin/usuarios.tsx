// Permite consultar e gerenciar os setores cadastrados.
import { useState } from "react";
import UsuariosAtivos from "./usuarios/usuariosAtivos";
import UsuariosDesativados from "./usuarios/usuariosDesativados";
import HistoricoAdministrativo from "./usuarios/historicoAdministrativo";

// Define os dados necessários para cada opção do menu de usuários.
type itemMenuUsuarios = {
    id: string;
    label: string;
};

// Centraliza as áreas disponíveis para consulta e gerenciamento.
const itensMenuSecretaria: itemMenuUsuarios[] = [
    {
        id: "ativos",
        label: "Usuários ativados",
    },
    {
        id: "desativados",
        label: "Usuários desativados",
    },
    {
        id: "historico",
        label: "Histórico Administrativo"
    }
]

function CriarUsers() {
    // Controla qual área de usuários está visível no momento.
    const [itemAtivo, setItemAtivo] = useState("ativos");

    // Seleciona o componente correspondente à opção ativa.
    function renderizarConteudo() {
        switch (itemAtivo) {
            case "ativos":
                return <UsuariosAtivos />;

            case "desativados":
                return <UsuariosDesativados />;

            case "historico": 
                return <HistoricoAdministrativo />

            default:
                return null;
        }
    }

    return (
        <section className="gerenciar-user">
            <nav
                className="gerenciar-user__pastas"
                aria-label="Escolha entre secretarias e setores"
            >
                {/* Cria um botão de navegação para cada área cadastrada. */}
                {itensMenuSecretaria.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        className={`gerenciar-user__pasta ${
                            itemAtivo === item.id
                                ? "gerenciar-user__pasta--ativa"
                                : ""
                        }`}
                        onClick={() => setItemAtivo(item.id)}
                        aria-pressed={itemAtivo === item.id}
                    >

                        <span>{item.label}</span>
                    </button>
                ))}
            </nav>

            <div className="gerenciar-user__conteudo">
                {/* Exibe o conteúdo referente à opção selecionada. */}
                {renderizarConteudo()}
            </div>
        </section>
    );
}

export default CriarUsers;
