import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CriarComunidadeDto } from './criar-comunidade.dto';

describe('CriarComunidadeDto', () => {
    const dadosBasicos = {
        nome_comunidade: 'Comunidade',
        descricao_comunidade: 'Descrição da comunidade'
    };

    it.each([
        ['true', true],
        ['false', false],
        [true, true],
        [false, false]
    ])('converte %p para %p', async (valor, esperado) => {
        const dados = plainToInstance(CriarComunidadeDto, {
            ...dadosBasicos,
            ocultar_municipes: valor
        });

        expect(await validate(dados)).toHaveLength(0);
        expect(dados.ocultar_municipes).toBe(esperado);
    });

    it('mantém a comunidade visível quando a opção não é enviada', async () => {
        const dados = plainToInstance(CriarComunidadeDto, dadosBasicos);

        expect(await validate(dados)).toHaveLength(0);
        expect(dados.ocultar_municipes).toBe(false);
    });
});
