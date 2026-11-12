import { ClsServiceManager } from "nestjs-cls";
import { PrismaService } from "src/prisma/prisma.service";
import { criarArquivoLogMonitorSeguranca } from "src/security-log/security-log";

const janela_spam_ms = 30_000;
const limiteMensagens = 10;

export default async function IdentificadorDeSpanMensagens(
    prisma: PrismaService,
    usuarioLogado: number, 
    conversaId: number
) {
    const cls = ClsServiceManager.getClsService();
    const limite = new Date(Date.now() - janela_spam_ms); // 30 segundos atrás

    let quantidadeMensagensEnviadas = await prisma.mensagem.count({
        where: {
            remetente_id: usuarioLogado,
            enviada_em: { gte: limite },
        },
    });

    if (quantidadeMensagensEnviadas > 0 && quantidadeMensagensEnviadas % limiteMensagens === 0) {
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