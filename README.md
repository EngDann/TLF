# TLT Finanças

Plataforma de gestão financeira pessoal, offline-first, criada para organizar receitas, despesas, orçamentos e recorrências de forma simples.

## Stack

- **Mobile:** React Native (Expo) + WatermelonDB + Zustand
- **Backend:** NestJS + Prisma + PostgreSQL
- **Auth:** Supabase Auth
- **Sync:** push/pull offline-first entre app e API

## Estrutura

```text
TLF/
├── apps/
│   ├── backend/   # NestJS API
│   └── mobile/    # Expo app
├── package.json   # Turborepo workspaces
└── .github/CONTRIBUTING.md
```

## Setup

Pré-requisitos: Node.js >= 20, npm >= 10, Docker.

```bash
git clone https://github.com/EngDann/TLF.git
cd TLF
npm install

cp apps/backend/env/.env.example apps/backend/env/.env
cp apps/mobile/env/.env.example apps/mobile/.env
# Preencha DATABASE_URL, Supabase keys e EXPO_PUBLIC_API_URL
```

### Backend

```bash
cd apps/backend
docker compose up -d
npm run db:generate
npm run db:migrate
npm run dev
```

API: `http://localhost:3000/api/v1`  
Swagger: `http://localhost:3000/api/v1/docs`

### Mobile

O app usa módulos nativos (WatermelonDB), então Expo Go não funciona. Use Dev Client / EAS:

```bash
cd apps/mobile
npx expo run:android
# ou
eas build --profile development --platform android
npm run dev
```

## Arquitetura

### Backend

`DTO → Controller → Service → Prisma → PostgreSQL`

Auth via Supabase. Dados de domínio sincronizam pelo módulo `/sync` (pull/push).

### Mobile

`Screen (TSX) → Hook → Service (WatermelonDB / API) → Sync → Backend`

Zustand só para estado global (auth, tema). Leituras/escritas de domínio vão para o banco local e sobem via sync.

## Convenções

- Valores monetários em centavos (`int`)
- IDs em UUID
- Código em inglês; textos de UI em português
- Rotas públicas: `/auth/register`, `/auth/login`, `/auth/refresh`

## Contribuição

Veja [`.github/CONTRIBUTING.md`](.github/CONTRIBUTING.md).

## Licença

MIT
