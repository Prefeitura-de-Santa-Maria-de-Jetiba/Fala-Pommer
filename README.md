<div align="center">
  <img src="./assets/logo.png" alt="Logo do Fala Pommer" width="180">

# Fala Pommer

**Plataforma de comunicação**

[![Status](https://img.shields.io/badge/status-em%20desenvolvimento-1351B4)](#status-do-projeto)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react\&logoColor=white)](https://react.dev/)
[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs\&logoColor=white)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma\&logoColor=white)](https://www.prisma.io/)
[![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?logo=mysql\&logoColor=white)](https://www.mysql.com/)
[![Capacitor](https://img.shields.io/badge/Capacitor-8-119EFF?logo=capacitor\&logoColor=white)](https://capacitorjs.com/)
[![License](https://img.shields.io/badge/licen%C3%A7a-MIT-green.svg)](./LICENSE)

</div>

## Sobre o projeto

O **Fala Pommer** é um sistema de atendimento digital criado para aproximar a população dos setores públicos municipais. A plataforma reúne conversas, solicitações e avaliações em uma interface inspirada em aplicativos de mensagens, disponível para navegadores e dispositivos Android.

Cada cidadão pode iniciar um atendimento com um setor. Os funcionários vinculados ao setor acompanham as mensagens, enquanto os administradores possuem recursos adicionais de gestão e auditoria, de acordo com seu nível de permissão.

## Principais funcionalidades

### Comunicação

* Conversas privadas e atendimentos por setor;
* envio de mensagens, áudios e arquivos;
* indicação de mensagens não lidas e estado de digitação;
* pesquisa e filtragem de conversas;
* encerramento de atendimentos;
* avaliação do atendimento pelo cidadão;
* notificações push para novas mensagens.

### Autenticação e segurança

* Cadastro e login de usuários;
* recuperação de senha por e-mail;
* verificação em duas etapas por e-mail;
* códigos de recuperação para o segundo fator;
* senhas protegidas com hash;
* access token de curta duração e renovação por refresh token;
* refresh token armazenado em cookie HttpOnly na Web;
* armazenamento seguro do refresh token no aplicativo Android;
* encerramento e revogação imediata da sessão;
* controle de acesso baseado em perfis.

### Administração

* Dashboard com indicadores e gráficos;
* gestão de usuários ativos e desativados;
* registro do motivo da desativação;
* histórico de ações administrativas;
* relatórios de login e erros de autenticação;
* gerenciamento de secretarias e setores;
* acompanhamento das avaliações e médias de atendimento.

### Experiência e acessibilidade

* Interface responsiva para desktop, tablet e celular;
* temas claro e escuro;
* alto contraste e texto ampliado;
* navegação com apoio de áudio;
* personalização do plano de fundo das conversas;
* autenticação biométrica no aplicativo Android;
* foto de perfil.

## Perfis de acesso

| Perfil                 | Responsabilidade                                                                       |
| ---------------------- | -------------------------------------------------------------------------------------- |
| **Cidadão (user)**     | Inicia atendimentos, troca mensagens com os setores e avalia as conversas finalizadas. |
| **Funcionário**        | Atende às conversas do setor ao qual está vinculado.                                   |
| **Administrador**      | Gerencia e acompanha os recursos relacionados à sua secretaria.                        |
| **Superadministrador** | Possui acesso à área administrativa geral, aos relatórios e à auditoria do sistema.    |

## Tecnologias

### Frontend

* React 19;
* TypeScript;
* Vite;
* React Router;
* Chart.js;
* GSAP e Lenis;
* Google OAuth;
* LiveKit;
* Capacitor;
* Firebase Cloud Messaging.

### Backend

* Node.js;
* NestJS 11;
* TypeScript;
* Prisma ORM 7;
* MySQL/MariaDB;
* JWT;
* bcrypt;
* Nodemailer;
* Firebase Admin.

## Estrutura do repositório

```text
Fala-Pommer/
├── android/                 # Projeto Android gerado pelo Capacitor
├── assets/                  # Recursos gerais e identidade visual
├── backend/
│   ├── prisma/
│   │   ├── migrations/      # Histórico de migrações do banco
│   │   └── schema.prisma    # Modelagem dos dados
│   └── src/
│       ├── auth/            # Login, sessões, permissões e 2FA
│       ├── conversas/       # Conversas, mensagens e avaliações
│       ├── notificacoes/    # Registro e envio de notificações push
│       ├── recuperacao-senha/
│       ├── secretaria/
│       ├── setores/
│       └── usuarios/
├── src/
│   ├── components/          # Componentes reutilizáveis
│   ├── library/             # Recursos de interface e acessibilidade
│   ├── pages/               # Telas da aplicação
│   └── services/            # API, sessão, biometria e notificações
├── capacitor.config.ts
├── package.json
└── vite.config.ts
```

## Pré-requisitos

Antes de iniciar, instale:

* [Node.js](https://nodejs.org/) 22 ou superior;
* [MySQL](https://www.mysql.com/) ou MariaDB;
* npm;
* Git.

Para gerar ou executar o aplicativo Android, também são necessários:

* JDK 21;
* Android Studio e Android SDK.

## Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/Makalistermz/Fala-Pommer.git
cd Fala-Pommer
```

### 2. Instale o frontend

```bash
npm install
```

### 3. Instale o backend

```bash
cd backend
npm install
```

## Variáveis de ambiente

Crie um arquivo **.env** na raiz do projeto para o frontend:

```env
VITE_API_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=seu_client_id_google
```

Crie outro arquivo **backend/.env**:

```env
DATABASE_URL="mysql://usuario:senha@localhost:3306/fala_pommer"
JWT_SECRET="substitua_por_uma_chave_longa_e_segura"
MESSAGE_ENCRYPTION_KEY="chave_base64_de_32_bytes"

FRONTEND_URL=http://localhost:5173
PORT=3000
GOOGLE_CLIENT_ID=seu_client_id_google

SMTP_HOST=smtp.exemplo.com
SMTP_PORT=587
SMTP_USER=usuario_smtp
SMTP_PASSWORD=senha_smtp
```

Gere `MESSAGE_ENCRYPTION_KEY` uma única vez e mantenha o mesmo valor em
todas as instâncias do backend. Ela deve ser uma chave aleatória de 32 bytes
em Base64 canônico. Por exemplo:

```bash
node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64'))"
```

Guarde essa chave em um gerenciador de segredos no ambiente de produção.
Se ela for perdida ou alterada, as mensagens já criptografadas não poderão
ser recuperadas.

As notificações push são opcionais. Para ativá-las no backend, configure uma credencial padrão do Google ou informe:

```env
FIREBASE_PROJECT_ID=seu_project_id
FIREBASE_CLIENT_EMAIL=conta_de_servico
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## Banco de dados

Com o banco criado e o arquivo **backend/.env** configurado, execute os seguintes comandos dentro da pasta **backend**:

```bash
npx prisma generate
npx prisma migrate deploy
```

Durante o desenvolvimento de novas alterações no schema:

```bash
npx prisma migrate dev --name nome_da_migracao
```

## Executando o projeto

Abra dois terminais.

### Backend

```bash
cd backend
npm run start:dev
```

A API será iniciada, por padrão, em **http://localhost:3000**.

### Frontend

Na raiz do repositório:

```bash
npm run dev
```

O frontend será iniciado em **http://localhost:5173**. No modo de desenvolvimento, o Vite encaminha as requisições da API para o endereço definido em **VITE_API_URL**.

## Aplicativo Android

Gere a versão Web e sincronize o projeto Android:

```bash
npm run android
```

Depois, abra o projeto no Android Studio:

```bash
npx cap open android
```

Para gerar um APK de teste diretamente pelo Gradle no Windows:

```powershell
cd android
.\gradlew.bat assembleDebug
```

O arquivo será criado em:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Ao alterar o frontend, execute novamente **npm run android** antes de gerar uma nova versão do APK.

## Scripts disponíveis

### Frontend

| Comando             | Descrição                                         |
| ------------------- | ------------------------------------------------- |
| **npm run dev**     | Inicia o servidor Vite.                           |
| **npm run build**   | Valida o TypeScript e gera a versão de produção.  |
| **npm run lint**    | Executa o Oxlint.                                 |
| **npm run preview** | Visualiza localmente o build de produção.         |
| **npm run android** | Gera o frontend e sincroniza o Capacitor Android. |

### Backend

| Comando                | Descrição                                   |
| ---------------------- | ------------------------------------------- |
| **npm run start:dev**  | Inicia a API com recarregamento automático. |
| **npm run build**      | Compila o projeto NestJS.                   |
| **npm run start:prod** | Executa a versão compilada.                 |
| **npm run test**       | Executa os testes unitários.                |
| **npm run test:e2e**   | Executa os testes de ponta a ponta.         |
| **npm run test:cov**   | Gera o relatório de cobertura.              |

## Fluxo simplificado

1. O cidadão cria uma conta e inicia um atendimento com um setor.
2. Os funcionários vinculados ao setor recebem e respondem às mensagens.
3. Os administradores acompanham os recursos permitidos para suas secretarias.
4. O atendimento pode ser finalizado e avaliado pelo cidadão.
5. O superadministrador consulta indicadores, relatórios e históricos administrativos.

## Status do projeto

O Fala Pommer está **em desenvolvimento**. As funcionalidades, regras de acesso e instruções de implantação podem mudar conforme a evolução do sistema.

## Autor

Desenvolvido por [Makalister Mutz Zager](https://github.com/Makalistermz).

## Licença

Este projeto está sob a licença [MIT](./LICENSE).
