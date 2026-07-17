# Architecture

Genesis uses a modular monorepo so product surfaces and execution capabilities
can mature independently without fragmenting the system prematurely.

```text
frontend/  Next.js application and shared presentation foundations
backend/   FastAPI application, domain boundaries, and infrastructure setup
database/  PostgreSQL and Alembic migration ownership
docs/      Product and engineering decisions
assets/    Versioned product assets
prompts/   Versioned AI prompt assets when AI capabilities are introduced
```

The future runtime follows a modular design: an organization design layer,
policy and behavior layer, mission execution layer, memory layer, and
observability layer. Milestone 1 intentionally implements none of those product
modules; it establishes only their durable engineering boundaries.

PostgreSQL is the source of truth. pgvector is enabled at the database level for
future retrieval use cases. Redis is available for future queues, caching, and
realtime coordination. The backend uses asynchronous SQLAlchemy with Alembic as
the sole schema migration path.
