import { IsNotEmpty, IsString } from "class-validator";

import { CriarUsuarioDto } from "../../usuarios/dto/criar-usuario.dto";

// Mantém as mesmas validações do cadastro comum e acrescenta a prova
// temporária de que o e-mail foi autenticado pelo Google.
export class ConcluirCadastroGoogleDto extends CriarUsuarioDto {
    @IsString()
    @IsNotEmpty()
    cadastroToken!: string;
}
