// Contém as regras usadas na recuperação de senha.
import { BadRequestException, Injectable } from '@nestjs/common';
import { randomBytes, createHash } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../email/email.service";
import { RedefinirSenhaDto } from './dto/redefinir-senha.dto';
import * as bcrypt from "bcrypt";
import { criarArquivoLogMonitorSeguranca } from 'src/security-log/security-log';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class RecuperacaoSenhaService {
    constructor(
            private readonly prisma: PrismaService,
            private readonly emailService: EmailService,
            private readonly cls: ClsService
        ) {}
    async solicitarRecuperacao(email: string) {

        const mensagemPadrao = {
            mensagem:
                "Um link para redefinir sua senha foi enviado para o seu e-mail."
        };

        const usuario = await this.prisma.cadastro.findFirst({
            where: {
                email: email
            },
            select: {
                id: true,
                email: true
            }
        });

        if (!usuario) {
            return mensagemPadrao;
        }

        const token = randomBytes(32).toString("hex");

        const tokenHash = createHash("sha256")
            .update(token)
            .digest("hex");

        const expiracao = new Date(Date.now() + 15 * 60 * 1000);

        criarArquivoLogMonitorSeguranca.call(
            this,
            "PASSWORD_RESET_REQUESTED",
            "/recuperacao-senha/solicitar",
            200
        );

        await this.prisma.cadastro.update({
            where: {
                id: usuario.id
            },
            data: {
                token_recuperacao: tokenHash,
                token_recuperacao_expira_em: expiracao
            }
        });

        await this.emailService.enviarRecuperacaoSenha(
            usuario.email,
            token
        );

        return mensagemPadrao;
    }

    async redefinirSenha(dados: RedefinirSenhaDto) {
        if (dados.novaSenha !== dados.confirmarNovaSenha) {
            throw new BadRequestException("As senhas não coincidem");
        }

        const temMinuscula = /[a-z]/.test(dados.novaSenha);
        const temMaiuscula = /[A-Z]/.test(dados.novaSenha);
        const temNumero = /[0-9]/.test(dados.novaSenha);
        const temEspecial = /[^0-9A-Za-z\s]/.test(dados.novaSenha);

        if (!temMinuscula || !temMaiuscula || !temNumero || !temEspecial) {
            throw new BadRequestException("Insira uma senha mais forte contendo letras maiúsculas, minúsculas, números e símbolos")
        }

        const tokenHash = createHash("sha256")
        .update(dados.token)
        .digest("hex");

        const usuario = await this.prisma.cadastro.findFirst({
            where: {
                token_recuperacao: tokenHash
            },
            select: {
                id: true,
                senha: true,
                token_recuperacao_expira_em: true
            }
        });

        if (!usuario) {
            throw new BadRequestException(
                "O link de recuperação é inválido."
            );
        }

        const expiracao = usuario.token_recuperacao_expira_em;

        if (!expiracao || expiracao.getTime() <= Date.now()) {
            await this.prisma.cadastro.update({
                where: {
                    id: usuario.id
                },
                data: {
                    token_recuperacao: null,
                    token_recuperacao_expira_em: null
                }
            });

            throw new BadRequestException(
                "O link de recuperação expirou. Solicite um novo link."
            );
        }

        const mesmaSenha = await bcrypt.compare(
            dados.novaSenha,
            usuario.senha
        );

        if (mesmaSenha) {
            throw new BadRequestException(
                "Por motivos de segurança, escolha uma senha diferente das que você já usou."
            );
        }

        const SALT_ROUNDS = 10;

        const novaSenhaHash = await bcrypt.hash(
            dados.novaSenha,
            SALT_ROUNDS
        );

        await this.prisma.cadastro.update({
            where: {
                id: usuario.id
            },
            data: {
                senha: novaSenhaHash,
                token_recuperacao: null,
                token_recuperacao_expira_em: null
            }
        });

        return {
            mensagem: "Sua senha foi redefinida com sucesso."
        };
    }
}
