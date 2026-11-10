// Define as rotas da API relacionadas aos usuários.
import {
    BadRequestException,
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Req,
    UploadedFile,
    UseGuards,
    UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";

import { CriarUsuarioComRecaptchaDto } from "./dto/criar-usuario-com-recaptcha.dto";
import { AtualizarUsuarioDto } from "./dto/atualizar-usuario.dto";
import { AtualizarMeuPerfilDto } from "./dto/atualizar-meu-perfil.dto";
import { DesativarUsuarioDto } from "./dto/desativar-usuario.dto";
import {
    type ArquivoFotoPerfilUpload,
    UsuariosService
} from "./usuarios.service";

import { Perfis } from "../auth/decorators/perfis.decorator";
import { PerfisGuard } from "../auth/guards/perfis.guard";

import {
    AuthGuard,
    type RequisicaoAutenticada
} from "../auth/auth.guard";
import { RecaptchaService } from "../recaptcha/recaptcha.service";

@Controller("usuarios")
export class UsuariosController {
    constructor(
        private readonly usuariosService: UsuariosService,
        private readonly recaptchaService: RecaptchaService
    ) {}

    @Get("conversas")
    @UseGuards(AuthGuard, PerfisGuard)
    @Perfis("admin", "funcionario", "superAdmin")
    listarUsuariosParaConversa(
        @Req() requisicao: RequisicaoAutenticada
    ) {
        return this.usuariosService
            .listarUsuariosParaConversa(
                requisicao.usuario!.sub
            );
    }

    @Get("grupos/contatos")
    @UseGuards(AuthGuard, PerfisGuard)
    @Perfis("admin", "funcionario", "superAdmin")
    listarContatosParaGrupo(
        @Req() requisicao: RequisicaoAutenticada
    ) {
        return this.usuariosService.listarContatosParaGrupo(
            requisicao.usuario!.sub
        );
    }

    @Get("comunidades/contatos")
    @UseGuards(AuthGuard)
    listarContatosParaComunidade(
        @Req() requisicao: RequisicaoAutenticada
    ) {
        return this.usuariosService.listarContatosParaComunidade(
            requisicao.usuario!.sub
        );
    }

    @Get("me")
    @UseGuards(AuthGuard)
    listarMeuPerfil(
        @Req() requisicao: RequisicaoAutenticada,
    ) {
        return this.usuariosService.listarMeuPerfil(
            requisicao.usuario!.sub,
        );
    }

    @Patch("me")
    @UseGuards(AuthGuard)
    atualizarMeuPerfil(
        @Req() requisicao: RequisicaoAutenticada,
        @Body() dados: AtualizarMeuPerfilDto
    ) {
        return this.usuariosService.atualizarMeuPerfil(
            requisicao.usuario!.sub,
            dados
        );
    }

    @Patch("me/foto")
    @UseGuards(AuthGuard)
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
    atualizarFotoPerfil(
        @Req() requisicao: RequisicaoAutenticada,
        @UploadedFile() foto?: ArquivoFotoPerfilUpload
    ) {
        return this.usuariosService.atualizarFotoPerfil(
            requisicao.usuario!.sub,
            foto
        );
    }

    @Get("historico-administrativo")
    @UseGuards(AuthGuard, PerfisGuard)
    @Perfis("superAdmin")
    chamarHistorico() {
        return this.usuariosService.chamarHistorico();
    }


    @Get()
    @UseGuards(AuthGuard, PerfisGuard)
    @Perfis("admin", "superAdmin")
    listarTodos() {
        return this.usuariosService.listarTodos();
    }

    @Patch(":id/desativar")
    @UseGuards(AuthGuard, PerfisGuard)
    @Perfis("superAdmin")
    desativar(
        @Req() requisicao: RequisicaoAutenticada,
        @Param("id", ParseIntPipe) id: number,
        @Body() dados: DesativarUsuarioDto
    ) {
        return this.usuariosService.desativarUsuario(
            id,
            requisicao.usuario!.sub,
            dados.motivo
        );
    }

    @Patch(":id/ativar")
    @UseGuards(AuthGuard, PerfisGuard)
    @Perfis("superAdmin")
    ativar(
        @Req() requisicao: RequisicaoAutenticada,
        @Param("id", ParseIntPipe) id: number
    ) {
        return this.usuariosService.reativarUsuario(
            id,
            requisicao.usuario!.sub
        );
    }

    @Patch(":id")
    @UseGuards(AuthGuard, PerfisGuard)
    @Perfis("superAdmin")
    atualizar(
        @Req() requisicao: RequisicaoAutenticada,
        @Param("id", ParseIntPipe) id: number,
        @Body() dados: AtualizarUsuarioDto
    ) {
        return this.usuariosService.atualizar(
            id,
            requisicao.usuario!.sub,
            dados
        );
    }

    @Post()
    async cadastrar(
        @Body() dados: CriarUsuarioComRecaptchaDto
    ) {
        await this.recaptchaService.validar(
            dados.recaptchaToken,
            "cadastro"
        );

        return this.usuariosService.cadastrar(
            dados
        );
    }
}
