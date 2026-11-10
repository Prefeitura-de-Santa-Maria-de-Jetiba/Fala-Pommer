import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import "./AvisoPrivacidade.css";

const CHAVE_AVISO_PRIVACIDADE = "fala-pommer:aviso-privacidade";
const VERSAO_AVISO_PRIVACIDADE = "2026-09-28";

function avisoJaFoiVisto() {
  try {
    return localStorage.getItem(CHAVE_AVISO_PRIVACIDADE) === VERSAO_AVISO_PRIVACIDADE;
  } catch {
    return false;
  }
}

function AvisoPrivacidade() {
  const localizacao = useLocation();
  const [visivel, setVisivel] = useState(() => !avisoJaFoiVisto());
  const deveExibir = visivel && localizacao.pathname !== "/privacidade";

  useEffect(() => {
    document.documentElement.classList.toggle("aviso-privacidade-visivel", deveExibir);

    return () => {
      document.documentElement.classList.remove("aviso-privacidade-visivel");
    };
  }, [deveExibir]);

  if (!deveExibir) {
    return null;
  }

  function confirmarLeitura() {
    try {
      localStorage.setItem(CHAVE_AVISO_PRIVACIDADE, VERSAO_AVISO_PRIVACIDADE);
    } catch {
      // O fechamento continua válido nesta navegação quando o armazenamento estiver bloqueado.
    }

    setVisivel(false);
  }

  return (
    <aside
      className="aviso-privacidade"
      aria-label="Aviso sobre privacidade e cookies"
      aria-live="polite"
    >
      <div className="aviso-privacidade__icone" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M12 2 4.5 5.2v5.2c0 5 3.2 9.6 7.5 11.1 4.3-1.5 7.5-6.1 7.5-11.1V5.2L12 2Z" />
          <path d="m8.8 12 2.1 2.1 4.5-4.7" />
        </svg>
      </div>

      <div className="aviso-privacidade__texto">
        <strong>Privacidade e segurança</strong>
        <p>
          Usamos cookies necessários para autenticação e proteção contra fraudes,
          além de armazenamento local para suas preferências. Este site é protegido
          pelo reCAPTCHA.
        </p>
      </div>

      <div className="aviso-privacidade__acoes">
        <Link to="/privacidade">Saiba mais</Link>
        <button type="button" onClick={confirmarLeitura}>
          Entendi
        </button>
      </div>
    </aside>
  );
}

export default AvisoPrivacidade;
