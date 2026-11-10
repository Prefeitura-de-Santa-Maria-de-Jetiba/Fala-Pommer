import { useState } from "react";
import { NotificacaoConfiguracao } from "../../components/NotificacaoConfiguracao";
import {
    aplicarPlanoFundoConversa,
    obterPlanoFundoConversa,
    type PlanoFundoConversa,
} from "../../library/planoFundoConversa";
import {
    aplicarTemaAparencia,
    obterTemaAparencia,
    type TemaAparencia,
} from "../../library/temaAparencia";

function Aparencia() {
    const [temaSelecionado, setTemaSelecionado] = useState<TemaAparencia>(obterTemaAparencia);
    const [planoFundoSelecionado, setPlanoFundoSelecionado] = useState(
        obterPlanoFundoConversa
    );
    const [notificacaoAtivadaId, setNotificacaoAtivadaId] = useState(0);

    function selecionarPlanoFundo(plano: PlanoFundoConversa) {
        if (plano !== planoFundoSelecionado) {
            setNotificacaoAtivadaId((idAtual) => idAtual + 1);
        }

        setPlanoFundoSelecionado(plano);
        aplicarPlanoFundoConversa(plano);
    }

    function selecionarTema(tema: TemaAparencia) {
        if (tema !== temaSelecionado) {
            setNotificacaoAtivadaId((idAtual) => idAtual + 1);
        }

        setTemaSelecionado(tema);
        aplicarTemaAparencia(tema);
    }

    return (
        <>
            <main className="aparencia">
            <section className="aparencia__secao aparencia__secao--tema">
                <div className="aparencia__cabecalho">
                    <strong className="aparencia__titulo">Tema</strong>
                </div>

                <div className="aparencia__opcoes-tema">
                    <div
                        className="aparencia__opcao-tema"
                        onClick={() => selecionarTema("claro")}
                    >
                        <div className="aparencia__preview aparencia__preview--claro">
                            <span className="aparencia__preview-amostra">
                                <span className="aparencia__preview-cabecalho">
                                    <span className="aparencia__preview-avatar"/>
                                    <span className="aparencia__preview-nome"/>
                                </span>
                                <span className="aparencia__preview-conteudo">
                                    <span className="aparencia__preview-linha aparencia__preview-linha--longa"/>
                                    <span className="aparencia__preview-linha aparencia__preview-linha--curta"/>
                                </span>

                                <span className="aparencia__preview-conteudo">
                                    <span className="aparencia__preview-linha aparencia__preview-linha--longa"/>
                                    <span className="aparencia__preview-linha aparencia__preview-linha--curta"/>
                                </span>

                                <span className="aparencia__preview-cabecalho">
                                    <span className="aparencia__preview-avatar"/>
                                    <span className="aparencia__preview-nome"/>
                                </span>
                                <span className="aparencia__preview-conteudo">
                                    <span className="aparencia__preview-linha aparencia__preview-linha--longa"/>
                                    <span className="aparencia__preview-linha aparencia__preview-linha--curta"/>
                                </span>
                            </span>
                        </div>
                        <div className="aparencia__seletor">
                            <input
                                className="aparencia__radio"
                                type="radio"
                                name="tema"
                                id="tema-claro"
                                value="claro"
                                checked={temaSelecionado === "claro"}
                                onChange={() => selecionarTema("claro")}
                            />
                            <span className="aparencia__rotulo">Claro</span>
                        </div>
                    </div>
                    <div
                        className="aparencia__opcao-tema"
                        onClick={() => selecionarTema("escuro")}
                    >
                        <div className="aparencia__preview aparencia__preview--escuro">
                            <span className="aparencia__preview-amostra">
                                <span className="aparencia__preview-cabecalho">
                                    <span className="aparencia__preview-avatar"/>
                                    <span className="aparencia__preview-nome"/>
                                </span>
                                <span className="aparencia__preview-conteudo">
                                    <span className="aparencia__preview-linha aparencia__preview-linha--longa"/>
                                    <span className="aparencia__preview-linha aparencia__preview-linha--curta"/>
                                </span>

                                <span className="aparencia__preview-conteudo">
                                    <span className="aparencia__preview-linha aparencia__preview-linha--longa"/>
                                    <span className="aparencia__preview-linha aparencia__preview-linha--curta"/>
                                </span>

                                <span className="aparencia__preview-cabecalho">
                                    <span className="aparencia__preview-avatar"/>
                                    <span className="aparencia__preview-nome"/>
                                </span>
                                <span className="aparencia__preview-conteudo">
                                    <span className="aparencia__preview-linha aparencia__preview-linha--longa"/>
                                    <span className="aparencia__preview-linha aparencia__preview-linha--curta"/>
                                </span>
                            </span>
                        </div>
                        <div className="aparencia__seletor">
                            <input
                                className="aparencia__radio"
                                type="radio"
                                name="tema"
                                id="tema-escuro"
                                value="escuro"
                                checked={temaSelecionado === "escuro"}
                                onChange={() => selecionarTema("escuro")}
                            />
                            <span className="aparencia__rotulo">Escuro</span>
                        </div>
                    </div>
                </div>

            </section>

            <section className="aparencia__secao aparencia__secao--cores">
                <div className="aparencia__cabecalho plano-de-fundo__cabecalho">
                    <strong className="aparencia__titulo">Plano de fundo da conversa</strong>
                </div>

                <div className="aparencia__opcoes-cor">
                    <div
                        className={`aparencia__opcao-cor aparencia__opcao-cor--1 ${
                            planoFundoSelecionado === 1 ? "aparencia__opcao-cor--selecionada" : ""
                        }`}
                        onClick={() => selecionarPlanoFundo(1)}
                    >
                        <span className="aparencia__amostra-cor"/>
                    </div>

                    <div
                        className={`aparencia__opcao-cor aparencia__opcao-cor--2 ${
                            planoFundoSelecionado === 2 ? "aparencia__opcao-cor--selecionada" : ""
                        }`}
                        onClick={() => selecionarPlanoFundo(2)}
                    >
                        <span className="aparencia__amostra-cor"/>
                    </div>

                    <div
                        className={`aparencia__opcao-cor aparencia__opcao-cor--3 ${
                            planoFundoSelecionado === 3 ? "aparencia__opcao-cor--selecionada" : ""
                        }`}
                        onClick={() => selecionarPlanoFundo(3)}
                    >
                        <span className="aparencia__amostra-cor"/>
                    </div>

                    <div
                        className={`aparencia__opcao-cor aparencia__opcao-cor--4 ${
                            planoFundoSelecionado === 4 ? "aparencia__opcao-cor--selecionada" : ""
                        }`}
                        onClick={() => selecionarPlanoFundo(4)}
                    >
                        <span className="aparencia__amostra-cor"/>
                    </div>

                    <div
                        className={`aparencia__opcao-cor aparencia__opcao-cor--5 ${
                            planoFundoSelecionado === 5 ? "aparencia__opcao-cor--selecionada" : ""
                        }`}
                        onClick={() => selecionarPlanoFundo(5)}
                    >
                        <span className="aparencia__amostra-cor"/>
                    </div>
                </div>
            </section>
            </main>

            {notificacaoAtivadaId > 0 && (
                <NotificacaoConfiguracao
                    key={notificacaoAtivadaId}
                    estado="ativado"
                    aoFechar={() => setNotificacaoAtivadaId(0)}
                />
            )}
        </>
    )
}

export default Aparencia;
