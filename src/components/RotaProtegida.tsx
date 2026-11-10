// Protege páginas que exigem autenticação ou perfil específico.
import { Navigate, Outlet } from "react-router";
import {
    useAutenticacao,
    type TipoUsuario
} from "./AutenticacaoContext";

interface RotaProtegidaProps {
    perfisPermitidos: TipoUsuario[];
}

function RotaProtegida({
    perfisPermitidos
}: RotaProtegidaProps) {
    // Reutiliza a verificação feita uma única vez durante a inicialização.
    const { situacao, usuario } = useAutenticacao();

    if (situacao === "carregando") {
        return <p>Verificando permissão...</p>;
    }

    if (!usuario) {
        return <Navigate to="/" replace />;
    }

    if (!perfisPermitidos.includes(usuario.tipo)) {
        return <Navigate to="/SemPermissao" replace />;
    }

    return <Outlet />;
}

export default RotaProtegida;
