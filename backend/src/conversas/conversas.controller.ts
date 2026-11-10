// Define as rotas da API relacionadas às conversas.
import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    Param,
    ParseIntPipe,
    Post,
    Query,
    Req,
    UploadedFile,
    UseGuards,
    UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";

import {
    type ArquivoMensagemUpload,
    ConversasService
} from "./conversas.service";
import { CriarConversaDto } from "./dto/criar-conversas.dto";
import { IniciarConversaSetorDto } from "./dto/iniciar-conversas-setor.dto";
import { CriarMensagemDto } from "./dto/criar-mensagem.dto";
import { AtualizarDigitacaoDto } from "./dto/atualizar-digitacao.dto";
import { ListarMensagensDto } from "./dto/listar-mensagens.dto";
import { CriarGrupoDto } from "./dto/criar-grupo.dto";
import { AdicionarParticipantesGrupoDto } from "./dto/adicionar-participantes-grupo.dto";
import { CriarAvaliacaoDto } from "./dto/criar-avaliacao.dto";
import { TransferirConversaDto } from "./dto/transferir-conversa.dto";

import {
    AuthGuard,
    type RequisicaoAutenticada
} from "../auth/auth.guard";

import { PerfisGuard } from "../auth/guards/perfis.guard";
import { Perfis } from "../auth/decorators/perfis.decorator";

@Controller("conversas")
@UseGuards(AuthGuard, PerfisGuard)
export class ConversasController {
    constructor(
        private readonly conversasService: ConversasService
    ) {}

    /*
     * Lista as conversas privadas do usuário autenticado.
     * Todos os perfis podem receber uma conversa privada do admin.
     */
    @Get()
    @Perfis("user", "admin", "funcionario", "superAdmin")
    listar(
        @Req() requisicao: RequisicaoAutenticada
    ) {
        return this.conversasService.listar(
            requisicao.usuario!.sub
        );
    }

    /*
     * Somente o administrador pode iniciar conversa privada.
     */
    @Post()
    @HttpCode(200)
    @Perfis("admin", "superAdmin")
    criarOuBuscar(
        @Req() requisicao: RequisicaoAutenticada,
        @Body() dados: CriarConversaDto
    ) {
        return this.conversasService.criarOuBuscar(
            requisicao.usuario!.sub,
            dados.usuarioId
        );
    }

    /*
     * Grupos são restritos aos perfis internos do sistema.
     * O serviço garante que usuários comuns nunca sejam participantes.
     */
    @Get("grupos")
    @Perfis("funcionario", "admin", "superAdmin")
    listarGrupos(
        @Req() requisicao: RequisicaoAutenticada
    ) {
        return this.conversasService.listarGrupos(
            requisicao.usuario!.sub
        );
    }

    @Post("grupos")
    @HttpCode(201)
    @Perfis("funcionario", "admin", "superAdmin")
    criarGrupo(
        @Req() requisicao: RequisicaoAutenticada,
        @Body() dados: CriarGrupoDto
    ) {
        return this.conversasService.criarGrupo(
            requisicao.usuario!.sub,
            dados.nome,
            dados.participanteIds
        );
    }

    @Post("grupos/:conversaId/participantes")
    @HttpCode(200)
    @Perfis("funcionario", "admin", "superAdmin")
    adicionarParticipantesGrupo(
        @Req() requisicao: RequisicaoAutenticada,
        @Param("conversaId", ParseIntPipe)
        conversaId: number,
        @Body() dados: AdicionarParticipantesGrupoDto
    ) {
        return this.conversasService.adicionarParticipantesGrupo(
            requisicao.usuario!.sub,
            conversaId,
            dados.participanteIds
        );
    }

    @Delete("grupos/:conversaId/participantes/eu")
    @HttpCode(200)
    @Perfis("funcionario", "admin", "superAdmin")
    sairDoGrupo(
        @Req() requisicao: RequisicaoAutenticada,
        @Param("conversaId", ParseIntPipe)
        conversaId: number
    ) {
        return this.conversasService.sairDoGrupo(
            requisicao.usuario!.sub,
            conversaId
        );
    }

    /*
     * Lista os atendimentos de setor.
     */
    @Get("setor")
    @Perfis("user", "funcionario", "admin", "superAdmin")
    listarAtendimentos(
        @Req() requisicao: RequisicaoAutenticada
    ) {
        return this.conversasService.listarAtendimentos(
            requisicao.usuario!.sub
        );
    }

    /*
     * Lista as avaliações recentes com o respectivo setor atendente.
     */
    @Get("avaliacoes")
    @Perfis("admin", "superAdmin")
    listarAvaliacoes() {
        return this.conversasService.listarAvaliacoes();
    }

    /*
     * Usuário inicia atendimento com um setor.
     */
    @Post("setor")
    @HttpCode(200)
    @Perfis("user")
    iniciarComSetor(
        @Req() requisicao: RequisicaoAutenticada,
        @Body() dados: IniciarConversaSetorDto
    ) {
        return this.conversasService.iniciarComoUsuario(
            requisicao.usuario!.sub,
            dados.setorId
        );
    }

    /*
     * Funcionário inicia atendimento com um usuário.
     */
    @Post("setor/usuario")
    @HttpCode(200)
    @Perfis("funcionario")
    iniciarComUsuario(
        @Req() requisicao: RequisicaoAutenticada,
        @Body() dados: CriarConversaDto
    ) {
        return this.conversasService.iniciarComoFuncionario(
            requisicao.usuario!.sub,
            dados.usuarioId
        );
    }

