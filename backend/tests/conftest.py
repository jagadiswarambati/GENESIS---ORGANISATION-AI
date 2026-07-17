import os

os.environ.setdefault(
    "GENESIS_DATABASE_URL",
    "postgresql+asyncpg://genesis:genesis@localhost:5432/genesis",
)
os.environ.setdefault("GENESIS_AI_PROVIDER", "mock")
os.environ.setdefault("GENESIS_OPENAI_MODEL", "gpt-5.6")
