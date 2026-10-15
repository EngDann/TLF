# Guia de Contribuição

## Estrutura do monorepo

```text
TLF/
├── apps/
│   ├── backend/          # NestJS + Prisma + PostgreSQL
│   └── mobile/           # React Native + Expo + WatermelonDB
├── package.json          # Turborepo (orquestração)
└── .eslintrc.js          # ESLint compartilhado
```

## Pré-requisitos

| Ferramenta       | Versão mínima    | Para que serve          |
| ---------------- | ---------------- | ----------------------- |
| Node.js          | 20               | Rodar backend e tooling |
| npm              | 10               | Gerenciador de pacotes  |
| Docker + Compose | qualquer recente | Banco de dados local    |
| EAS CLI          | 12+              | Build do app mobile     |
| Android Studio   | qualquer recente | Emulador Android        |
| Xcode            | 15+              | Emulador iOS (só Mac)   |

## Setup inicial

### 1) Clone e instale dependências

```bash
git clone https://github.com/EngDann/TLF.git
cd TLF
npm install
```

### 2) Configure variáveis de ambiente

```bash
cp apps/backend/env/.env.example apps/backend/env/.env
cp apps/mobile/env/.env.example apps/mobile/.env
```

Depois gere o Prisma Client:

```bash
cd apps/backend && npm run db:generate
```

### 3) Suba banco e migrations

```bash
cd apps/backend
docker compose up -d
npm run db:migrate
```

### 4) Suba backend e mobile

```bash
# backend
cd apps/backend && npm run dev

# mobile (primeira vez, instala Dev Client)
cd apps/mobile && npx expo run:android
# ou: npx expo run:ios
```

No dia a dia do mobile:

```bash
cd apps/mobile && npm run dev
```

## Arquitetura

### Backend

```text
Request HTTP
    ↓
DTO (valida, tipifica e documenta via Swagger)
    ↓
Controller (recebe HTTP, chama Service)
    ↓
Service (regras de negócio, chama Prisma)
    ↓
Prisma ORM
    ↓
PostgreSQL
```

Entidades de domínio offline-first sincronizam via `POST /sync/push` e `GET /sync/pull`. Auth e user permanecem como REST.

### Padrão sync-only (finance domain)

| Superfície HTTP            | Uso                                                                                                |
| -------------------------- | -------------------------------------------------------------------------------------------------- |
| `/auth/*`                  | Registro, login, logout, refresh (mobile hoje)                                                     |
| `/user`                    | Perfil do usuário autenticado                                                                      |
| `/sync/pull`, `/sync/push` | Única via HTTP para dados financeiros (budget, transações, recorrências, categorias, contas, etc.) |

Regras:

- Nenhum módulo de domínio financeiro expõe CRUD REST “esquecido” além do sync.
- Jobs de servidor (ex.: gerar transações a partir de recorrências) rodam em schedulers, não como endpoints HTTP.
- Se no futuro existir web ou ferramentas admin, novos endpoints REST devem ser adicionados de propósito, reutilizando os services de domínio — não reativar controllers mortos ao lado do sync.

### Mobile

```text
Screen (só TSX, usa hooks e components)
    ↓
Hook (lógica da tela, estado local)
    ↓
Service (DatabaseService / sync)
    ↓
WatermelonDB (local) <-> Sync <-> Backend
```

Zustand gerencia apenas estado global. Estado de tela fica nos hooks locais.

Código (arquivos, pastas, identificadores) em inglês. Strings de UI em português.

## Fluxos do produto

### Offline-first

```text
Ação do usuário (ex: nova transação)
        ↓
WatermelonDB (SQLite local)
  - Salva imediatamente
  - UI atualiza na hora (sem esperar rede)
        ↓
Sync Engine (background)
  - Detecta registros pendentes
  - Envia para backend via POST /sync/push
  - Recebe atualizações via GET /sync/pull
        ↓
NestJS Backend
        ↓
PostgreSQL
```

### Autenticação

```text
Login
  Mobile -> POST /auth/login { email, password }
  Backend -> Supabase valida credenciais
  Backend -> retorna { accessToken, refreshToken }
  Mobile -> salva no SecureStore

Requests autenticados
  Axios interceptor injeta bearer token a cada requisição

Token expirado
  Request retorna 401
  Axios interceptor chama POST /auth/refresh
  Backend -> Supabase emite novo accessToken
  Axios retenta o request original
```

## Build do app mobile (EAS)

Como o app usa código nativo (WatermelonDB), o Expo Go não atende.

```bash
cd apps/mobile
npm install -g eas-cli
eas login

eas build --profile development --platform android
eas build --profile preview --platform android
eas build --profile production --platform all
```

Após instalar o build de desenvolvimento:

```bash
npx expo start --dev-client
```

## Fluxo de branches

Padrão: `tipo/numero-da-issue-descricao-curta`

Exemplos:

- `feat/42-tela-de-login`
- `fix/55-bug-no-botao-sair`
- `docs/12-atualizar-readme`

## Padrão de commits

```text
<tipo>(<escopo>): <assunto>
```

Tipos comuns: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.

## Comandos do dia a dia

```bash
# Raiz (backend + mobile)
npm run dev

# Backend
cd apps/backend && npm run dev

# Mobile
cd apps/mobile && npm run dev

# Prisma
cd apps/backend && npm run db:generate
cd apps/backend && npm run db:migrate
cd apps/backend && npm run db:studio

# Qualidade
npm run lint
npm run test
```

## Convenções técnicas

- Valores monetários são sempre em centavos (int).
- Todos os IDs são UUID.
- Datas usam ISO 8601 nos DTOs, `DateTime` no Prisma e `number` no WatermelonDB.
- Rotas protegidas no backend usam `@UseGuards(AuthGuard)`.
- Rotas públicas: `/auth/register`, `/auth/login` e `/auth/refresh`.

## Checklist antes de abrir PR

- Código compila e roda localmente.
- `npm run lint` sem erros.
- `npm run test` passando.
- Commits seguem o padrão definido.
