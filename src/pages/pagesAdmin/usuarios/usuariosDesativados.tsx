import UsuariosAtivos from "./usuariosAtivos";

// Reutiliza a tela de usuários configurada para exibir somente contas desativadas.
function UsuariosDesativados() {
    return <UsuariosAtivos exibirDesativados />;
}

export default UsuariosDesativados;
