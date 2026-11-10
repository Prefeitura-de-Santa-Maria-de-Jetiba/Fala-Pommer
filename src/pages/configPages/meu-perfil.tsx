// Permite visualizar e atualizar os dados do perfil.
import {
    type ChangeEvent,
    useEffect,
    useRef,
    useState
} from "react";
import { ModalFeedback } from "../../components/ModalFeedback";
import Cropper, { type Area, type Point } from "react-easy-crop";
import { apiFetch } from "../../services/api";

interface Perfil {
    id: number;
    nome: string;
    email: string;
    telefone: string;
    tipo_usuario: "user" | "admin" | "funcionario" | "superAdmin";
    foto_perfil_url: string | null;
    setor: {
        id: number;
        setor: string;
        sigla_setor: string;
    } | null;
}

function formatarTelefone(valor: string) {
    const numeros = valor.replace(/\D/g, "").slice(0, 11);

    if (numeros.length === 0) {
        return "";
    }

    if (numeros.length <= 2) {
        return `(${numeros}`;
    }

    const ddd = numeros.slice(0, 2);
    const quantidadePrimeiraParte = numeros.length === 11 ? 5 : 4;
    const primeiraParte = numeros.slice(2, 2 + quantidadePrimeiraParte);
    const segundaParte = numeros.slice(2 + quantidadePrimeiraParte);

    return `(${ddd}) ${primeiraParte}${
        segundaParte ? `-${segundaParte}` : ""
    }`;
}

function obterUrlFoto(url: string) {
    return url.startsWith("http://") || url.startsWith("https://")
        ? url
        : `${import.meta.env.VITE_API_URL}${url}`;
}

function carregarImagem(origem: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const imagem = new Image();

        imagem.onload = () => resolve(imagem);
        imagem.onerror = () => reject(
            new Error("Não foi possível processar a imagem selecionada.")
        );
        imagem.src = origem;
    });
}

async function criarImagemRecortada(
    origem: string,
    area: Area,
    tipo: string,
) {
    const imagem = await carregarImagem(origem);
    const canvas = document.createElement("canvas");
    const contexto = canvas.getContext("2d");

    if (!contexto) {
        throw new Error("Não foi possível recortar a imagem.");
    }

    canvas.width = area.width;
    canvas.height = area.height;
    contexto.drawImage(
        imagem,
        area.x,
        area.y,
        area.width,
        area.height,
        0,
        0,
        area.width,
        area.height,
    );

    return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
            (blob) => blob
                ? resolve(blob)
                : reject(new Error("Não foi possível recortar a imagem.")),
            tipo,
            0.9,
        );
    });
}

