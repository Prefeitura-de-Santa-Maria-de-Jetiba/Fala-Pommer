import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ComunidadesService } from './comunidades.service';
import { MensagensCriptografiaService } from '../criptografia/mensagens-criptografia.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('ComunidadesService', () => {
    let service: ComunidadesService;
    let findMany: jest.Mock;
    let create: jest.Mock;
    let findUnique: jest.Mock;
    let mensagemCreate: jest.Mock;
    let mensagemFindMany: jest.Mock;
    let participanteUpsert: jest.Mock;
    let comunidadeUpdate: jest.Mock;
    let conversaFindUnique: jest.Mock;
    const usuario = { sub: 7, tipo: 'funcionario' as const };
    const comunidade = {
        id: 1,
        nome_comunidade: 'Comunidade',
        descricao_comunidade: 'Descrição',
        imagem_comunidade: null,
        ocultar_municipes: false,
        conversa_id: 12,
        conversa: {
            conversa_participante: [{ usuario_id: 7 }],
            _count: { conversa_participante: 1 }
        }
    };

    beforeEach(async () => {
        findMany = jest.fn().mockResolvedValue([]);
        create = jest.fn().mockResolvedValue(comunidade);
        findUnique = jest.fn().mockResolvedValue(comunidade);
        mensagemCreate = jest.fn().mockResolvedValue({ id: 4, enviada_em: new Date(), remetente: { id: 7, nome: 'Criador' } });
        mensagemFindMany = jest.fn().mockResolvedValue([]);
        participanteUpsert = jest.fn().mockResolvedValue({});
        comunidadeUpdate = jest.fn().mockResolvedValue(comunidade);
        conversaFindUnique = jest.fn().mockResolvedValue({
            id: 12,
            criada_em: new Date('2026-10-07T12:00:00Z'),
            conversa_participante: [{ cadastro: { id: 7, nome: 'Criador', tipo_usuario: 'funcionario', foto_perfil_url: null } }]
        });
        const banco = {
            comunidade: { findMany, create, findUnique, findUniqueOrThrow: findUnique, update: comunidadeUpdate },
            mensagem: { create: mensagemCreate, findMany: mensagemFindMany },
            conversa_participante: { upsert: participanteUpsert },
            conversa: { findUniqueOrThrow: conversaFindUnique },
            $queryRaw: jest.fn().mockResolvedValue([{ id: 1 }])
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ComunidadesService,
                {
                    provide: PrismaService,
                    useValue: { ...banco, $transaction: jest.fn((acao) => acao(banco)) }
                },
                {
                    provide: MensagensCriptografiaService,
                    useValue: {
                        criptografar: jest.fn((texto) => `cifrado:${texto}`),
                        descriptografar: jest.fn((texto) => texto.replace('cifrado:', ''))
                    }
                }
            ]
        }).compile();

        service = module.get<ComunidadesService>(ComunidadesService);
    });

    it('persiste a restrição ao criar a comunidade', async () => {
        await service.criarComunidade({
            nome_comunidade: 'Comunidade interna',
            descricao_comunidade: 'Visível apenas para a equipe.',
            ocultar_municipes: true
        }, usuario.sub);

        expect(create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    ocultar_municipes: true
                })
            })
        );
    });

    it('oculta comunidades restritas do munícipe', async () => {
        await service.listarComunidade('user', usuario.sub);

        expect(findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    ocultar_municipes: false
                }
            })
        );
    });

    it.each(['funcionario', 'admin', 'superAdmin'] as const)(
        'lista todas as comunidades para %s',
        async (tipoUsuario) => {
            await service.listarComunidade(tipoUsuario, usuario.sub);

            expect(findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: undefined
                })
            );
        }
    );

    it('cria a conversa e inclui o criador atomicamente, retornando a participação', async () => {
        const resultado = await service.criarComunidade({
            nome_comunidade: 'Comunidade', descricao_comunidade: 'Descrição', ocultar_municipes: false
        }, usuario.sub);
        expect(create.mock.calls[0][0].data.conversa.create).toEqual({
            tipo: 'comunidade', nome: 'Comunidade',
            conversa_participante: { create: { usuario_id: usuario.sub } }
        });
        expect(resultado).toMatchObject({ id: 1, participa: true, totalParticipantes: 1 });
    });

    it('retorna a conversa vinculada no formato esperado pelo chat do Home', async () => {
        await expect(service.obterConversa(1, usuario)).resolves.toMatchObject({
            id: 12, comunidadeId: 1, tipo: 'comunidade', nome: 'Comunidade',
            totalParticipantes: 1, somenteLeitura: false,
            participantes: [{ id: 7, nome: 'Criador', tipo_usuario: 'funcionario' }]
        });
        expect(conversaFindUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 12 } }));
    });

    it('recusa mensagens e leitura de quem ainda não participa', async () => {
        findUnique.mockResolvedValue({ ...comunidade, conversa: { ...comunidade.conversa, conversa_participante: [] } });
        await expect(service.enviarMensagem(1, usuario, 'Olá')).rejects.toThrow(ForbiddenException);
        await expect(service.listarMensagens(1, usuario, {})).rejects.toThrow(ForbiddenException);
        await expect(service.obterConversa(1, usuario)).rejects.toThrow(ForbiddenException);
        expect(mensagemCreate).not.toHaveBeenCalled();
        expect(mensagemFindMany).not.toHaveBeenCalled();
        expect(conversaFindUnique).not.toHaveBeenCalled();
    });

    it('impede munícipes de entrar, ler ou escrever em uma comunidade oculta', async () => {
        findUnique.mockResolvedValue({ ...comunidade, ocultar_municipes: true });
        const municipe = { sub: 8, tipo: 'user' as const };
        await expect(service.entrarComunidade(1, municipe)).rejects.toThrow(NotFoundException);
        await expect(service.listarMensagens(1, municipe, {})).rejects.toThrow(NotFoundException);
        await expect(service.enviarMensagem(1, municipe, 'Olá')).rejects.toThrow(NotFoundException);
        await expect(service.obterConversa(1, municipe)).rejects.toThrow(NotFoundException);
        expect(participanteUpsert).not.toHaveBeenCalled();
        expect(mensagemCreate).not.toHaveBeenCalled();
    });

    it('permite a participação de munícipes em comunidades públicas', async () => {
        const municipe = { sub: 7, tipo: 'user' as const };
        await expect(service.entrarComunidade(1, municipe)).resolves.toMatchObject({ participa: true });
        await service.entrarComunidade(1, municipe);
        expect(participanteUpsert).toHaveBeenCalledWith(expect.objectContaining({
            where: { conversa_id_usuario_id: { conversa_id: 12, usuario_id: 7 } }, update: {}
        }));
    });

    it('salva o texto criptografado e devolve o texto legível ao remetente', async () => {
        const resultado = await service.enviarMensagem(1, usuario, '  Olá!  ');
        expect(mensagemCreate).toHaveBeenCalledWith(expect.objectContaining({
            data: { conversa_id: 12, remetente_id: 7, origem: 'usuario', conteudo: 'cifrado:Olá!' }
        }));
        expect(resultado.conteudo).toBe('Olá!');
    });

    it('cria um chat ao entrar em uma comunidade anterior à migração', async () => {
        findUnique.mockResolvedValue({ ...comunidade, conversa_id: null, conversa: null });
        const resultado = await service.entrarComunidade(1, usuario);
        expect(resultado).toMatchObject({ participa: true, totalParticipantes: 1 });
        expect(comunidadeUpdate).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: 1 },
            data: {
                conversa: {
                    create: {
                        tipo: 'comunidade', nome: 'Comunidade',
                        conversa_participante: { create: { usuario_id: 7 } }
                    }
                }
            }
        }));
        expect(participanteUpsert).not.toHaveBeenCalled();
    });

    it('recusa acesso a uma comunidade inexistente', async () => {
        findUnique.mockResolvedValue(null);
        await expect(service.entrarComunidade(100, usuario)).rejects.toThrow(NotFoundException);
        await expect(service.enviarMensagem(100, usuario, 'Olá')).rejects.toThrow(NotFoundException);
        expect(mensagemCreate).not.toHaveBeenCalled();
    });

    it('consulta novas mensagens a partir do cursor em ordem crescente', async () => {
        await service.listarMensagens(1, usuario, { depoisDe: 30, limite: 100 });
        expect(mensagemFindMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { conversa_id: 12, id: { gt: 30 } }, orderBy: { id: 'asc' }, take: 100
        }));
    });

    it('recusa mensagens vazias e excessivamente longas', async () => {
        await expect(service.enviarMensagem(1, usuario, '   ')).rejects.toThrow();
        await expect(service.enviarMensagem(1, usuario, 'a'.repeat(4001))).rejects.toThrow();
        expect(mensagemCreate).not.toHaveBeenCalled();
    });

    it('devolve o histórico em ordem cronológica e descriptografa o conteúdo', async () => {
        mensagemFindMany.mockResolvedValue([
            { id: 2, conteudo: 'cifrado:segunda', enviada_em: new Date(), remetente: { id: 7 } },
            { id: 1, conteudo: 'cifrado:primeira', enviada_em: new Date(), remetente: { id: 7 } }
        ]);
        const resultado = await service.listarMensagens(1, usuario, { antesDe: 3, limite: 50 });
        expect(resultado.map((item) => item.conteudo)).toEqual(['primeira', 'segunda']);
        expect(mensagemFindMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { conversa_id: 12, id: { lt: 3 } }, orderBy: { id: 'desc' }, take: 50
        }));
    });
});
