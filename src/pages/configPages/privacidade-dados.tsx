import { Link } from "react-router";

function PrivacidadeDados() {
  return (
    <main className="privacidade-dados">
      <section className="privacidade-dados__resumo">
        <div className="privacidade-dados__icone" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M12 2 4.5 5.2v5.2c0 5 3.2 9.6 7.5 11.1 4.3-1.5 7.5-6.1 7.5-11.1V5.2L12 2Z" />
            <path d="m8.8 12 2.1 2.1 4.5-4.7" />
          </svg>
        </div>
        <div>
          <span className="privacidade-dados__etiqueta">TRANSPARÊNCIA</span>
          <h2>Seus dados no Fala Pommer</h2>
          <p>
            Consulte quais informações são tratadas, as finalidades, os recursos de
            segurança, os cookies necessários e seus direitos previstos na LGPD.
          </p>
        </div>
      </section>

      <section className="conta-seguranca__item">
        <Link className="conta-seguranca__acao" to="/privacidade" target="__blank">
          <div className="conta-seguranca__icone">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 2h9l3 3v17H6V2Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="M9 9h6M9 13h6M9 17h4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <div className="conta-seguranca__conteudo">
            <strong className="conta-seguranca__titulo">Aviso de Privacidade e Cookies</strong>
            <span className="conta-seguranca__descricao">
              Acesse a versão completa e atualizada do aviso.
            </span>
          </div>
          <span className="conta-seguranca__indicador bi-arrow-right" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="m9 5 7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </Link>
      </section>
    </main>
  );
}

export default PrivacidadeDados;