function MeuPerfil() {
    const inputFotoRef = useRef<HTMLInputElement>(null);
    const [perfil, setPerfil] = useState<Perfil | null>(null);
    const [formulario, setFormulario] = useState({
        nome: "",
        email: "",
        telefone: "",
    });
    const [salvando, setSalvando] = useState(false);
    const [enviandoFoto, setEnviandoFoto] = useState(false);
    const [feedback, setFeedback] = useState({
        aberto: false,
        tipo: "erro" as "erro" | "sucesso",
        mensagem: "",
    });

    const [image, setImage] = useState<string | null>(null);
    const [tipoImagem, setTipoImagem] = useState("");
    const [nomeImagem, setNomeImagem] = useState("");
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [areaRecortada, setAreaRecortada] = useState<Area | null>(null);

    useEffect(() => {
        async function carregarPerfil() {
            const resposta = await apiFetch("/usuarios/me");

            if (!resposta.ok) {
                throw new Error("Não foi possível carregar o perfil.");
            }

            const dados: Perfil = await resposta.json();
            setPerfil(dados);
            setFormulario({
                nome: dados.nome,
                email: dados.email,
                telefone: formatarTelefone(dados.telefone),
            });
        }

        carregarPerfil().catch(console.error);
    }, []);

    function cancelarAlteracoes() {
        if (!perfil) {
            return;
        }

        setFormulario({
            nome: perfil.nome,
            email: perfil.email,
            telefone: formatarTelefone(perfil.telefone),
        });
    }

    function selecionarFoto(evento: ChangeEvent<HTMLInputElement>) {
        const input = evento.currentTarget;
        const foto = input.files?.[0];

        if (!foto) {
            return;
        }

        const tiposPermitidos = new Set([
            "image/jpeg",
            "image/png",
            "image/webp"
        ]);

        if (!tiposPermitidos.has(foto.type)) {
            setFeedback({
                aberto: true,
                tipo: "erro",
                mensagem: "A foto deve estar nos formatos JPEG, PNG ou WebP."
            });
            input.value = "";
            return;
        }

        if (foto.size > 5 * 1024 * 1024) {
            setFeedback({
                aberto: true,
                tipo: "erro",
                mensagem: "A foto deve ter no máximo 5 MB."
            });
            input.value = "";
            return;
        }

        const leitor = new FileReader();

        leitor.onload = () => {
            if (typeof leitor.result !== "string") {
                return;
            }

            setImage(leitor.result);
            setTipoImagem(foto.type);
            setNomeImagem(foto.name);
            setCrop({ x: 0, y: 0 });
            setZoom(1);
            setAreaRecortada(null);
        };
        leitor.onerror = () => {
            setFeedback({
                aberto: true,
                tipo: "erro",
                mensagem: "Não foi possível ler a imagem selecionada."
            });
            input.value = "";
        };
        leitor.readAsDataURL(foto);
    }

    function fecharRecorte() {
        setImage(null);
        setTipoImagem("");
        setNomeImagem("");
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setAreaRecortada(null);

        if (inputFotoRef.current) {
            inputFotoRef.current.value = "";
        }
    }

    async function enviarFotoRecortada() {
        if (!image || !areaRecortada) {
            return;
        }

        setEnviandoFoto(true);

        try {
            const fotoRecortada = await criarImagemRecortada(
                image,
                areaRecortada,
                tipoImagem,
            );
            const arquivoRecortado = new File(
                [fotoRecortada],
                nomeImagem,
                { type: tipoImagem },
            );
            const corpo = new FormData();
            corpo.append("foto", arquivoRecortado);

            const resposta = await apiFetch(
                "/usuarios/me/foto",
                {
                    method: "PATCH",
                    body: corpo
                }
            );
            const resultado = await resposta.json() as
                | Perfil
                | { message?: string | string[] };

            if (!resposta.ok) {
                const mensagem = "message" in resultado
                    ? resultado.message
                    : undefined;

                throw new Error(
                    Array.isArray(mensagem)
                        ? mensagem.join(" ")
                        : mensagem ?? "Não foi possível alterar a foto."
                );
            }

            setPerfil(resultado as Perfil);
            fecharRecorte();
            setFeedback({
                aberto: true,
                tipo: "sucesso",
                mensagem: "Foto de perfil alterada com sucesso."
            });
        } catch (erro) {
            setFeedback({
                aberto: true,
                tipo: "erro",
                mensagem: erro instanceof Error
                    ? erro.message
                    : "Não foi possível alterar a foto."
            });
        } finally {
            setEnviandoFoto(false);
        }
    }

    async function salvarAlteracoes() {
        setSalvando(true);

        try {
            const resposta = await apiFetch(
                "/usuarios/me",
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        nome: formulario.nome,
                        email: formulario.email,
                        telefone: formulario.telefone.replace(/\D/g, ""),
                    }),
                },
            );

            const resultado = await resposta.json() as
                | Perfil
                | { message?: string | string[] };

            if (!resposta.ok) {
                const mensagem = "message" in resultado
                    ? resultado.message
                    : undefined;

                throw new Error(
                    Array.isArray(mensagem)
                        ? mensagem.join(" ")
                        : mensagem ?? "Não foi possível salvar as alterações.",
                );
            }

            const perfilAtualizado = resultado as Perfil;
            setPerfil(perfilAtualizado);
            setFormulario({
                nome: perfilAtualizado.nome,
                email: perfilAtualizado.email,
                telefone: formatarTelefone(perfilAtualizado.telefone),
            });
            setFeedback({
                aberto: true,
                tipo: "sucesso",
                mensagem: "As alterações foram salvas com sucesso.",
            });
        } catch (erro) {
            setFeedback({
                aberto: true,
                tipo: "erro",
                mensagem: erro instanceof Error
                    ? erro.message
                    : "Não foi possível salvar as alterações.",
            });
        } finally {
            setSalvando(false);
        }
    }

    return (
        <main className="meu-perfil">
            <div className="meu-perfil__grade">
                <section className="meu-perfil__cartao meu-perfil__cartao--dados">
                    <header className="meu-perfil__resumo">
                        <div className="meu-perfil__avatar">
                            {perfil?.nome.charAt(0).toUpperCase()}
                            {perfil?.foto_perfil_url && (
                                <img
                                    src={obterUrlFoto(perfil.foto_perfil_url)}
                                    alt={`Foto de perfil de ${perfil.nome}`}
                                    onError={(evento) =>
                                        evento.currentTarget.remove()
                                    }
                                />
                            )}
                        </div>

                        <div className="meu-perfil__identidade">
                            <strong className="meu-perfil__nome">
                                {perfil?.nome ?? "Carregando..."}
                            </strong>

                            <span className="meu-perfil__perfil">
                                {perfil?.tipo_usuario === "superAdmin" ? "Super Administrador" : perfil?.tipo_usuario}
                            </span>

                            <button
                                className="meu-perfil__alterar-foto"
                                type="button"
                                onClick={() => inputFotoRef.current?.click()}
                                disabled={enviandoFoto || !perfil}
                            >
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M4 7.5h3l1.4-2h7.2l1.4 2h3a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.5a2 2 0 0 1 2-2Z" />
                                    <circle cx="12" cy="13.5" r="3.5" />
                                </svg>
                                <span>
                                    {enviandoFoto ? "Enviando..." : "Alterar foto"}
                                </span>
                            </button>

                            <input
                                ref={inputFotoRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                hidden
                                onChange={selecionarFoto}
                            />

                            {image ? (
                                <div
                                    className="meu-perfil__recorte-fundo"
                                    role="dialog"
                                    aria-modal="true"
                                    aria-labelledby="titulo-recorte-foto"
                                >
                                    <div className="meu-perfil__recorte-modal">
                                        <h2 id="titulo-recorte-foto">
                                            Ajustar foto
                                        </h2>

                                        <div className="meu-perfil__recorte-area">
                                            <Cropper
                                                image={image}
                                                crop={crop}
                                                zoom={zoom}
                                                aspect={1}
                                                cropShape="round"
                                                onCropChange={setCrop}
                                                onCropComplete={(_, areaPixels) =>
                                                    setAreaRecortada(areaPixels)
                                                }
                                                onZoomChange={setZoom}
                                            />
                                        </div>

                                        <label
                                            className="meu-perfil__recorte-zoom"
                                            htmlFor="zoom-foto"
                                        >
                                            Zoom
                                            <input
                                                id="zoom-foto"
                                                type="range"
                                                min={1}
                                                max={3}
                                                step={0.1}
                                                value={zoom}
                                                onChange={(evento) =>
                                                    setZoom(Number(evento.target.value))
                                                }
                                            />
                                        </label>

                                        <div className="meu-perfil__recorte-acoes">
                                            <button
                                                type="button"
                                                className="meu-perfil__cancelar"
                                                onClick={fecharRecorte}
                                                disabled={enviandoFoto}
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                type="button"
                                                className="meu-perfil__salvar"
                                                onClick={() => void enviarFotoRecortada()}
                                                disabled={enviandoFoto || !areaRecortada}
                                            >
                                                {enviandoFoto
                                                    ? "Enviando..."
                                                    : "Confirmar"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </header>

                    <div className="meu-perfil__divisor" />

                    <form
                        className="meu-perfil__formulario"
                        onSubmit={(evento) => {
                            evento.preventDefault();
                            void salvarAlteracoes();
                        }}
                    >
                        <div className="meu-perfil__campo">
                            <label htmlFor="nome_completo">Nome completo</label>
                            <input
                                id="nome_completo"
                                type="text"
                                value={formulario.nome}
                                onChange={(evento) =>
                                    setFormulario((dadosAtuais) => ({
                                        ...dadosAtuais,
                                        nome: evento.target.value,
                                    }))
                                }
                            />
                        </div>

                        <div className="meu-perfil__campo">
                            <label htmlFor="e-mail">E-mail</label>
                            <input
                                id="e-mail"
                                type="email"
                                value={formulario.email}
                                onChange={(evento) =>
                                    setFormulario((dadosAtuais) => ({
                                        ...dadosAtuais,
                                        email: evento.target.value,
                                    }))
                                }
                            />
                        </div>

                        <div className="meu-perfil__campo">
                            <label htmlFor="telefone">Telefone</label>
                            <input
                                id="telefone"
                                type="tel"
                                inputMode="numeric"
                                maxLength={15}
                                value={formulario.telefone}
                                onChange={(evento) =>
                                    setFormulario((dadosAtuais) => ({
                                        ...dadosAtuais,
                                        telefone: formatarTelefone(
                                            evento.target.value,
                                        ),
                                    }))
                                }
                            />
                        </div>

                        <div className="meu-perfil__campo">
                            <label htmlFor="setor">Setor</label>
                            <input
                                id="setor"
                                type="text"
                                value={perfil?.setor?.setor ?? "Nenhum setor associado"}
                                readOnly
                            />
                        </div>

                        <div className="meu-perfil__acoes">
                            <button
                                className="meu-perfil__salvar"
                                type="submit"
                                disabled={salvando || !perfil}
                            >
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M5 3h12l3 3v15H4V4a1 1 0 0 1 1-1Z" />
                                    <path d="M8 3v6h8V3M8 21v-7h8v7" />
                                </svg>
                                <span>
                                    {salvando ? "Salvando..." : "Salvar alterações"}
                                </span>
                            </button>

                            <button
                                className="meu-perfil__cancelar"
                                type="button"
                                onClick={cancelarAlteracoes}
                                disabled={salvando || !perfil}
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                </section>

                <aside className="meu-perfil__lateral">
                    <section className="meu-perfil__cartao meu-perfil__seguranca">
                        <h2>Segurança da conta</h2>

                        <div className="meu-perfil__seguranca-conteudo">
                            <div
                                className="meu-perfil__seguranca-icone"
                                aria-hidden="true"
                            >
                                <svg viewBox="0 0 24 24">
                                    <path d="M12 3 5.5 6v5.5c0 4.2 2.7 7.9 6.5 9.5 3.8-1.6 6.5-5.3 6.5-9.5V6L12 3Z" />
                                    <path d="m9 12 2 2 4-4" />
                                </svg>
                            </div>

                            <div className="meu-perfil__seguranca-info">
                                <p>Sua conta está protegida</p>

                                <a
                                    href="/recuperar-senha"
                                    className="meu-perfil__alterar-senha"
                                    type="button"
                                    target="_blank"
                                >
                                    <svg viewBox="0 0 24 24" aria-hidden="true">
                                        <circle cx="8" cy="15" r="3" />
                                        <path d="m10.2 12.8 6.3-6.3a2.1 2.1 0 1 1 3 3l-1 1-1.5-1.5-1.5 1.5 1.5 1.5-1.5 1.5-1.5-1.5-3.8 3.8" />
                                    </svg>
                                    <span>Alterar senha</span>
                                </a>
                            </div>
                        </div>
                    </section>
                </aside>
            </div>

            <ModalFeedback
                aberto={feedback.aberto}
                tipo={feedback.tipo}
                mensagem={feedback.mensagem}
                aoFechar={() =>
                    setFeedback((estadoAtual) => ({
                        ...estadoAtual,
                        aberto: false,
                    }))
                }
            />
        </main>
    );
}

export default MeuPerfil;
