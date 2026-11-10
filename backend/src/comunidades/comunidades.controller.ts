import {
    BadRequestException,
    Body,
    Controller,
    Get,
    Patch,
    HttpCode,
    Param,
    ParseIntPipe,
    Post,
    Query,
    Req,
    UploadedFile,
    UseGuards,
    UseInterceptors,
    Delete
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
    type ArquivoFotoComunidadeUpload,
    ComunidadesService
} from './comunidades.service';
import {
    AuthGuard,
    type RequisicaoAutenticada
} from '../auth/auth.guard';
import { PerfisGuard } from '../auth/guards/perfis.guard';
import { Perfis } from '../auth/decorators/perfis.decorator';
import { CriarComunidadeDto } from './dto/criar-comunidade.dto';
import { EnviarMensagemComunidadeDto } from './dto/enviar-mensagem-comunidade.dto';
import { ListarMensagensDto } from '../conversas/dto/listar-mensagens.dto';
import { AtualizarDadosComunidade } from './dto/atualizar-dados-comunidade.dto';

@Controller('comunidades')
export class ComunidadesController {
    constructor(
        private readonly comunidadesService: ComunidadesService
    ) {}

    @Post()
    @UseGuards(AuthGuard, PerfisGuard)
    @Perfis("funcionario", "admin", "superAdmin")
    @UseInterceptors(FileInterceptor("foto", {
        limits: {
            fileSize: 5 * 1024 * 1024
        },
        fileFilter: (_requisicao, arquivo, callback) => {
            const tiposPermitidos = new Set([
                "image/jpeg",
                "image/png",
                "image/webp"
            ]);

            if (!tiposPermitidos.has(arquivo.mimetype)) {
                callback(
                    new BadRequestException(
                        "A foto deve estar nos formatos JPEG, PNG ou WebP."
                    ),
                    false
                );
                return;
            }

            callback(null, true);
        }
    }))
    criarComunidade (
        @Req() requisicao: RequisicaoAutenticada,
        @Body() dados: CriarComunidadeDto,
        @UploadedFile() foto?: ArquivoFotoComunidadeUpload
    ) {
        return this.comunidadesService.criarComunidade(dados, requisicao.usuario!.sub, foto);
    }

    @Get()
    @UseGuards(AuthGuard)
    listarComunidade(
        @Req() requisicao: RequisicaoAutenticada
    ) {
        return this.comunidadesService.listarComunidade(
            requisicao.usuario!.tipo,
            requisicao.usuario!.sub
        );
    }

    @Patch(':comunidadeId')
    @UseGuards(AuthGuard)
    @UseInterceptors(FileInterceptor("imagem_comunidade", {
        limits: {
            fileSize: 5 * 1024 * 1024
        },
        fileFilter: (_requisicao, arquivo, callback) => {
            const tiposPermitidos = new Set([
                "image/jpeg",
                "image/png",
                "image/webp"
            ]);

            if (!tiposPermitidos.has(arquivo.mimetype)) {
                callback(
                    new BadRequestException(
                        "A foto deve estar nos formatos JPEG, PNG ou WebP."
                    ),
                    false
                );
                return;
            }

            callback(null, true);
        }
    }))
    atualizarDadosComunidade(
        @Req() requisicao: RequisicaoAutenticada,
        @Param('comunidadeId', ParseIntPipe) comunidadeId: number,
        @Body() dados: AtualizarDadosComunidade,
        @UploadedFile() foto?: ArquivoFotoComunidadeUpload
    ) {
        return this.comunidadesService.atualizarDadosComunidade(
            comunidadeId,
            requisicao.usuario!.sub,
            dados,
            foto
        );
    }

    @Post(':comunidadeId/entrar')
    @HttpCode(200)
    @UseGuards(AuthGuard)
    entrarComunidade(
        @Req() requisicao: RequisicaoAutenticada,
        @Param('comunidadeId', ParseIntPipe) comunidadeId: number
    ) {
        return this.comunidadesService.entrarComunidade(comunidadeId, requisicao.usuario!);
    }

    @Post(':comunidadeId/seguir')
    @HttpCode(200)
    @UseGuards(AuthGuard)
    seguirComunidade(
        @Param('comunidadeId', ParseIntPipe) comunidadeId: number,
        @Req() requisicao: RequisicaoAutenticada,
    ) {
        return this.comunidadesService.seguirComunidade(comunidadeId, requisicao.usuario!);
    }

    @Get(':comunidadeId/mensagens')
    @UseGuards(AuthGuard)
    listarMensagens(
        @Req() requisicao: RequisicaoAutenticada,
        @Param('comunidadeId', ParseIntPipe) comunidadeId: number,
        @Query() consulta: ListarMensagensDto
    ) {
        return this.comunidadesService.listarMensagens(comunidadeId, requisicao.usuario!, consulta);
    }

    // O Home usa esta rota para abrir a comunidade no chat completo de conversas.
    @Get(':comunidadeId/conversa')
    @UseGuards(AuthGuard)
    obterConversa(
        @Req() requisicao: RequisicaoAutenticada,
        @Param('comunidadeId', ParseIntPipe) comunidadeId: number
    ) {
        return this.comunidadesService.obterConversa(comunidadeId, requisicao.usuario!);
    }

