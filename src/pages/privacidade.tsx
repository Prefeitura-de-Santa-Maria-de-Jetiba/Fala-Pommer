import { useEffect } from "react";
import { Link } from "react-router";
import brasao from "../assets/img/brasao.webp";
import "./css/privacidade.css";

const SITE_PREFEITURA = "https://www.pmsmj.es.gov.br/";

const secoes = [
  ["visao-geral", "Visão geral"],
  ["dados-tratados", "Dados tratados"],
  ["finalidades", "Como usamos"],
  ["cookies", "Cookies e armazenamento"],
  ["compartilhamento", "Compartilhamento"],
  ["retencao", "Retenção e segurança"],
  ["direitos", "Seus direitos"],
] as const;

function Privacidade() {
  useEffect(() => {
    const tituloAnterior = document.title;
    document.title = "Privacidade e cookies | Fala Pommer";

    return () => {
      document.title = tituloAnterior;
    };
  }, []);

  return (
    <main className="privacidade">
      <header className="privacidade__cabecalho">
        <Link to="/" className="privacidade__marca" aria-label="Ir para o Fala Pommer">
          <img src={brasao} alt="" aria-hidden="true" />
          <span>
            <strong>Fala Pommer</strong>
            <small>Prefeitura Municipal de Santa Maria de Jetibá</small>
          </span>
        </Link>

        <Link className="privacidade__voltar" to="/">
          Voltar ao sistema
        </Link>
      </header>

      <section className="privacidade__hero" aria-labelledby="privacidade-titulo">
        <div>
          <span className="privacidade__etiqueta">Transparência e proteção de dados</span>
          <h1 id="privacidade-titulo">Aviso de Privacidade e Cookies</h1>
          <p>
            Entenda quais dados o Fala Pommer utiliza, por que eles são necessários
            e como você pode exercer seus direitos.
          </p>
          <div className="privacidade__versao">
            <span>Versão 1.0</span>
            <span>Atualizado em 28 de setembro de 2026</span>
          </div>
        </div>
      </section>

      <div className="privacidade__layout">
        <nav className="privacidade__sumario" aria-label="Seções deste aviso">
          <strong>Nesta página</strong>
          {secoes.map(([id, rotulo]) => (
            <a key={id} href={`#${id}`}>{rotulo}</a>
          ))}
        </nav>

        <article className="privacidade__conteudo">
          <section id="visao-geral">
            <div className="privacidade__titulo-secao">
              <span>01</span>
              <h2>Visão geral</h2>
            </div>
            <p>
              O Fala Pommer é uma plataforma municipal de comunicação digital entre
              cidadãos, funcionários e setores públicos. A Prefeitura Municipal de Santa
              Maria de Jetibá atua como controladora dos dados pessoais tratados no sistema.
            </p>
            <p>
              Este aviso se aplica ao site e ao aplicativo Android. O tratamento observa a
              Lei Geral de Proteção de Dados Pessoais — LGPD (Lei nº 13.709/2018), o Marco
              Civil da Internet (Lei nº 12.965/2014), os princípios da administração pública
              e as demais normas aplicáveis.
            </p>
            <div className="privacidade__destaque">
              <strong>Controlador</strong>
              <span>Prefeitura Municipal de Santa Maria de Jetibá – ES</span>
              <a href={SITE_PREFEITURA} target="_blank" rel="noreferrer">
                Acessar o portal oficial da Prefeitura
              </a>
            </div>
          </section>

          <section id="dados-tratados">
            <div className="privacidade__titulo-secao">
              <span>02</span>
              <h2>Quais dados tratamos</h2>
            </div>
            <div className="privacidade__grade">
              <div className="privacidade__cartao">
                <h3>Cadastro e perfil</h3>
                <p>Nome, data de nascimento, CPF, telefone, e-mail, senha, foto de perfil.</p>
              </div>
              <div className="privacidade__cartao">
                <h3>Atendimentos</h3>
                <p>Mensagens, áudios, arquivos, respostas, datas de envio e leitura, participantes, transferências, finalizações e avaliações.</p>
              </div>
              <div className="privacidade__cartao">
                <h3>Segurança e acesso</h3>
                <p>Sessões, nome e plataforma do dispositivo, eventos de login, tentativas de autenticação, recuperação de senha e verificação em duas etapas.</p>
              </div>
              <div className="privacidade__cartao">
                <h3>Notificações e preferências</h3>
                <p>Token de notificação, tema, alto contraste, texto ampliado, apoio de áudio e plano de fundo escolhido.</p>
              </div>
            </div>
            <p className="privacidade__nota">
              O aplicativo não recebe nem armazena a impressão digital ou o reconhecimento
              facial. Quando a biometria é habilitada, a validação é realizada pelo sistema
              seguro do próprio aparelho.
            </p>
          </section>

          <section id="finalidades">
            <div className="privacidade__titulo-secao">
              <span>03</span>
              <h2>Como e por que usamos os dados</h2>
            </div>
            <ul className="privacidade__lista">
              <li>identificar o usuário e administrar seu perfil e suas permissões;</li>
              <li>prestar e registrar atendimentos entre cidadãos e setores municipais;</li>
              <li>entregar mensagens, arquivos, notificações relacionadas ao serviço;</li>
              <li>proteger contas, prevenir fraude, abuso e acessos indevidos;</li>
              <li>registrar ações administrativas e produzir indicadores de funcionamento e qualidade;</li>
              <li>cumprir obrigações legais, regulatórias, de transparência e de interesse público.</li>
            </ul>
            <p>
              As bases legais são definidas conforme cada operação, especialmente o
              cumprimento de obrigação legal ou regulatória, a execução de políticas
              públicas e de atribuições legais do Município, o exercício regular de direitos
              e, quando adequado, o consentimento do titular.
            </p>
          </section>

          <section id="cookies">
            <div className="privacidade__titulo-secao">
              <span>04</span>
              <h2>Cookies e armazenamento no dispositivo</h2>
            </div>
            <p>
              O Fala Pommer não utiliza cookies de publicidade nem ferramentas de medição
              de audiência para marketing. Os recursos abaixo são necessários para
              autenticação, segurança ou preferências solicitadas pelo usuário.
            </p>

            <div className="privacidade__tabela-container" tabIndex={0} aria-label="Tabela de cookies">
              <table>
                <thead>
                  <tr>
                    <th>Recurso</th>
                    <th>Responsável</th>
                    <th>Finalidade</th>
                    <th>Duração</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Sessão de acesso</td>
                    <td>Fala Pommer</td>
                    <td>Manter e renovar uma sessão autenticada com segurança.</td>
                    <td>Até o encerramento/revogação da sessão.</td>
                  </tr>
                  <tr>
                    <td>Proteção contra robôs</td>
                    <td>Google reCAPTCHA</td>
                    <td>Análise de risco e prevenção de fraude, spam e abuso.</td>
                    <td>Definida pelo serviço do Google.</td>
                  </tr>
                  <tr>
                    <td>Google Identity / FedCM</td>
                    <td>Google</td>
                    <td>Oferecer a opção de login com uma Conta Google.</td>
                    <td>Conforme o navegador e as configurações da Conta Google.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="privacidade__subtitulo">Armazenamento local</h3>
            <p>
              O navegador guarda somente preferências de aparência e acessibilidade e o
              registro de que este aviso foi lido. Esses dados permanecem no dispositivo até
              serem alterados ou removidos nas configurações do navegador.
            </p>
            <p className="privacidade__nota">
              Bloquear cookies estritamente necessários pode impedir o login e a continuidade
              da sessão. Por esse motivo, eles não são apresentados como opcionais.
            </p>
          </section>

          <section id="compartilhamento">
            <div className="privacidade__titulo-secao">
              <span>05</span>
              <h2>Compartilhamento e fornecedores</h2>
            </div>
            <p>
              Os dados podem ser acessados por unidades e agentes públicos autorizados,
              conforme suas atribuições, e por fornecedores indispensáveis à operação
              técnica do serviço. Isso inclui serviços de infraestrutura, e-mail,
              comunicação em tempo real e os seguintes recursos externos:
            </p>
            <ul className="privacidade__lista">
              <li>Google reCAPTCHA, para segurança e prevenção de abuso;</li>
              <li>Google Identity, para login opcional com Conta Google;</li>
              <li>Firebase Cloud Messaging, para notificações no aplicativo;</li>
              <li>Google Fonts e jsDelivr, para fontes e dados do seletor de emojis.</li>
            </ul>
            <p>
              Não comercializamos dados pessoais. O compartilhamento com autoridades ou
              outros órgãos ocorrerá quando houver previsão legal ou necessidade para a
              comunicação de uma atribuição pública.
            </p>
          </section>

          <section id="retencao">
            <div className="privacidade__titulo-secao">
              <span>06</span>
              <h2>Retenção e segurança</h2>
            </div>
            <p>
              Os dados são mantidos durante o período necessário para prestar o serviço,
              atender finalidades administrativas e cumprir prazos legais, regulatórios,
              de auditoria e de arquivo público. Após o término da finalidade, os dados são
              eliminados ou conservados apenas quando houver fundamento legal.
            </p>
            <p>
              Adotamos controles de acesso por perfil, senhas protegidas, tokens de
              curta duração, cookie de sessão protegido, armazenamento seguro no Android,
              autenticação em duas etapas e registros de auditoria. Nenhum sistema é isento
              de riscos, por isso as medidas são continuamente revistas.
            </p>
          </section>

          <section id="direitos">
            <div className="privacidade__titulo-secao">
              <span>07</span>
              <h2>Seus direitos e contato</h2>
            </div>
            <p>
              Nos termos da LGPD, você pode solicitar confirmação e acesso aos dados,
              correção de informações incompletas ou desatualizadas, informações sobre
              compartilhamento, revisão de decisões automatizadas e, quando aplicável,
              anonimização, bloqueio, eliminação ou revogação do consentimento.
            </p>
            <div className="privacidade__contato">
              <div>
                <strong>Exercício de direitos</strong>
                <p>
                  Utilize os canais oficiais da Prefeitura Municipal de Santa Maria de
                  Jetibá. A identidade e o contato específico do encarregado pelo tratamento
                  de dados serão divulgados neste aviso após confirmação formal do Município.
                </p>
              </div>
              <a href={SITE_PREFEITURA} target="_blank" rel="noreferrer">
                Ir para o portal oficial
              </a>
            </div>
          </section>

          <footer className="privacidade__rodape">
            <p>
              Este aviso poderá ser atualizado para refletir mudanças legais, operacionais
              ou tecnológicas. A data e a versão mais recentes sempre aparecerão no início da página.
            </p>
            <Link to="/">Voltar ao Fala Pommer</Link>
          </footer>
        </article>
      </div>
    </main>
  );
}

export default Privacidade;
