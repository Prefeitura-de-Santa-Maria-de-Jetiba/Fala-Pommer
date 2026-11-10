// Define as rotas disponíveis na aplicação.
import { Routes, Route } from "react-router";
import { useEffect } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import "./App.css";
import Login from "./pages/login";
import Cadastro from "./pages/cadastro";
import RecuperarSenha from "./pages/recuperar-senha"
import RedefinirSenha from "./pages/RedefinirSenha";
import Home from "./pages/home";
import RotaProtegida from "./components/RotaProtegida";
import Sectors from "./pages/sectors";
import SemPermissao from "./components/SemPermissao";
import Administracao from "./pages/administracao";
import { initLenis } from "./library/lenis.ts"
import Configuracao from "./pages/configuracao.tsx"
import NaoEncontrada from "./pages/naoEncontrada.tsx";
import RecaptchaLayout from "./components/reCAPTCHALayout.tsx";
import AvisoPrivacidade from "./components/AvisoPrivacidade.tsx";
import Privacidade from "./pages/privacidade.tsx";
import ConviteComunidade from "./pages/convite-comunidade.tsx";

function App() {
    useEffect(() => {
      const lenis = initLenis();

      return () => {
        lenis.destroy();
      };
    }, []);

  return (
    <>
      <Routes>
        <Route element={<RecaptchaLayout />}>
          <Route
            path="/"
            element={
              <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
                <Login />
              </GoogleOAuthProvider>
            }
          />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/recuperar-senha" element={<RecuperarSenha />} />
        </Route>
      <Route path="/privacidade" element={<Privacidade />} />
      <Route path="/redefinir-senha" element={<RedefinirSenha />} />
      <Route path="/sem-permissao" element={<SemPermissao />} />
      <Route path="/convite/:token" element={<ConviteComunidade />} />
      <Route path="*" element={<NaoEncontrada />} />

      <Route
        element={
          <RotaProtegida
            perfisPermitidos={["admin", "funcionario", "user", "superAdmin"]}
          />
        }
      >
        <Route path="/configuracao" element={<Configuracao />} />
      </Route>

      <Route 
        element={
          <RotaProtegida
            perfisPermitidos={["superAdmin"]}
          />
        }
      >
        <Route path="/administracao" element={<Administracao />} />
      </Route>

      <Route
        element={
          <RotaProtegida
            perfisPermitidos={["admin", "funcionario", "superAdmin"]}
          />
        }
      >
        <Route path="/home" element={<Home />} />
      </Route>

      <Route
        element={
          <RotaProtegida
            perfisPermitidos={["user"]}
          />
        }
      >
        <Route path="/sectors" element={<Sectors />} />
      </Route>

      </Routes>
      <AvisoPrivacidade />
    </>
  );
}


export default App;
