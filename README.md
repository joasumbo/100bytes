# 100bytes Monorepo

Projeto completo da plataforma 100bytes, com frontend SSR da loja, backend API e painel administrativo.

## Estrutura

- `frontend/`: Loja (Express + EJS) com template Electro.
- `Backend/`: API (NestJS + Prisma + PostgreSQL).
- `admin/`: Painel administrativo (Next.js + Tailwind + Prisma).
- `TEMPLATE/`: Arquivos de referência do template original.

## Requisitos

- Node.js 20+
- npm 10+
- PostgreSQL (para backend/admin)

## Como rodar localmente

### 1) Frontend da loja

```bash
cd frontend
npm install
npm run dev
```

Abre em: `http://localhost:3030`

### 2) Backend API

```bash
cd Backend
npm install
npm run start:dev
```

Abre em: `http://localhost:3001`

### 3) Admin

```bash
cd admin
npm install
npm run dev
```

Abre em: `http://localhost:3000`

## Fluxo de integração

- O `frontend` consome dados da API via rotas `\/api/*` e SSR em `server.js`.
- O `admin` e o `Backend` compartilham entidades e estratégia de dados via Prisma.

## Documentação operacional

- Convenções de contribuição e commits: `CONTRIBUTING.md`

## Publicação no GitHub

Repositório remoto oficial:

- `https://github.com/joasumbo/100bytes.git`

## Licença

Uso interno da 100bytes, salvo indicação diferente por módulo.
