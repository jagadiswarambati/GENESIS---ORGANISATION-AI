from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


class Base(DeclarativeBase):
    """Declarative base for future Genesis database models."""


engine = create_async_engine(str(settings.database_url), pool_pre_ping=True)
AsyncSessionFactory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_database_session() -> AsyncIterator[AsyncSession]:
    """Yield a transaction-capable session for future API dependencies."""

    async with AsyncSessionFactory() as session:
        yield session
