import { Controller, Get, UseGuards, Delete, Post, Body, Param, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { PerfisGuard } from 'src/auth/guards/perfis.guard';
import { SecretariaService } from './secretaria.service';
import { Perfis } from 'src/auth/decorators/perfis.decorator';
import { CriarsecretariaDTO } from './dto/criar-secretaria-dto';

@Controller('secretaria')
@UseGuards(AuthGuard, PerfisGuard)
export class SecretariaController {
    constructor(
        private readonly secretariaService: SecretariaService
    ) {}

    @Get()
    @Perfis('admin', 'user', 'funcionario', 'superAdmin')
    listar() {
        return this.secretariaService.listar()
    }

    @Post()
    @Perfis("admin", "superAdmin")
    criar(
        @Body() dados: CriarsecretariaDTO
    ) {
        return this.secretariaService.criar(dados);
    }
    
    @Delete(":id")
    @Perfis("admin", "superAdmin")
    deletar(
        @Param("id", ParseIntPipe) id: number
    ) {
        return this.secretariaService.deletar(id);
    }

}
