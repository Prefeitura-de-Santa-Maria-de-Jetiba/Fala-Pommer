import * as fs from "fs/promises";
import * as path from "path";

export async function criarArquivoLogMonitorSeguranca(
    this: { cls: { get<T>(key: string): T } },
    evento: string, 
    endPoint: string, 
    statusCode: number
) {
    try {
        const diretorioLogs =
            process.env.SECURITY_LOGS_DIR ??
            path.join(process.cwd(), "logs");
        const caminhoArquivo = path.join(diretorioLogs, "security-logs.jsonl");
        const ip = this.cls.get<string>('clienteIp');
        const conteudo = {
            ip: `${ip}`,
            evento: `${evento}`,
            endPoint: `${endPoint}`,
            statusCode: `${statusCode}`,
            horario: Date.now()
        };

        // Cria a pasta se não existir (não dá erro se já existir)
        await fs.mkdir(diretorioLogs, { recursive: true });

        await fs.appendFile(
            caminhoArquivo,
            JSON.stringify(conteudo) + "\n",
            "utf-8"
        );
    } catch (erro) {
        // Falha de log não pode impedir o fluxo de autenticação
        console.error(
            "Falha ao gravar log de segurança:",
            erro
        );
    }
}