import { useState } from "react";
import { useNavegacaoAudio } from "../../components/NavegacaoAudioContext";
import { NotificacaoConfiguracao } from "../../components/NotificacaoConfiguracao";

import {
    aplicarAltoContraste,
    obterPreferenciaAltoContraste,
} from "../../library/altoContraste";
import {
    aplicarTextoAmpliado,
    obterPreferenciaTextoAmpliado,
} from "../../library/textoAmpliado";
import {
    aplicarPaletaAcessivel,
    obterPreferenciaPaletaAcessivel,
} from "../../library/paletaAcessivel";

function Acessibilidade() {
    const { navegacaoAudioAtiva, setNavegacaoAudioAtiva } = useNavegacaoAudio();
    const [paletaAcessivelAtiva, setPaletaAcessivelAtiva] = useState(
        obterPreferenciaPaletaAcessivel,
    );

    const [altoContrasteAtivo, setAltoContrasteAtivo] = useState(
        obterPreferenciaAltoContraste
    );
    const [textoAmpliadoAtivo, setTextoAmpliadoAtivo] = useState(
        obterPreferenciaTextoAmpliado
    );
    const [notificacao, setNotificacao] = useState<{
        id: number;
        estado: "ativado" | "desativado";
    } | null>(null);

    function mostrarNotificacao(ativado: boolean) {
        setNotificacao((notificacaoAtual) => ({
            id: (notificacaoAtual?.id ?? 0) + 1,
            estado: ativado ? "ativado" : "desativado",
        }));
    }

    function alternarAltoContraste() {
        const proximoEstado = !altoContrasteAtivo;
        setAltoContrasteAtivo(proximoEstado);
        aplicarAltoContraste(proximoEstado);

        mostrarNotificacao(proximoEstado);
    }

    function alternarTextoAmpliado() {
        const proximoEstado = !textoAmpliadoAtivo;
        setTextoAmpliadoAtivo(proximoEstado);
        aplicarTextoAmpliado(proximoEstado);

        mostrarNotificacao(proximoEstado);
    }

    function alternarNavegacaoAudio() {
        const proximoEstado = !navegacaoAudioAtiva;
        setNavegacaoAudioAtiva(proximoEstado);

        mostrarNotificacao(proximoEstado);

        if (proximoEstado && "speechSynthesis" in window) {
            window.speechSynthesis.cancel();
            const fala = new SpeechSynthesisUtterance("Navegação por áudio ativada");
            fala.lang = "pt-BR";
            window.speechSynthesis.speak(fala);
        }
    }

    function alternarPaletaAcessivel() {
        const proximoEstado = !paletaAcessivelAtiva;
        setPaletaAcessivelAtiva(proximoEstado);
        aplicarPaletaAcessivel(proximoEstado);

        mostrarNotificacao(proximoEstado);
    }

    return (
        <>
            <main className="acessibilidade">
                <section className="acessibilidade__item acessibilidade__item--autenticacao">
                    <div className="acessibilidade__acao">
                        <div className="acessibilidade__icone">
                            <svg width="22" height="22" fill="currentColor" className="bi bi-shadows" viewBox="0 0 16 16">
                                <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0m-8 7a.5.5 0 0 1 0-1h3.5q.048 0 .093.009A7 7 0 0 0 12.9 13H8a.5.5 0 0 1 0-1h5.745q.331-.474.581-1H8a.5.5 0 0 1 0-1h6.71a7 7 0 0 0 .22-1H8a.5.5 0 0 1 0-1h7q0-.51-.07-1H8a.5.5 0 0 1 0-1h6.71a7 7 0 0 0-.384-1H8a.5.5 0 0 1 0-1h5.745a7 7 0 0 0-.846-1H8a.5.5 0 0 1 0-1h3.608A7 7 0 1 0 8 15"/>
                            </svg>
                        </div>

                        <div className="acessibilidade__conteudo">
                            <strong id="alto-contraste-titulo" className="acessibilidade__titulo">Alto contraste</strong>
                            <span id="alto-contraste-descricao" className="acessibilidade__descricao">Ajusta o contraste para proporcionar maior legibilidade e conforto visual.</span>
                        </div>

                        <span className="acessibilidade__indicador">
                            <button
                                type="button"
                                role="switch"
                                aria-checked={altoContrasteAtivo}
                                aria-labelledby="alto-contraste-titulo"
                                aria-describedby="alto-contraste-descricao"
                                data-audio-text="Alto contraste"
                                className={`acessibilidade__alternador ${
                                    altoContrasteAtivo ? "acessibilidade__alternador--ativo" : ""
                                }`}
                                onClick={alternarAltoContraste}
                            />
                        </span>
                    </div>
                </section>

                <section className="acessibilidade__item acessibilidade__item--autenticacao">
                    <div className="acessibilidade__acao">
                        <div className="acessibilidade__icone">
                            <svg width="22" height="22" fill="currentColor" className="bi bi-type" viewBox="0 0 16 16">
                                <path d="m2.244 13.081.943-2.803H6.66l.944 2.803H8.86L5.54 3.75H4.322L1 13.081zm2.7-7.923L6.34 9.314H3.51l1.4-4.156zm9.146 7.027h.035v.896h1.128V8.125c0-1.51-1.114-2.345-2.646-2.345-1.736 0-2.59.916-2.666 2.174h1.108c.068-.718.595-1.19 1.517-1.19.971 0 1.518.52 1.518 1.464v.731H12.19c-1.647.007-2.522.8-2.522 2.058 0 1.319.957 2.18 2.345 2.18 1.06 0 1.716-.43 2.078-1.011zm-1.763.035c-.752 0-1.456-.397-1.456-1.244 0-.65.424-1.115 1.408-1.115h1.805v.834c0 .896-.752 1.525-1.757 1.525"/>
                            </svg>
                        </div>

                        <div className="acessibilidade__conteudo">
                            <strong id="texto-ampliado-titulo" className="acessibilidade__titulo">Texto ampliado</strong>
                            <span id="texto-ampliado-descricao" className="acessibilidade__descricao">Redimensiona os textos do aplicativo para melhorar a visualização.</span>
                        </div>

                        <span className="acessibilidade__indicador">
                            <button
                                type="button"
                                role="switch"
                                aria-checked={textoAmpliadoAtivo}
                                aria-labelledby="texto-ampliado-titulo"
                                aria-describedby="texto-ampliado-descricao"
                                data-audio-text="Texto ampliado"
                                className={`acessibilidade__alternador ${
                                    textoAmpliadoAtivo ? "acessibilidade__alternador--ativo" : ""
                                }`}
                                onClick={alternarTextoAmpliado}
                            />
                        </span>
                    </div>
                </section>

                <section className="acessibilidade__item acessibilidade__item--autenticacao">
                    <div className="acessibilidade__acao">
                        <div className="acessibilidade__icone">
                            <svg width="22" height="22" fill="currentColor" className="bi bi-soundwave" viewBox="0 0 16 16">
                                <path fillRule="evenodd" d="M8.5 2a.5.5 0 0 1 .5.5v11a.5.5 0 0 1-1 0v-11a.5.5 0 0 1 .5-.5m-2 2a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5m4 0a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5m-6 1.5A.5.5 0 0 1 5 6v4a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m8 0a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m-10 1A.5.5 0 0 1 3 7v2a.5.5 0 0 1-1 0V7a.5.5 0 0 1 .5-.5m12 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0V7a.5.5 0 0 1 .5-.5"/>
                            </svg>
                        </div>

                        <div className="acessibilidade__conteudo">
                            <strong className="acessibilidade__titulo">Navegação por áudio</strong>
                            <span className="acessibilidade__descricao">Oferece retornos sonoros para facilitar o uso do aplicativo sem depender apenas da visão.</span>
                        </div>

                        <span className="acessibilidade__indicador">
                            <button
                                type="button"
                                role="switch"
                                aria-checked={navegacaoAudioAtiva}
                                aria-label="Navegação por áudio"
                                className={`acessibilidade__alternador ${
                                    navegacaoAudioAtiva ? "acessibilidade__alternador--ativo" : ""
                                }`}
                                onClick={alternarNavegacaoAudio}
                            />
                        </span>
                    </div>
                </section>

                <section className="acessibilidade__item">
                    <div className="acessibilidade__acao">
                        <div className="acessibilidade__icone">
                            <svg width="22" height="22" fill="currentColor" className="bi bi-palette" viewBox="0 0 16 16">
                                <path d="M8 5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3m4 3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3M5.5 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m.5 6a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3"/>
                                <path d="M16 8c0 3.15-1.866 2.585-3.567 2.07C11.42 9.763 10.465 9.473 10 10c-.603.683-.475 1.819-.351 2.92C9.826 14.495 9.996 16 8 16a8 8 0 1 1 8-8m-8 7c.611 0 .654-.171.655-.176.078-.146.124-.464.07-1.119-.014-.168-.037-.37-.061-.591-.052-.464-.112-1.005-.118-1.462-.01-.707.083-1.61.704-2.314.369-.417.845-.578 1.272-.618.404-.038.812.026 1.16.104.343.077.702.186 1.025.284l.028.008c.346.105.658.199.953.266.653.148.904.083.991.024C14.717 9.38 15 9.161 15 8a7 7 0 1 0-7 7"/>
                            </svg>
                        </div>

                        <div className="acessibilidade__conteudo">
                            <strong id="paleta-acessivel-titulo" className="acessibilidade__titulo">
                                Paleta acessível
                            </strong>
                            <span id="paleta-acessivel-descricao" className="acessibilidade__descricao">
                                Usa cores mais distinguíveis e contrastes reforçados em toda a interface.
                            </span>
                        </div>

                        <span className="acessibilidade__indicador">
                            <button
                                type="button"
                                role="switch"
                                aria-checked={paletaAcessivelAtiva}
                                aria-labelledby="paleta-acessivel-titulo"
                                aria-describedby="paleta-acessivel-descricao"
                                data-audio-text="Paleta acessível"
                                className={`acessibilidade__alternador ${
                                    paletaAcessivelAtiva ? "acessibilidade__alternador--ativo" : ""
                                }`}
                                onClick={alternarPaletaAcessivel}
                            />
                        </span>
                    </div>
                </section>
            </main>

            {notificacao && (
                <NotificacaoConfiguracao
                    key={notificacao.id}
                    estado={notificacao.estado}
                    aoFechar={() => setNotificacao(null)}
                />
            )}
        </>
    )
}

export default Acessibilidade;
