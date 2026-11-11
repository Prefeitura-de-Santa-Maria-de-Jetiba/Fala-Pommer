import { ClsServiceManager } from "nestjs-cls";
import { prisma } from "src/lib/prisma";
import { criarArquivoLogMonitorSeguranca } from "src/security-log/security-log";

const janela_spam_ms = 30_000;
const limiteMensagens = 10;

export default async function IdentificadorDeSpanMensagens(
    usuarioLogado: number, 
    conversaId: number
) {
    const cls = ClsServiceManager.getClsService();
    const limite = new Date(Date.now() - janela_spam_ms); // 30 segundos atrás

    const quantidadeMensagensEnviadas = await prisma.mensagem.count({
        where: {
            remetente_id: usuarioLogado,
            enviada_em: { gte: limite },
        },
    });

    if (quantidadeMensagensEnviadas >= limiteMensagens) {
        criarArquivoLogMonitorSeguranca.call(
            { cls },
            "MENSAGEM_IDENTIFICADA_COMO_SPAM",
            `/conversas/${conversaId}/mensagens`,
            429
        );

        return true; // é spam
    };

    return false;
}