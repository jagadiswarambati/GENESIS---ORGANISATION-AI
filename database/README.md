# Database Foundation

Genesis uses PostgreSQL as its system of record and enables pgvector for future
semantic retrieval. Alembic owns all schema evolution. No domain tables are
defined during Milestone 1.

Create a revision from `database/` with:

```bash
uv --directory ../backend run alembic revision --autogenerate -m "describe change"
```
