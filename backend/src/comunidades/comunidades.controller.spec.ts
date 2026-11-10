import { Test, TestingModule } from '@nestjs/testing';
import {
    AuthGuard,
    type RequisicaoAutenticada
} from '../auth/auth.guard';
import { PerfisGuard } from '../auth/guards/perfis.guard';
import { ComunidadesController } from './comunidades.controller';
import { ComunidadesService } from './comunidades.service';

describe('ComunidadesController', () => {
    let controller: ComunidadesController;
    let listarComunidade: jest.Mock;
    let criarComunidade: jest.Mock;

    beforeEach(async () => {
        listarComunidade = jest.fn().mockResolvedValue([]);
        criarComunidade = jest.fn().mockResolvedValue({ id: 1, participa: true });

        const moduloTeste = Test.createTestingModule({
            controllers: [ComunidadesController],
            providers: [
                {
                    provide: ComunidadesService,
                    useValue: {
                        listarComunidade,
                        criarComunidade
                    }
                }
            ]
        })
            .overrideGuard(AuthGuard)
            .useValue({ canActivate: () => true })
            .overrideGuard(PerfisGuard)
            .useValue({ canActivate: () => true });

        const module: TestingModule = await moduloTeste.compile();

        controller = module.get<ComunidadesController>(ComunidadesController);
    });

    it('encaminha o perfil autenticado para a listagem', async () => {
        const requisicao = {
            usuario: {
                sub: 7,
                tipo: 'user'
            }
        } as RequisicaoAutenticada;

        await controller.listarComunidade(requisicao);

        expect(listarComunidade).toHaveBeenCalledWith('user', 7);
    });

    it('usa o usuário autenticado como criador e participante inicial', async () => {
        const requisicao = { usuario: { sub: 7, tipo: 'funcionario' } } as RequisicaoAutenticada;
        const dados = { nome_comunidade: 'Comunidade', descricao_comunidade: 'Descrição', ocultar_municipes: false };
        await controller.criarComunidade(requisicao, dados);
        expect(criarComunidade).toHaveBeenCalledWith(dados, 7, undefined);
    });
});
