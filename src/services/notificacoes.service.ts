import {
    Capacitor,
    type PluginListenerHandle,
} from "@capacitor/core";
import {
    PushNotifications,
    type Token,
} from "@capacitor/push-notifications";

import { apiFetch } from "./api";

let notificacoesInicializadas = false;
const listeners: PluginListenerHandle[] = [];

async function removerListeners() {
    const listenersAtuais = listeners.splice(0);

    await Promise.all(
        listenersAtuais.map((listener) => listener.remove()),
    );
}

async function salvarTokenNoBackend(token: Token) {
    const resposta = await apiFetch("/notificacoes/tokens", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            token: token.value,
            plataforma: Capacitor.getPlatform(),
        }),
    });

    if (!resposta.ok) {
        throw new Error("Não foi possível salvar o token de notificações.");
    }
}

export async function inicializarNotificacoes() {
    if (!Capacitor.isNativePlatform() || notificacoesInicializadas) {
        return;
    }

    notificacoesInicializadas = true;

    try {
        listeners.push(
            await PushNotifications.addListener(
                "registration",
                (token) => {
                    void salvarTokenNoBackend(token).catch((erro) => {
                        console.error(
                            "Erro ao registrar token de notificações:",
                            erro,
                        );
                    });
                },
            ),
        );

        listeners.push(
            await PushNotifications.addListener(
                "registrationError",
                (erro) => {
                    console.error(
                        "Erro ao registrar notificações:",
                        erro,
                    );
                },
            ),
        );

        listeners.push(
            await PushNotifications.addListener(
                "pushNotificationReceived",
                (notificacao) => {
                    console.log("Notificação recebida:", notificacao);
                },
            ),
        );

        listeners.push(
            await PushNotifications.addListener(
                "pushNotificationActionPerformed",
                (acao) => {
                    console.log("Notificação aberta:", acao.notification);
                },
            ),
        );

        let permissao = await PushNotifications.checkPermissions();

        if (
            permissao.receive === "prompt" ||
            permissao.receive === "prompt-with-rationale"
        ) {
            permissao = await PushNotifications.requestPermissions();
        }

        if (permissao.receive !== "granted") {
            console.warn("O usuário não autorizou as notificações.");
            return;
        }

        if (Capacitor.getPlatform() === "android") {
            await PushNotifications.createChannel({
                id: "mensagens_fala_pommer_v2",
                name: "Novas mensagens",
                description: "Notificações de novas mensagens do Fala Pommer",
                sound: "notificacao.mp3",
                importance: 4,
                vibration: true,
                visibility: 1,
            });
        }

        await PushNotifications.register();
    } catch (erro) {
        notificacoesInicializadas = false;
        await removerListeners();
        console.error("Erro ao inicializar notificações:", erro);
    }
}

export async function desregistrarNotificacoes() {
    if (!Capacitor.isNativePlatform()) {
        return;
    }

    try {
        const resposta = await apiFetch("/notificacoes/tokens/sessao", {
            method: "DELETE",
        });

        if (!resposta.ok) {
            console.warn("Não foi possível remover o token no backend.");
        }
    } catch (erro) {
        console.error("Erro ao remover token de notificações:", erro);
    }

    try {
        await PushNotifications.unregister();
    } catch (erro) {
        console.error("Erro ao cancelar notificações neste aparelho:", erro);
    } finally {
        await removerListeners();
        notificacoesInicializadas = false;
    }
}