    /*
     * Lista mensagens de conversa privada ou de setor.
     */
    @Get(":conversaId/mensagens")
    @Perfis("user", "funcionario", "admin", "superAdmin")
    listarMensagens(
        @Req() requisicao: RequisicaoAutenticada,
        @Param("conversaId", ParseIntPipe)
        conversaId: number,
        @Query() consulta: ListarMensagensDto
    ) {
        return this.conversasService.listarMensagens(
            requisicao.usuario!.sub,
            conversaId,
            consulta
        );
    }

    /*
     * Informa até qual mensagem enviada pelo usuário os destinatários
     * visualizaram. O frontend usa esse marco para colorir os dois vistos.
     */
    @Get(":conversaId/status-leitura")
    @Perfis("user", "funcionario", "admin", "superAdmin")
    obterStatusLeitura(
        @Req() requisicao: RequisicaoAutenticada,
        @Param("conversaId", ParseIntPipe)
        conversaId: number
    ) {
        return this.conversasService.obterStatusLeitura(
            requisicao.usuario!.sub,
            conversaId
        );
    }

    /*
     * Registra que o usuário leu todas as mensagens
     * recebidas até o momento nesta conversa.
     */
    @Post(":conversaId/leitura")
    @HttpCode(200)
    @Perfis("user", "funcionario", "admin", "superAdmin")
    marcarComoLida(
        @Req() requisicao: RequisicaoAutenticada,
        @Param("conversaId", ParseIntPipe)
        conversaId: number
    ) {
        return this.conversasService.marcarComoLida(
            requisicao.usuario!.sub,
            conversaId
        );
    }

    @Get(":conversaId/digitando")
    @Perfis("user", "funcionario", "admin", "superAdmin")
    listarDigitando(
        @Req() requisicao: RequisicaoAutenticada,
        @Param("conversaId", ParseIntPipe)
        conversaId: number
    ) {
        return this.conversasService.listarDigitando(
            requisicao.usuario!.sub,
            conversaId
        );
    }

    @Post(":conversaId/digitando")
    @HttpCode(200)
    @Perfis("user", "funcionario", "admin", "superAdmin")
    atualizarDigitacao(
        @Req() requisicao: RequisicaoAutenticada,
        @Param("conversaId", ParseIntPipe)
        conversaId: number,
        @Body() dados: AtualizarDigitacaoDto
    ) {
        return this.conversasService.atualizarDigitacao(
            requisicao.usuario!.sub,
            conversaId,
            dados.digitando
        );
    }

    /*
     * Todos podem responder a uma conversa à qual possuem acesso.
     */
    @Post(":conversaId/mensagens")
    @HttpCode(201)
    @Perfis("user", "funcionario", "admin", "superAdmin")
    @UseInterceptors(FileInterceptor("arquivo", {
        limits: {
            fileSize: 25 * 1024 * 1024
        },
        fileFilter: (_requisicao, arquivo, callback) => {
            const tiposPermitidos = new Set([
                "application/pdf",
                "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "application/vnd.ms-excel",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "application/vnd.ms-powerpoint",
                "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                "text/csv",
                "text/plain",
                "image/jpeg",
                "image/png",
                "image/gif",
                "image/webp",
                "video/mp4",
                "video/webm",
                "video/quicktime",
                "audio/mpeg",
                "audio/ogg",
                "audio/wav",
                "audio/webm",
                "audio/mp4",
                "audio/aac",
                "audio/x-m4a",
                "audio/3gpp"
            ]);

            if (!tiposPermitidos.has(arquivo.mimetype)) {
                callback(
                    new BadRequestException("Tipo de arquivo não permitido."),
                    false
                );
                return;
            }

            callback(null, true);
        }
    }))
    enviarMensagem(
        @Req() requisicao: RequisicaoAutenticada,
        @Param("conversaId", ParseIntPipe)
        conversaId: number,
        @Body() dados: CriarMensagemDto,
        @UploadedFile() arquivo?: ArquivoMensagemUpload
    ) {
        return this.conversasService.enviarMensagem(
            requisicao.usuario!.sub,
            conversaId,
            dados.conteudo,
            dados.mensagemRespondidaId,
            arquivo
        );
    }

    @Post(":conversaId/finalizacao")
    @HttpCode(201)
    @Perfis("user", "funcionario", "admin", "superAdmin")
    finalizarConversa(
        @Req() requisicao: RequisicaoAutenticada,
        @Param("conversaId", ParseIntPipe)
        conversaId: number
    ) {
        return this.conversasService.finalizarConversa(
            requisicao.usuario!.sub,
            conversaId
        );
    }

    @Post(":conversaId/avaliacao")
    @HttpCode(201)
    @Perfis("user")
    criarAvaliacao(
        @Req() requisicao: RequisicaoAutenticada,
        @Param("conversaId", ParseIntPipe)
        conversaId: number,
        @Body() dados: CriarAvaliacaoDto
    ) {
        return this.conversasService.criaAvaliacao(
            requisicao.usuario!.sub,
            conversaId,
            dados
        );
    }

    @Post(":conversaId/transferencias")
    @HttpCode(201)
    @Perfis("funcionario", "admin", "superAdmin")
    transferirConversa(
        @Req() requisicao: RequisicaoAutenticada,
        @Param("conversaId", ParseIntPipe) conversaId: number,
        @Body() dados: TransferirConversaDto
    ) {
        return this.conversasService.transferirConversa(
            requisicao.usuario!.sub,
            conversaId,
            dados
        );
    }
}