    @Post(':comunidadeId/mensagens')
    @UseGuards(AuthGuard)
    enviarMensagem(
        @Req() requisicao: RequisicaoAutenticada,
        @Param('comunidadeId', ParseIntPipe) comunidadeId: number,
        @Body() dados: EnviarMensagemComunidadeDto
    ) {
        return this.comunidadesService.enviarMensagem(comunidadeId, requisicao.usuario!, dados.conteudo);
    }

    @Post('convites/:token/aceitar')
    @UseGuards(AuthGuard)
    aceitarConvite(
        @Param('token') token: string,
        @Req() requisicao: RequisicaoAutenticada,
    ) {
        return this.comunidadesService.aceitarConviteComunidade(
            token,
            requisicao.usuario!,
        );
    }

    @Post(':comunidadeId/convite')
    @UseGuards(AuthGuard)
    criarConvite(
        @Param('comunidadeId', ParseIntPipe) comunidadeId: number,
        @Req() requisicao: RequisicaoAutenticada,
    ) {
        const usuarioId = requisicao.usuario!.sub;

        return this.comunidadesService.criarConviteComunidade(
            usuarioId,
            comunidadeId,
        );
    }

    @Get('convites')
    @UseGuards(AuthGuard)
    listarConvites() {
        return this.comunidadesService.listarConvites();
    }

    @Get('promovidoPor')
    @UseGuards(AuthGuard)
    listarPromocoes() {
        return this.comunidadesService.listarPromocoes();
    }

    @Get('rebaixadoPor')
    @UseGuards(AuthGuard)
    listarRebaixamentos() {
        return this.comunidadesService.listarRebaixamentos();
    }

    @Get(':comunidadeId/funcaoComunidade')
    @UseGuards(AuthGuard)
    carregarFuncoesUsuario(
        @Param('comunidadeId', ParseIntPipe) comunidadeId: number,
    ) {
        return this.comunidadesService.carregarFuncoesUsuario(comunidadeId);
    }

    @Post(':comunidadeId/adicionarComunidade')
    @UseGuards(AuthGuard)
    adicionarMembrosComunidade(
        @Param("comunidadeId", ParseIntPipe) comunidadeId: number,
        @Body("usuarioIds") usuarioIds: number[],
        @Req() requisicao: RequisicaoAutenticada,
    ) {
        const usuarioId = requisicao.usuario!.sub;

        return this.comunidadesService.adicionarMembrosComunidade(
            usuarioId,
            comunidadeId,
            usuarioIds,
        );
    }

    @Delete(':conversaId/:comunidadeId/sair')
    @UseGuards(AuthGuard)
    @HttpCode(200)
    sairComunidade (
        @Param("conversaId", ParseIntPipe) conversaId: number,
        @Param("comunidadeId", ParseIntPipe) comunidadeId: number,
        @Req() requisicao: RequisicaoAutenticada
    ) {
        const usuarioLogadoId = requisicao.usuario!.sub;

        return this.comunidadesService.sairComunidade(
            usuarioLogadoId,
            comunidadeId,
            conversaId
        );
    }

    @Delete(':conversaId/:comunidadeId/:id/remover')
    @UseGuards(AuthGuard)
    @HttpCode(200)
    removerDaComunidade(
        @Param("conversaId", ParseIntPipe) conversaId: number,
        @Param("comunidadeId", ParseIntPipe) comunidadeId: number,
        @Param("id", ParseIntPipe) id: number,
        @Req() requisicao: RequisicaoAutenticada
    ) {
        const usuarioLogadoId = requisicao.usuario!.sub;

        return this.comunidadesService.removerDaComunidade(
            usuarioLogadoId,
            comunidadeId,
            conversaId,
            id
        );
    }

    @Post(':id/:comunidadeId/promover')
    @UseGuards(AuthGuard)
    promoverMembroComunidade(
        @Param("comunidadeId", ParseIntPipe) comunidadeId: number,
        @Param("id", ParseIntPipe) id: number,
        @Req() requisicao: RequisicaoAutenticada
    ) {
        const usuarioLogadoId = requisicao.usuario!.sub;

        return this.comunidadesService.promoverMembroComunidade(
            id,
            usuarioLogadoId,
            comunidadeId
        );
    }

    @Post(':id/:comunidadeId/rebaixar')
    @UseGuards(AuthGuard)
    rebaixarAdminComunidade(
        @Param("comunidadeId", ParseIntPipe) comunidadeId: number,
        @Param("id", ParseIntPipe) id: number,
        @Req() requisicao: RequisicaoAutenticada
    ) {
        const usuarioLogadoId = requisicao.usuario!.sub;

        return this.comunidadesService.rebaixarAdminComunidade(
            id,
            usuarioLogadoId,
            comunidadeId
        );
    }

    @Delete(':comunidadeId/deixar-seguir')
    @UseGuards(AuthGuard)
    deixarSeguirComunidadeFuncao(
        @Param("comunidadeId", ParseIntPipe) comunidadeId: number,
        @Req() requisicao: RequisicaoAutenticada
    ) {
        return this.comunidadesService.deixarSeguirComunidadeFuncao(
            comunidadeId,
            requisicao.usuario!
        );
    }
}
