// Permite consultar e gerenciar os setores cadastrados.
import { useState } from "react";
import TodasAvaliacoesUsers from "./avaliacoes/todasAvaliacoesUsers";
import TodasAvaliacoesSectors from "./avaliacoes/todasAvaliacoesSectors";

// Define os dados necessários para cada opção do menu.
type itemMenuAvaliacao = {
    id: string;
    label: string;
};

// Mantém centralizadas as opções disponíveis para navegação.
const itensMenuAvaliacoes: itemMenuAvaliacao[] = [
    {
        id: "todasAvaliacoesUsers",
        label: "Avaliações",
    },
    {
        id: "todasAvaliacoesSectors",
        label: "Notas",
    }
]

function CriarSectors() {
    // Controla qual área administrativa está visível no momento.
    const [itemAtivo, setItemAtivo] = useState("todasAvaliacoesUsers");

    // Seleciona o componente correspondente à opção ativa.
    function renderizarConteudo() {
        switch (itemAtivo) {
            case "todasAvaliacoesUsers":
                return <TodasAvaliacoesUsers />;

            case "todasAvaliacoesSectors":
                return <TodasAvaliacoesSectors />;

            default:
                return null;
        }
    }

    return (
        <section className="criar-avaliacao">
            <nav
                className="criar-avaliacao__pastas"
                aria-label="Escolha entre secretarias e setores"
            >
                {/* Cria um botão de navegação para cada opção cadastrada. */}
                {itensMenuAvaliacoes.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        className={`criar-avaliacao__pasta ${
                            itemAtivo === item.id
                                ? "criar-avaliacao__pasta--ativa"
                                : ""
                        }`}
                        onClick={() => setItemAtivo(item.id)}
                        aria-pressed={itemAtivo === item.id}
                    >

                        <span>{item.label}</span>
                    </button>
                ))}
            </nav>

            <div className="criar-avaliacao__conteudo">
                {/* Exibe o formulário referente à opção selecionada. */}
                {renderizarConteudo()}
            </div>
        </section>
    );
}

export default CriarSectors;
