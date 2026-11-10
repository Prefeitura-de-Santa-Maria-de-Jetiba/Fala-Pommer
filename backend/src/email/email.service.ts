// Envia os e-mails usados pelo sistema.
import { Injectable } from "@nestjs/common";
import * as nodemailer from "nodemailer";

@Injectable()
export class EmailService {
    private readonly transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: process.env.SMTP_PORT === "465",

        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
        }
    });

    async enviarConfirmacaoCadastro(email: string, nome: string) {
        try {
            const linkLogin = `${process.env.FRONTEND_URL}`;

            if (!linkLogin) {
                throw new Error("FRONTEND_URL não foi configurada.");
            }

            this.transporter.sendMail({
                from: `"Fala Pommer" <${process.env.SMTP_USER}>`,
                to: email,
                subject: "Cadastro confirmado | Fala Pommer",

                text: `
                    Olá, ${nome}

                    Seu cadastro no Fala Pommer foi realizado com sucesso.

                    Agora você pode acessar a plataforma e utilizar nossos canais de atendimento para entrar em contato com os setores disponíveis de forma rápida e segura.

                    Acesse sua conta utilizando o e-mail cadastrado:

                    ${linkLogin}

                    Se você não realizou este cadastro, entre em contato com nossa equipe de suporte.

                    Atenciosamente,
                    Equipe Fala Pommer
                    Prefeitura Municipal
                `,

                html: `
                    <!DOCTYPE html>
                    <html lang="pt-BR">
                        <head>
                            <meta charset="UTF-8">
                        </head>

                        <body style="
                            margin: 0;
                            padding: 0;
                            background-color: #f3f5f8;
                            font-family: Arial, sans-serif;
                            color: #252525;
                        ">
                            <table
                                width="100%"
                                cellpadding="0"
                                cellspacing="0"
                                role="presentation"
                                style="padding: 40px 15px;"
                            >
                                <tr>
                                    <td align="center">
                                        <table
                                            width="100%"
                                            cellpadding="0"
                                            cellspacing="0"
                                            role="presentation"
                                            style="
                                                max-width: 600px;
                                                background-color: #ffffff;
                                                border-radius: 12px;
                                                overflow: hidden;
                                                box-shadow: 0 4px 18px rgba(0, 0, 0, 0.08);
                                            "
                                        >
                                            <tr>
                                                <td
                                                    align="center"
                                                    style="
                                                        padding: 28px;
                                                        background-color: #1351b4;
                                                        color: #ffffff;
                                                    "
                                                >
                                                    <h1 style="margin: 0; font-size: 26px;">
                                                        Fala Pommer
                                                    </h1>

                                                    <p style="margin: 8px 0 0;">
                                                        Cadastro confirmado
                                                    </p>
                                                </td>
                                            </tr>

                                            <tr>
                                                <td style="padding: 35px 40px;">
                                                    <h2 style="
                                                        margin: 0 0 20px;
                                                        font-size: 21px;
                                                        color: #1351b4;
                                                    ">
                                                        Olá, ${nome}!
                                                    </h2>

                                                    <p style="line-height: 1.6;">
                                                        Seu cadastro no
                                                        <strong>Fala Pommer</strong>
                                                        foi realizado com sucesso.
                                                    </p>

                                                    <p style="line-height: 1.6;">
                                                        Agora você pode acessar a plataforma
                                                        e entrar em contato com os setores
                                                        disponíveis de forma rápida e segura.
                                                    </p>

                                                    <table
                                                        width="100%"
                                                        cellpadding="0"
                                                        cellspacing="0"
                                                        role="presentation"
                                                    >
                                                        <tr>
                                                            <td
                                                                align="center"
                                                                style="padding: 22px 0;"
                                                            >
                                                                <a
                                                                    href="${linkLogin}"
                                                                    target="_blank"
                                                                    style="
                                                                        display: inline-block;
                                                                        padding: 14px 28px;
                                                                        background-color: #1351b4;
                                                                        color: #ffffff;
                                                                        text-decoration: none;
                                                                        border-radius: 6px;
                                                                        font-weight: bold;
                                                                    "
                                                                >
                                                                    Acessar o Fala Pommer
                                                                </a>
                                                            </td>
                                                        </tr>
                                                    </table>

                                                    <p style="
                                                        margin-top: 20px;
                                                        font-size: 14px;
                                                        line-height: 1.5;
                                                        color: #666666;
                                                    ">
                                                        Se você não realizou este cadastro,
                                                        entre em contato com nossa equipe
                                                        de suporte.
                                                    </p>
                                                </td>
                                            </tr>

                                            <tr>
                                                <td
                                                    align="center"
                                                    style="
                                                        padding: 22px;
                                                        background-color: #eef3fb;
                                                        color: #555555;
                                                        font-size: 13px;
                                                        line-height: 1.5;
                                                    "
                                                >
                                                    Equipe Fala Pommer<br>
                                                    Prefeitura Municipal
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </body>
                    </html>
                `,
            });
        } catch (erro){
            console.log("Erro ao enviar o e-mail", erro);
        }
    }

    async enviarRecuperacaoSenha(email: string, token: string) {
        try {
            const linkRecuperacao =
                `${process.env.FRONTEND_URL}/redefinir-senha?token=${encodeURIComponent(token)}`;

            this.transporter.sendMail({
                from: `"Fala Pommer" <${process.env.SMTP_USER}>`,
                to: email,
                subject: "Redefinição de senha | Fala Pommer",

                text: `
                Olá,

                Recebemos uma solicitação para redefinir a senha da sua conta no Fala Pommer.

                Acesse o endereço abaixo para criar uma nova senha:

                ${linkRecuperacao}

                Este link expira em 15 minutos e poderá ser utilizado apenas uma vez.

                Se você não solicitou essa alteração, ignore este e-mail. Sua senha continuará a mesma.

                Equipe Fala Pommer
                `,

                html: `
                <!DOCTYPE html>
                <html lang="pt-BR">
                <body
                    style="
                    margin: 0;
                    padding: 0;
                    background-color: #f2f4f7;
                    font-family: Arial, Helvetica, sans-serif;
                    color: #252525;
                    "
                >
                    <div
                    style="
                        display: none;
                        max-height: 0;
                        overflow: hidden;
                        opacity: 0;
                    "
                    >
                    Use este link para redefinir sua senha no Fala Pommer.
                    </div>

                    <table
                    role="presentation"
                    width="100%"
                    cellspacing="0"
                    cellpadding="0"
                    border="0"
                    style="background-color: #f2f4f7; padding: 40px 16px;"
                    >
                    <tr>
                        <td align="center">
                        <table
                            role="presentation"
                            width="100%"
                            cellspacing="0"
                            cellpadding="0"
                            border="0"
                            style="
                            max-width: 600px;
                            background-color: #ffffff;
                            border-radius: 16px;
                            overflow: hidden;
                            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
                            "
                        >
                            <tr>
                            <td
                                style="
                                padding: 28px 40px;
                                background-color: #1351b4;
                                color: #ffffff;
                                "
                            >
                                <p
                                style="
                                    margin: 0;
                                    font-size: 22px;
                                    font-weight: 700;
                                "
                                >
                                Fala Pommer
                                </p>

                                <p
                                style="
                                    margin: 6px 0 0;
                                    color: #dbe8ff;
                                    font-size: 14px;
                                "
                                >
                                Comunicação segura e acessível
                                </p>
                            </td>
                            </tr>

                            <tr>
                            <td style="padding: 40px;">
                                <h1
                                style="
                                    margin: 0 0 18px;
                                    color: #1d2939;
                                    font-size: 26px;
                                    line-height: 1.3;
                                "
                                >
                                Redefinição de senha
                                </h1>

                                <p
                                style="
                                    margin: 0 0 16px;
                                    color: #475467;
                                    font-size: 16px;
                                    line-height: 1.6;
                                "
                                >
                                Olá,
                                </p>

                                <p
                                style="
                                    margin: 0 0 28px;
                                    color: #475467;
                                    font-size: 16px;
                                    line-height: 1.6;
                                "
                                >
                                Recebemos uma solicitação para redefinir a senha da
                                sua conta. Clique no botão abaixo para criar uma
                                nova senha.
                                </p>

                                <table
                                role="presentation"
                                cellspacing="0"
                                cellpadding="0"
                                border="0"
                                style="margin: 0 auto 28px;"
                                >
                                <tr>
                                    <td
                                    align="center"
                                    style="
                                        border-radius: 8px;
                                        background-color: #1351b4;
                                    "
                                    >
                                    <a
                                        href="${linkRecuperacao}"
                                        target="_blank"
                                        style="
                                        display: inline-block;
                                        padding: 15px 28px;
                                        color: #ffffff;
                                        font-size: 16px;
                                        font-weight: 700;
                                        text-decoration: none;
                                        "
                                    >
                                        Redefinir minha senha
                                    </a>
                                    </td>
                                </tr>
                                </table>

                                <div
                                style="
                                    margin-bottom: 24px;
                                    padding: 16px;
                                    border: 1px solid #b2ccff;
                                    border-radius: 8px;
                                    background-color: #eff4ff;
                                "
                                >
                                <p
                                    style="
                                    margin: 0;
                                    color: #1849a9;
                                    font-size: 14px;
                                    line-height: 1.5;
                                    "
                                >
                                    Por segurança, este link expira em
                                    <strong>15 minutos</strong> e poderá ser utilizado
                                    apenas uma vez.
                                </p>
                                </div>

                                <p
                                style="
                                    margin: 0 0 8px;
                                    color: #667085;
                                    font-size: 13px;
                                    line-height: 1.5;
                                "
                                >
                                Se o botão não funcionar, copie e cole este endereço
                                no navegador:
                                </p>

                                <p
                                style="
                                    margin: 0 0 28px;
                                    font-size: 13px;
                                    line-height: 1.5;
                                    word-break: break-all;
                                "
                                >
                                <a
                                    href="${linkRecuperacao}"
                                    style="color: #1351b4;"
                                >
                                    ${linkRecuperacao}
                                </a>
                                </p>

                                <p
                                style="
                                    margin: 0;
                                    color: #667085;
                                    font-size: 14px;
                                    line-height: 1.6;
                                "
                                >
                                Se você não solicitou essa alteração, ignore este
                                e-mail. Sua senha continuará a mesma.
                                </p>
                            </td>
                            </tr>

                            <tr>
                            <td
                                style="
                                padding: 24px 40px;
                                background-color: #f8fafc;
                                border-top: 1px solid #eaecf0;
                                text-align: center;
                                "
                            >
                                <p
                                style="
                                    margin: 0;
                                    color: #98a2b3;
                                    font-size: 12px;
                                    line-height: 1.5;
                                "
                                >
                                Esta é uma mensagem automática do Fala Pommer.
                                Não responda a este e-mail.
                                </p>
                            </td>
                            </tr>
                        </table>
                        </td>
                    </tr>
                    </table>
                </body>
                </html>
                `,
            });
        } catch (erro) {
            console.log("Erro ao enviar o e-mail", erro);
        }
    }

    async enviarCodigoDoisFatores(email: string, codigo: string) {
        await this.transporter.sendMail({
            from: `"Fala Pommer" <${process.env.SMTP_USER}>`,
            to: email,
            subject: "Código de verificação | Fala Pommer",
            text: `Seu código de verificação é ${codigo}. Ele expira em 5 minutos e pode ser utilizado apenas uma vez.`,
            html: `
                <!DOCTYPE html>
                <html lang="pt-BR">
                <body style="margin: 0; padding: 24px; background-color: #f2f4f7; font-family: Arial, Helvetica, sans-serif; color: #252525;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                            <td align="center">
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 560px; background-color: #ffffff; border-radius: 12px; padding: 32px;">
                                    <tr>
                                        <td>
                                            <h1 style="margin: 0 0 16px; color: #1351b4; font-size: 24px;">Verificação em duas etapas</h1>
                                            <p style="margin: 0 0 24px; color: #475467; font-size: 16px; line-height: 1.5;">
                                                Use o código abaixo para continuar:
                                            </p>
                                            <p style="margin: 0 0 24px; color: #101828; font-size: 36px; font-weight: 700; letter-spacing: 8px; text-align: center;">
                                                ${codigo}
                                            </p>
                                            <p style="margin: 0 0 12px; color: #667085; font-size: 14px; line-height: 1.5;">
                                                Este código expira em 5 minutos e pode ser utilizado apenas uma vez.
                                            </p>
                                            <p style="margin: 0; color: #667085; font-size: 14px; line-height: 1.5;">
                                                Se você não solicitou este código, ignore esta mensagem.
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            `
        });
    }
}
