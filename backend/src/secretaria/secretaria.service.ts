// Contém as regras de negócio relacionadas aos setores.
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CriarsecretariaDTO } from './dto/criar-secretaria-dto';

@Injectable()
export class SecretariaService {
    constructor(private readonly prisma: PrismaService) {}

    async listar() {
        return this.prisma.secretaria.findMany({
            select: {
                id: true,
                secretaria: true,
                sigla_secretaria:true
            },
            orderBy: {
                secretaria: 'asc',
            },
        });
    }

    async criar(dados: CriarsecretariaDTO) {
        const secretariaExistente = await this.prisma.secretaria.findFirst({
            where: {
                OR: [
                    {secretaria: dados.secretaria},
                    {sigla_secretaria: dados.sigla_secretaria}
                ],
            },
        });

        if(secretariaExistente) {
            throw new ConflictException('A secretaria ou a sigla informada já existe no sistema.')
        }

        const secretariaCriada = await this.prisma.secretaria.create({
            data: {
                secretaria: dados.secretaria,
                sigla_secretaria: dados.sigla_secretaria
            },
            select: {
                id: true,
                secretaria: true,
                sigla_secretaria: true
            }
        })

        return secretariaCriada;
    }

    async deletar(id: number) {
        const resultado = await this.prisma.secretaria.deleteMany({
            where: { id },
        });

        if (resultado.count === 0) {
            throw new NotFoundException('Secretaria não encontrada.');
        }

        return { mensagem: 'Secretaria apagada com sucesso.' };
    }
}
