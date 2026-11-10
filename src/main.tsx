// Inicializa a aplicação React no navegador.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App.tsx";
import { NavegacaoAudioProvider } from "./components/NavegacaoAudioProvider.tsx";
import { inicializarAltoContraste } from "./library/altoContraste.ts";
import { inicializarTextoAmpliado } from "./library/textoAmpliado.ts";
import { inicializarPlanoFundoConversa } from "./library/planoFundoConversa.ts";
import { inicializarTemaAparencia } from "./library/temaAparencia.ts";
import { AutenticacaoProvider } from "./components/AutenticacaoProvider.tsx";
import { inicializarPaletaAcessivel } from "./library/paletaAcessivel.ts";
import "./index.css";

inicializarAltoContraste();
inicializarTextoAmpliado();
inicializarPlanoFundoConversa();
inicializarTemaAparencia();
inicializarPaletaAcessivel();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      {/* Disponibiliza a sessão restaurada para todas as rotas da aplicação. */}
      <AutenticacaoProvider>
        <NavegacaoAudioProvider>
          <App />
        </NavegacaoAudioProvider>
      </AutenticacaoProvider>
    </BrowserRouter>
  </StrictMode>
);
