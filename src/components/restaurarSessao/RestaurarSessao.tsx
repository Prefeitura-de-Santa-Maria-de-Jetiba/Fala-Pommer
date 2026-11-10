
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import "./restaurarSessao.css"
import brasao from "../../assets/img/brasao.webp"
import { obterTemaAparencia } from '../../library/temaAparencia';

/*
  Tela de restauração de sessão do Fala Pommer.

  Props
  - pronto:     true quando a restauração terminou (ex.: !carregando do seu contexto de login)
  - onConcluir: chamada quando a animação de saída termina; use para desmontar o componente
  - minMs:      tempo mínimo na tela (padrão 3200 ms)

  Uso
    const { carregando } = useAuth();
    const [splash, setSplash] = useState(true);

    {!carregando && <Rotas />}
    {splash && <RestaurarSessao pronto={!carregando} onConcluir={() => setSplash(false)} />}

  A tela real do app monta por baixo assim que `pronto` vira true, então a cortina de saída revela o app.
*/

const ITENS = ['conversas', 'grupos', 'não lidas', 'contatos', 'anexos', 'rascunhos', 'notificações', 'quem está online'];
const CORES = ['#CFE0FF', '#DDD8FF', '#BDF2DE', '#FFD2E1', '#A9D4FF'];
const CORESDARKMODE = ['#A9C2EC', '#B9B3E6', '#94D6BC', '#E5A9BE', '#85B6E6'];
const NTIRAS = 6;

interface TituloProps {
    linhas: string[];
    parado: boolean;
}

interface RestaurarSessaoProps {
    pronto?: boolean;
    onConcluir?: () => void;
    minMs?: number;
}

interface Balao {
    el: HTMLElement;
    at: number;
    colocado: boolean;
    fx: number;
    fy: number;
    rot: number;
}

function Titulo({ linhas, parado }: TituloProps) {
    let n = 0;

    return (
        <h1 className={`rs-h1${parado ? ' rs-still' : ''}`} aria-label={linhas.join(' ')}>
        {linhas.map((linha, li) => (
            <span key={li} className={`rs-l rs-l${li + 1}`} aria-hidden="true">
            {linha.split(' ').map((palavra, wi, arr) => (
                <span key={wi}>
                <span className="rs-word">
                    {Array.from(palavra).map((c, ci) => (
                    <span key={ci} className="rs-ch" style={{ '--i': String(n++) } as React.CSSProperties}>{c}</span>
                    ))}
                </span>
                {wi < arr.length - 1 ? ' ' : null}
                </span>
            ))}
            </span>
        ))}
        </h1>
    );
}

