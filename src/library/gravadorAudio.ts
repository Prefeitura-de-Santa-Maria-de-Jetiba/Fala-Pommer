// Reúne as funções usadas para gravar mensagens de áudio.
const FORMATOS_PREFERIDOS = [
    "audio/webm;codecs=opus",
    "audio/mp4",
    "audio/ogg;codecs=opus",
    "audio/webm",
    "audio/ogg",
];

const EXTENSOES_POR_MIME: Record<string, string> = {
    "audio/webm": "webm",
    "audio/mp4": "m4a",
    "audio/ogg": "ogg",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/aac": "aac",
    "audio/3gpp": "3gp",
};

export interface GravadorAudioAtivo {
    parar(): Promise<File>;
    cancelar(): void;
}

function obterMimeBase(mime: string) {
    return mime.split(";", 1)[0]?.trim().toLowerCase() || "audio/webm";
}

function liberarMicrofone(fluxo: MediaStream) {
    fluxo.getTracks().forEach((trilha) => trilha.stop());
}

export async function iniciarGravacaoAudio(): Promise<GravadorAudioAtivo> {
    if (!window.isSecureContext) {
        throw new DOMException(
            "O microfone exige HTTPS ou um aplicativo instalado.",
            "SecurityError",
        );
    }

    if (!navigator.mediaDevices?.getUserMedia || !("MediaRecorder" in window)) {
        throw new DOMException(
            "Este dispositivo não oferece suporte à gravação de áudio.",
            "NotSupportedError",
        );
    }

    const fluxo = await navigator.mediaDevices.getUserMedia({
        audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
        },
    });

    try {
        const formato = FORMATOS_PREFERIDOS.find((tipo) =>
            MediaRecorder.isTypeSupported(tipo),
        );

        const gravador = new MediaRecorder(
            fluxo,
            formato
                ? {
                    mimeType: formato,
                    audioBitsPerSecond: 128_000,
                }
                : {
                    audioBitsPerSecond: 128_000,
                },
        );

        const partes: Blob[] = [];
        let finalizacao: Promise<File> | null = null;
        let cancelado = false;

        gravador.addEventListener("dataavailable", (evento) => {
            if (evento.data.size > 0) {
                partes.push(evento.data);
            }
        });

        gravador.start(1_000);

        return {
            parar() {
                if (finalizacao) {
                    return finalizacao;
                }

                finalizacao = new Promise<File>((resolve, reject) => {
                    const aoParar = () => {
                        gravador.removeEventListener("error", aoFalhar);

                        if (cancelado) {
                            liberarMicrofone(fluxo);
                            reject(new Error("A gravação foi cancelada."));
                            return;
                        }

                        const mime = obterMimeBase(
                            gravador.mimeType || formato || partes[0]?.type || "audio/webm",
                        );
                        const audio = new Blob(partes, { type: mime });

                        liberarMicrofone(fluxo);

                        if (audio.size === 0) {
                            reject(new Error("Nenhum áudio foi capturado."));
                            return;
                        }

                        const extensao = EXTENSOES_POR_MIME[mime] ?? "webm";

                        resolve(
                            new File(
                                [audio],
                                `audio-${Date.now()}.${extensao}`,
                                { type: mime },
                            ),
                        );
                    };

                    const aoFalhar = (evento: Event) => {
                        gravador.removeEventListener("stop", aoParar);
                        liberarMicrofone(fluxo);

                        const erro = (evento as Event & { error?: DOMException }).error;
                        reject(erro ?? new Error("A gravação de áudio falhou."));
                    };

                    gravador.addEventListener("stop", aoParar, { once: true });
                    gravador.addEventListener("error", aoFalhar, { once: true });

                    if (gravador.state === "inactive") {
                        aoParar();
                    } else {
                        gravador.stop();
                    }
                });

                return finalizacao;
            },

            cancelar() {
                cancelado = true;

                if (gravador.state === "inactive") {
                    liberarMicrofone(fluxo);
                    return;
                }

                gravador.addEventListener(
                    "stop",
                    () => liberarMicrofone(fluxo),
                    { once: true },
                );
                gravador.stop();
            },
        };
    } catch (erro) {
        liberarMicrofone(fluxo);
        throw erro;
    }
}

export function obterMensagemErroGravacaoAudio(erro: unknown) {
    if (erro instanceof DOMException) {
        if (erro.name === "NotAllowedError") {
            return "Permita o acesso ao microfone nas configurações do navegador ou aplicativo.";
        }

        if (erro.name === "NotFoundError") {
            return "Nenhum microfone foi encontrado neste dispositivo.";
        }

        if (erro.name === "NotReadableError") {
            return "O microfone está ocupado ou não pôde ser acessado.";
        }

        if (erro.name === "SecurityError") {
            return "Para gravar pelo navegador, abra o sistema por HTTPS. No APK, conceda a permissão do microfone.";
        }

        if (erro.name === "NotSupportedError") {
            return "A gravação de áudio não é suportada neste dispositivo.";
        }
    }

    return erro instanceof Error
        ? erro.message
        : "Não foi possível gravar o áudio.";
}
