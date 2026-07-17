# Genesis

> **Build Organizations. Not Prompts.**

**Genesis** is an AI Organization Platform: the Organization OS for AI Work.
It is being built to help people design, operate, learn from, and evolve
AI-powered organizations around meaningful missions.

## Why Genesis exists

AI should not be limited to isolated assistants or disconnected agents. The
next computing model is an organization: purposeful roles, coordinated work,
institutional knowledge, accountable decisions, and continuous improvement.

Genesis is the foundation for that model.

## Technology stack

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui
  conventions, Framer Motion, React Flow, and Lucide Icons.
- **Backend:** Python 3.12, uv, FastAPI, Pydantic, SQLAlchemy, and Alembic.
- **Data:** PostgreSQL with pgvector support; Redis is available for future
  coordination infrastructure.
- **Developer experience:** Docker Compose, ESLint, Prettier, Ruff, strict
  TypeScript, and GitHub Actions.

## Repository structure

```text
Genesis/
├── frontend/       # Next.js application foundation
├── backend/        # FastAPI application foundation
├── database/       # Alembic configuration and migration revisions
├── docs/           # Product and architecture documentation
├── assets/         # Versioned product and documentation assets
├── prompts/        # Future versioned AI prompt assets
└── .github/        # Continuous integration workflows
```

## Development setup

### Prerequisites

- Node.js 22 and npm 10+
- Python 3.12+
- [uv](https://docs.astral.sh/uv/)
- Docker Desktop (recommended for PostgreSQL and Redis)

### Configure the environment

```bash
cp .env.example .env
```

On PowerShell:

```powershell
Copy-Item .env.example .env
```

### Run with Docker

```bash
docker compose up --build
```

This starts the frontend, backend, PostgreSQL with pgvector, and Redis. The
application is available at `http://localhost:3000`.

### Execution provider configuration

- `GENESIS_AI_PROVIDER`: `mock` (default) uses the local deterministic provider;
  `openai` enables the OpenAI Responses API provider; `gemini` enables Google Gemini.
- `OPENAI_API_KEY`: required only when `GENESIS_AI_PROVIDER=openai`.
- `GENESIS_OPENAI_MODEL`: Responses API model for OpenAI-backed Architect and
  execution calls; defaults to `gpt-5.6`.
- `GEMINI_API_KEY`: required only when `GENESIS_AI_PROVIDER=gemini`.
- `GENESIS_GEMINI_MODEL`: Gemini model for Gemini-backed Architect and execution calls;
  defaults to `gemini-3.5-flash`.

### Run locally

```bash
npm install
npm run dev
```

In another terminal:

```bash
uv --directory backend sync --all-groups
uv --directory backend run uvicorn app.main:app --reload
```

Run quality checks with:

```bash
npm run lint
npm run typecheck
npm run format:check
uv --directory backend run ruff check .
```

## Contribution guidelines

Keep changes focused and maintain module ownership. Use strict typing, run the
relevant quality checks before opening a pull request, and add an Alembic
migration for every future schema change. Do not introduce product behavior
outside the active milestone.

## High-level roadmap

1. **Foundation:** repository, local environment, code quality, and migration
   infrastructure.
2. **Organization design:** foundational organization modeling and setup.
3. **Operation:** governed mission planning and execution.
4. **Learning:** institutional knowledge and artifact lineage.
5. **Evolution:** evidence-backed organization health and improvement insights.

Read [the product vision](docs/vision.md), [architecture](docs/architecture.md),
[technology stack](docs/tech-stack.md), [design system](docs/design-system.md),
[Organization Architect API](docs/organization-architect.md), and
[roadmap](docs/roadmap.md) for the agreed direction.

## License

Distributed under the [MIT License](LICENSE).