function RestaurarSessao({
    pronto = false,
    onConcluir,
    minMs = 3200,
}: RestaurarSessaoProps) {
    const [reduzir] = useState(
        () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );

    const [concluida, setConcluida] = useState(false);

    const raiz = useRef<HTMLElement | null>(null);
    const conteudo = useRef<HTMLDivElement | null>(null);
    const numero = useRef<HTMLSpanElement | null>(null);
    const barra = useRef<HTMLDivElement | null>(null);
    const tempo = useRef<HTMLElement | null>(null);
    const contagem = useRef<HTMLSpanElement | null>(null);

    const sync = useRef<{ pronto: boolean; minimo: boolean; tentar: () => void }>({
        pronto,
        minimo: false,
        tentar: () => {},
    });

    const aoConcluir = useRef<(() => void) | undefined>(onConcluir);

    useEffect(() => {
        aoConcluir.current = onConcluir;
    });

    // Avisa a animação quando a restauração termina
    useEffect(() => {
        sync.current.pronto = pronto;
        sync.current.tentar();
    }, [pronto]);

    // Animação principal
    useLayoutEffect(() => {
        const root = raiz.current;

        if (!root || !conteudo.current || !numero.current || !barra.current || !tempo.current || !contagem.current) {
        return;
        }

        const estado = sync.current;
        const S = { p: 0 };
        const t0 = performance.now();

        estado.minimo = false;

        let finalizando = false;
        let ultimoP = -1;
        let ultimoT = '';
        let colocados = 0;
        let crawl: gsap.core.Tween | null = null;
        let baloes: Balao[] = [];
        let amarelas: HTMLElement[] = [];
        let azuis: HTMLElement[] = [];

        const overflowAnterior = document.body.style.overflow;

        document.body.style.overflow = 'hidden';

        numero.current.textContent = '0';
        tempo.current.textContent = '0,0 s';
        contagem.current.textContent = `0/${ITENS.length}`;

        const espalhar = (o: Balao) => {
            gsap.set(o.el, { x: 0, y: 0, rotation: 0, scale: 1 });

            const r = o.el.getBoundingClientRect();
            const s = root.getBoundingClientRect();

            const tx = s.left + 12 + o.fx * Math.max(0, s.width - r.width - 24) - r.left;
            const ty = s.top + 56 + o.fy * Math.max(0, s.height - r.height - 80) - r.top;

            gsap.set(o.el, { x: tx, y: ty, rotation: o.rot });
        };

        const colocar = (o: Balao) => {
            if (o.colocado) return;

            o.colocado = true;
            colocados += 1;

            o.el.classList.add('rs-ok');

            contagem.current!.textContent = `${colocados}/${baloes.length}`;

            if (reduzir) return;

            gsap.killTweensOf(o.el);

            ctx.add(() => {
                gsap.to(o.el, {
                x: 0,
                y: 0,
                rotation: 0,
                scale: 1,
                duration: 0.95,
                ease: 'back.out(1.4)',
                });
            });
        };

        const tick = () => {
            const v = Math.round(S.p);

            if (v !== ultimoP) {
                ultimoP = v;
                numero.current!.textContent = String(v);
                barra.current!.setAttribute('aria-valuenow', String(v));
            }

            baloes.forEach((o) => {
                if (!o.colocado && S.p >= o.at) colocar(o);
            });
        };

        const relogio = () => {
            if (finalizando) return;

            const txt = `${((performance.now() - t0) / 1000).toFixed(1).replace('.', ',')} s`;

            if (txt !== ultimoT) {
                ultimoT = txt;
                tempo.current!.textContent = txt;
            }
        };

        const saida = () => {
            const x = gsap.timeline();

            x.set(root, { pointerEvents: 'none' });

            if (reduzir) {
                x.to(root, { opacity: 0, duration: 0.4, ease: 'none' });
            } else {
                x.to(conteudo.current, {
                    opacity: 0,
                    y: -24,
                    duration: 0.35,
                    ease: 'power2.in',
                })
                .to(
                    azuis,
                    {
                        yPercent: -100,
                        duration: 0.85,
                        ease: 'power3.inOut',
                        stagger: { each: 0.07, from: 'center' },
                    },
                    '-=0.05'
                )
                .to(
                    amarelas,
                    {
                        yPercent: -100,
                        duration: 0.85,
                        ease: 'power3.inOut',
                        stagger: { each: 0.07, from: 'center' },
                    },
                    '<+=0.16'
                );
            }

            x.call(() => {
                if (aoConcluir.current) aoConcluir.current();
            });

            return x;
        };

        const finalizar = () => {
            if (finalizando) return;

            finalizando = true;

            if (crawl) crawl.kill();

            ctx.add(() => {
                const tl = gsap.timeline();

                tl.to(S, {
                    p: 100,
                    duration: 0.7,
                    ease: 'power2.inOut',
                    onUpdate: tick,
                });

                baloes
                    .filter((o) => !o.colocado)
                    .forEach((o, i) => {
                        tl.call(() => colocar(o), [], 0.05 + i * 0.05);
                    });

                tl.call(
                    () => {
                        setConcluida(true);

                        if (!reduzir) {
                            gsap.fromTo(
                                numero.current,
                                { scale: 1.25, transformOrigin: '100% 100%' },
                                {
                                    scale: 1,
                                    duration: 0.6,
                                    ease: 'elastic.out(1,.4)',
                                }
                            );
                        }
                    },
                    [],
                    0.8
                );

                tl.add(saida(), 2.0);
            });
        };

        estado.tentar = () => {
            if (estado.pronto && estado.minimo) finalizar();
        };

        const ctx = gsap.context(() => {
            baloes = gsap.utils.toArray<HTMLElement>('.rs-chip', root).map((el, i) => ({
                el,
                at: 8 + i * 8,
                colocado: false,
                fx: Math.random(),
                fy: Math.random(),
                rot: gsap.utils.random(-28, 28),
            }));

            amarelas = gsap.utils.toArray<HTMLElement>('.rs-y i', root);
            azuis = gsap.utils.toArray<HTMLElement>('.rs-b i', root);

            if (!reduzir) {
                baloes.forEach((o, i) => {
                    espalhar(o);

                    gsap.fromTo(
                        o.el,
                        { scale: 0 },
                        {
                            scale: 1,
                            duration: 0.5,
                            ease: 'back.out(2)',
                            delay: 0.15 + i * 0.06,
                        }
                    );
                });
            }

            crawl = gsap.to(S, {
                p: 90,
                duration: 8,
                ease: 'power1.out',
                onUpdate: tick,
            });
        }, root);

        gsap.ticker.add(relogio);

        let redimensionar: ReturnType<typeof setTimeout> | null = null;

        const aoRedimensionar = () => {
            if (redimensionar) clearTimeout(redimensionar);

            redimensionar = setTimeout(() => {
                if (reduzir || finalizando) return;

                baloes.forEach((o) => {
                    if (!o.colocado) espalhar(o);
                });
            }, 150);
        };

        window.addEventListener('resize', aoRedimensionar);

        const minimo = setTimeout(() => {
            estado.minimo = true;
            estado.tentar();
        }, minMs);

        estado.tentar();

        return () => {
            clearTimeout(minimo);

            if (redimensionar) clearTimeout(redimensionar);

            window.removeEventListener('resize', aoRedimensionar);
            gsap.ticker.remove(relogio);

            estado.tentar = () => {};

            ctx.revert();

            document.body.style.overflow = overflowAnterior;
        };
    }, [minMs, reduzir]);

    // Letras do título entrando quando vira "Sessão restaurada!"
    useLayoutEffect(() => {
        if (!concluida || reduzir) return undefined;

        const ctx = gsap.context(() => {
            gsap.from('.rs-h1 .rs-ch', {
                yPercent: 70,
                opacity: 0,
                rotation: () => gsap.utils.random(-25, 25),
                duration: 0.55,
                ease: 'back.out(2.2)',
                stagger: 0.03,
            });
        }, raiz);

        return () => ctx.revert();
    }, [concluida, reduzir]);

    return (
        <section
            ref={raiz}
            className={`rs-root${reduzir ? ' rs-rm' : ''}`}
            aria-label="Restaurando sessão"
            aria-busy={!concluida}
        >
            <div className="rs-strips rs-y" aria-hidden="true">
                {Array.from({ length: NTIRAS }, (_, i) => (
                    <i key={i} />
                ))}
            </div>

            <div className="rs-strips rs-b" aria-hidden="true">
                {Array.from({ length: NTIRAS }, (_, i) => (
                    <i key={i} />
                ))}
            </div>

            <div className="rs-content" ref={conteudo}>
                <div className="rs-hud rs-pad">
                    <span className="rs-brand">
                        <span className="rs-brand-mark" aria-hidden="true">
                            <img src={brasao} alt="" />
                        </span>
                        Fala Pommer
                    </span>

                    <span className="rs-hud-right">
                        <span className="rs-status">
                            <span className={`rs-typing${concluida ? ' rs-done' : ''}`} aria-hidden="true">
                                <i />
                                <i />
                                <i />
                            </span>
                            <span>{concluida ? 'Pronto' : 'Restaurando'}</span>
                        </span>

                        <span className="rs-timer">
                            <span>tempo</span>
                            <b ref={tempo} />
                        </span>
                    </span>
                </div>

                <div className="rs-head rs-pad">
                    <Titulo
                        linhas={concluida ? ['Sessão', 'restaurada!'] : ['Restaurando', 'sua sessão']}
                        parado={concluida}
                    />
                </div>

                <div className="rs-band" aria-hidden="true">
                    <div className="rs-band-track">
                        <span>
                            Acordando o servidor com um cafézinho • Procurando suas conversas • Chamando o pessoal do grupo • Tirando o digitando… do vácuo • Conferindo quem está online • Sacudindo as mensagens não lidas • Avisando que você voltou •
                        </span>
                        <span>
                            Acordando o servidor com um cafézinho • Procurando suas conversas • Chamando o pessoal do grupo • Tirando o digitando… do vácuo • Conferindo quem está online • Sacudindo as mensagens não lidas • Avisando que você voltou •
                        </span>
                    </div>
                </div>

                <div className="rs-foot rs-pad">
                    <div className="rs-tray-wrap">
                        <p className="rs-tray-label">
                            recolocando tudo no lugar · <span ref={contagem} />
                        </p>

                        <div className="rs-tray">
                            {ITENS.map((t, i) => (
                                <span
                                key={t}
                                className="rs-chip"
                                style={{ background: obterTemaAparencia() === 'escuro' ? CORESDARKMODE[i % CORESDARKMODE.length] : CORES[i % CORES.length] }}
                                >
                                    <span className="rs-ck" aria-hidden="true">
                                        <svg viewBox="0 0 18 14">
                                        <path className="rs-t1" d="M1.5 7.5 L5 11 L11.5 3.5" />
                                        <path className="rs-t2" d="M6 7.5 L9.5 11 L16 3.5" />
                                        </svg>
                                    </span>
                                    <span>{t}</span>
                                </span>
                            ))}
                        </div>
                    </div>

                    <div
                        ref={barra}
                        className="rs-counter"
                        role="progressbar"
                        aria-label="Progresso da restauração"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={0}
                    >
                        <span className="rs-num" ref={numero} />
                        <span className="rs-pc" aria-hidden="true">
                        %
                        </span>
                    </div>
                </div>
            </div>

            <p className="rs-sr" role="status">
                {concluida ? 'Sessão restaurada.' : 'Restaurando sua sessão.'}
            </p>
        </section>
    );
}

export default RestaurarSessao;