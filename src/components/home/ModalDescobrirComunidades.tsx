import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../services/api";
import type { Comunidade } from "./Comunidades"
import { obterUrlImagemComunidade } from "../../utils/imagemComunidade";
import categoriaQueMaisGostaComunidade from "../../utils/categoriaQueMaisGostaComunidade";
import { normalizar } from "../../utils/normalizarTexto";

type TipoUsuario = "user" | "admin" | "funcionario" | "superAdmin";

type FiltroComunidade = "todas" | "geral" | "saude" | "lazer" | "esportes" | "educacao" | "meio_ambiente" | "seguranca"| "obras";

interface UsuarioAutenticado {
    sub: number;
    tipo: TipoUsuario;
}

interface ModalDescobrirComunidadesProps {
    comunidades: Comunidade[];
    comunidadesSemFiltro: Comunidade[];
    aoAbrir: (comunidade: Comunidade) => void;
    aoFechar: () => void;
    funcaoCriarComunidade: () => void;
}

function ModalDescobrirComunidades({
    comunidades,
    comunidadesSemFiltro,
    aoAbrir,
    aoFechar,
    funcaoCriarComunidade,
}: ModalDescobrirComunidadesProps) {
    const [usuario, setUsuario] = useState<UsuarioAutenticado | null>(null);
    const [buscaComunidade, setBuscaComunidade] = useState("");
    const [filtroAtivo, setFiltroAtivo] = useState<FiltroComunidade>("todas")
    const [maisItens, setMaisItens] = useState(10);

    const ehSeguidor = (c: Comunidade) =>
    c.funcaoDosMembrosComunidade?.tipo_funcao === "seguidor";

    const ComunidadesQueNaoParticipa = comunidades
    .filter((comunidade) => !comunidade.participa && !ehSeguidor(comunidade));

    const categoriasEmAlta = useMemo(
        () =>
            categoriaQueMaisGostaComunidade(
                comunidadesSemFiltro
                    .filter((c) => c.participa)
                    .map((c) => c.categorias)
                    .filter((c): c is string => Boolean(c)),
                5,
            ),
        [comunidadesSemFiltro],
    );

    const ROTULOS: Record<string, string> = {
        seguranca: "segurança",
        saude: "saúde",
        educacao: "educação",
        meio_ambiente: "meio ambiente",
    };

    const rotulo = (categoria: string) => ROTULOS[categoria] ?? categoria;

    useEffect(() => {
        async function buscarPerfil() {
            try {
                const resposta = await apiFetch("/auth/Perfil");

                if (!resposta.ok) {
                return;
                }

                const dados = await resposta.json();

                setUsuario(dados);
            } catch (erro) {
                console.error("Erro ao buscar perfil:", erro);
            }
        }

        buscarPerfil();
    }, []);

    const podeCriarComunidade =
        usuario !== null && usuario.tipo !== "user";

    const totalDeCards = 10;

    const termo = normalizar(buscaComunidade);

    // 1) Filtra a lista de quem NÃO participa, pelo nome
    const filtrados = ComunidadesQueNaoParticipa.filter((comunidade) => {
        const passaBusca =
            !termo || normalizar(comunidade.nome_comunidade).includes(termo);

        const passaCategoria =
            filtroAtivo === "todas" || comunidade.categorias === filtroAtivo;

        return passaBusca && passaCategoria;
    });

    // 2) Corta usando maisItens (que cresce no "Carregar mais")
    const visiveis = filtrados.slice(0, maisItens);

    // 3) Só mostra o botão se ainda houver itens escondidos
    const temMais = filtrados.length > maisItens;

    const carregarMais = () => setMaisItens((q) => q + totalDeCards);

    const selecionarFiltro = (filtro: FiltroComunidade) => {
        setFiltroAtivo(filtro);
        setMaisItens(totalDeCards);
    };

    return (
        <>
            <div
                className="descobrir-comunidades"
                onClick={aoFechar}
            >
                <div
                    className="descobrir-comunidades__caixa"
                    onClick={(e) => e.stopPropagation()}
                >
                    <header className="descobrir-comunidades__cabecalho">
                        <div className="descobrir-comunidades__cabecalho-conteudo">
                            <section className="descobrir-comunidades__apresentacao">
                                <div className="descobrir-comunidades__titulo-container">
                                    <h1 className="descobrir-comunidades__titulo">Descobrir comunidades</h1>
                                </div>
                                <div className="descobrir-comunidades__subtitulo-container">
                                    <span className="descobrir-comunidades__subtitulo">
                                        Encontre comunidades dos seus interesses e entre na conversa.
                                    </span>
                                </div>
                            </section>
                            <button
                                className="descobrir-comunidades__fechar"
                                type="button"
                                aria-label="Fechar"
                                onClick={aoFechar}
                            >
                                <svg
                                    className="descobrir-comunidades__fechar-icone"
                                    width="16"
                                    height="16"
                                    fill="currentColor"
                                    viewBox="0 0 16 16"
                                    aria-hidden="true"
                                >
                                    <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>
                                </svg>
                            </button>
                        </div>
                    </header>

                    <main className="descobrir-comunidades__conteudo">
                        <div className="descobrir-comunidades__corpo">
                            <div className="descobrir-comunidades__busca">
                                <div className="descobrir-comunidades__busca-campo">
                                    <div className="descobrir-comunidades__busca-icone-container">
                                        <span className="descobrir-comunidades__busca-icone">
                                            <svg
                                                width="16"
                                                height="16"
                                                fill="currentColor"
                                                viewBox="0 0 16 16"
                                                aria-hidden="true"
                                            >
                                                <path
                                                    d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"
                                                />
                                            </svg>
                                        </span>
                                    </div>
                                    <div className="descobrir-comunidades__busca-input-container">
                                        <input
                                            className="descobrir-comunidades__busca-input"
                                            name="pesquisa-input"
                                            role="textbox"
                                            aria-label="Pesquisar comunidades"
                                            autoComplete="off"
                                            dir="ltr"
                                            placeholder="Pesquisar comunidades"
                                            type="search"
                                            value={buscaComunidade}
                                            onChange={(event) => {
                                                setBuscaComunidade(event.target.value);
                                                setMaisItens(totalDeCards);
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="descobrir-comunidades__filtros">
                                <button 
                                    type="button"
                                    className={`descobrir-comunidades__filtro ${
                                        filtroAtivo === "todas" 
                                            ? "descobrir-comunidades__filtro--ativo" 
                                            : ""
                                    }`}
                                    onClick={() => selecionarFiltro("todas")}
                                >
                                    <div className="descobrir-comunidades__filtro-conteudo">
                                        <span className="descobrir-comunidades__filtro-texto">
                                            Todas
                                        </span>
                                    </div>
                                </button>

                                {categoriasEmAlta.map((categoria) => (
                                    <button 
                                        key={categoria}
                                        type="button"
                                        className={`descobrir-comunidades__filtro ${
                                            filtroAtivo === categoria 
                                                ? "descobrir-comunidades__filtro--ativo" 
                                                : ""
                                        }`}
                                        onClick={() => 
                                            selecionarFiltro(categoria as FiltroComunidade)
                                        }
                                    >
                                    <div className="descobrir-comunidades__filtro-conteudo">
                                        <span className="descobrir-comunidades__filtro-texto">
                                            {rotulo(categoria)}
                                        </span>
                                    </div>
                                </button>
                                ))}

                            </div>

                            <div className="descobrir-comunidades__lista">

                                {visiveis.map((dados) => (
                                    <div className="descobrir-comunidades__card" key={dados.id}>
                                        <div className="descobrir-comunidades__card-cabecalho">
                                            <div className="descobrir-comunidades__card-imagem">
                                                {dados.imagem_comunidade
                                                    ? <img src={obterUrlImagemComunidade(dados.imagem_comunidade)} alt="" />
                                                    : dados.nome_comunidade.slice(0, 2).toUpperCase()
                                                }
                                            </div>
                                            <div className="descobrir-comunidades__card-info">
                                                <strong className="descobrir-comunidades__card-nome">
                                                    {dados.nome_comunidade}
                                                </strong>
                                                <span className="descobrir-comunidades__card-membros">
                                                    {dados.totalParticipantes} membros
                                                </span>
                                            </div>
                                        </div>
                                        <div className="descobrir-comunidades__card-descricao-container">
                                            <p className="descobrir-comunidades__card-descricao">
                                                {dados.descricao_comunidade}
                                            </p>
                                        </div>
                                        <div className="descobrir-comunidades__card-rodape">
                                            <div className="descobrir-comunidades__card-categoria">
                                                {dados.categorias}
                                            </div>
                                            <div className="descobrir-comunidades__card-acoes">
                                                <button 
                                                    className="descobrir-comunidades__card-entrar"
                                                    onClick={() => {
                                                        aoAbrir(dados);
                                                        aoFechar();
                                                    }}
                                                >
                                                    Entrar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                
                                {filtrados.length === 0 && (
                                    <p className="descobrir-comunidades__vazio">
                                        Nenhuma comunidade encontrada
                                    </p>
                                )}

                                {temMais && (
                                    <div className="descobrir-comunidades__carregar">
                                        <button
                                            type="button"
                                            className="descobrir-comunidades__carregar-button"
                                            onClick={carregarMais}
                                        >
                                            <span>+</span> Carregar mais
                                        </button>
                                    </div>
                                )}

                            </div>
                        </div>
                    </main>

                    <footer className="descobrir-comunidades__rodape">
                        <div className="descobrir-comunidades__rodape-conteudo">
                            <div className="descobrir-comunidades__contador">
                                <span className="descobrir-comunidades__contador-texto">
                                    {filtrados.length} comunidades
                                </span>
                            </div>
                            {podeCriarComunidade && (
                                <div className="descobrir-comunidades__criar">
                                    <div className="descobrir-comunidades__criar-pergunta">
                                        <span className="descobrir-comunidades__criar-texto">
                                            Não achou a sua?
                                        </span>
                                    </div>
                                    <div className="descobrir-comunidades__criar-acao">
                                        <button 
                                            className="descobrir-comunidades__criar-botao"
                                            onClick={() => funcaoCriarComunidade()}
                                        >
                                            <span className="descobrir-comunidades__criar-icone">+</span> Criar comunidade
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </footer>
                </div>
            </div>
        </>
    )
}

export default ModalDescobrirComunidades