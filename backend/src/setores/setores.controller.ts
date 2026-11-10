// Define as rotas da API relacionadas aos setores.
import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Post,
    UseGuards
} from "@nestjs/common";

import { SetoresService } from "./setores.service";
import { CriarSetorDTO } from "./dto/criar-setor-dto";

import { AuthGuard } from "../auth/auth.guard";
import { PerfisGuard } from "../auth/guards/perfis.guard";
import { Perfis } from "../auth/decorators/perfis.decorator";

@Controller("setores")
@UseGuards(AuthGuard, PerfisGuard)
export class SetoresController {
    constructor(
        private readonly setoresService: SetoresService
    ) {}

    @Get()
    @Perfis("user", "funcionario", "admin", "superAdmin")
    listar() {
        return this.setoresService.listar();
    }

    @Get("com-funcionarios")
    @Perfis("user")
    listarComFuncionarios() {
        return this.setoresService.listarComFuncionarios();
    }

    @Get("disponiveis-transferencia")
    @Perfis("funcionario", "admin", "superAdmin")
    listarDisponiveisParaTransferencia() {
        return this.setoresService.listarDisponiveisParaTransferencia();
    }

    @Post()
    @Perfis("admin", "superAdmin")
    criar(
        @Body() dados: CriarSetorDTO
    ) {
        return this.setoresService.criar(dados);
    }

    @Delete(":id")
    @Perfis("admin", "superAdmin")
    apagar(
        @Param("id", ParseIntPipe) id: number
    ) {
        return this.setoresService.apagar(id);
    }
}
