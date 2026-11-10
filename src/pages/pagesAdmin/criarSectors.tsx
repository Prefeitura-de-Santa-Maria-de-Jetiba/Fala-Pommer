// Permite consultar e gerenciar os setores cadastrados.
import { useState } from "react";
import Setores from "./secretaria-setor/setor";
import Secretaria from "./secretaria-setor/secretaria";

// Define os dados necessários para cada opção do menu.
type itemMenuSecretaria = {
    id: string;
    label: string;
};

// Mantém centralizadas as opções disponíveis para navegação.
const itensMenuSecretaria: itemMenuSecretaria[] = [
    {
        id: "secretaria",
        label: "Secretaria",
    },
    {
        id: "setor",
        label: "Setor",
    }
]

function CriarSectors() {
    // Controla qual área administrativa está visível no momento.
    const [itemAtivo, setItemAtivo] = useState("secretaria");

    // Seleciona o componente correspondente à opção ativa.
    function renderizarConteudo() {
        switch (itemAtivo) {
            case "secretaria":
                return <Secretaria />;

            case "setor":
                return <Setores />;

            default:
                return null;
        }
    }

    return (
        <section className="criar-sectors">
            <nav
                className="criar-sectors__pastas"
                aria-label="Escolha entre secretarias e setores"
            >
                {/* Cria um botão de navegação para cada opção cadastrada. */}
                {itensMenuSecretaria.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        className={`criar-sectors__pasta ${
                            itemAtivo === item.id
                                ? "criar-sectors__pasta--ativa"
                                : ""
                        }`}
                        onClick={() => setItemAtivo(item.id)}
                        aria-pressed={itemAtivo === item.id}
                    >

                        <span>{item.label}</span>
                    </button>
                ))}
            </nav>

            <div className="criar-sectors__conteudo">
                {/* Exibe o formulário referente à opção selecionada. */}
                {renderizarConteudo()}
            </div>
        </section>
    );
}

export default CriarSectors;
