// Contém as regras de negócio relacionadas aos setores.
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CriarSetorDTO } from './dto/criar-setor-dto';

@Injectable()
export class SetoresService {
    constructor(private readonly prisma: PrismaService) {}

    async listar() {
        return this.prisma.setores.findMany({
            select: {
                id: true,
                setor: true,
                sigla_setor: true,
                secretaria_id: true,
                secretaria: {
                    select: {
                        id: true,
                        secretaria: true,
                        sigla_secretaria: true,
                    },
                },
            },
            orderBy: [
                {
                    secretaria: {
                        secretaria: 'asc', 
                    },
                },
                {
                    setor: "asc",
                },
            ],
        });
    }

    async listarComFuncionarios() {
        const setores = await this.prisma.setores.findMany({
            where: {
                cadastros: {
                    some: {
                        tipo_usuario: 'funcionario',
                        desativado_em: null,
                    },
                },
            },
            select: {
                id: true,
                setor: true,
                sigla_setor: true,
                secretaria: {
                    select: {
                        id: true,
                        secretaria: true,
                        sigla_secretaria: true,
                    },
                },
            },
            orderBy: {
                setor: 'asc',
            },
        });

        return setores.map((setor) => ({
            id: setor.id,
            setor: setor.setor,
            sigla_setor: setor.sigla_setor,
            secretaria: setor.secretaria
                ? {
                    id: setor.secretaria.id,
                    nome: setor.secretaria.secretaria,
                    sigla_secretaria:
                        setor.secretaria.sigla_secretaria,
                }
                : null,
        }));
    }

    async listarDisponiveisParaTransferencia() {
        return this.listarComFuncionarios();
    }

    async criar(dados: CriarSetorDTO) {
        const setorExistente = await this.prisma.setores.findFirst({
            where: {
                OR: [
                    {setor: dados.setor},
                    { sigla_setor: dados.sigla_setor }
                ],
            },
        });

        if (setorExistente) {
            throw new ConflictException("O setor ou a sigla informada já existe no sistema.");
        }

        if (dados.secretaria_id != null) {
            const secretariaExistente = await this.prisma.secretaria.findUnique({
                where: {
                    id: dados.secretaria_id,
                },
                select: {
                    id: true,
                },
            });

            if (!secretariaExistente) {
                throw new NotFoundException('Secretaria não encontrada.');
            }
        }

        const setorCriado = await this.prisma.setores.create({
            data: {
                setor: dados.setor,
                sigla_setor: dados.sigla_setor,
                secretaria_id: dados.secretaria_id ?? null,
            },
            select: {
                id: true,
                setor: true,
                sigla_setor: true,
                secretaria_id: true,
                secretaria: {
                    select: {
                        id: true,
                        secretaria: true,
                        sigla_secretaria: true,
                    },
                },
            },
        });

        return setorCriado;
    };

    async apagar(id: number) {
        const resultado = await this.prisma.setores.deleteMany({
            where: { id },
        });

        if (resultado.count === 0) {
            throw new NotFoundException('Setor não encontrado.');
        }

        return { mensagem: 'Setor apagado com sucesso.' };
    }
};
