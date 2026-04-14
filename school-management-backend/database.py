import os
from urllib.parse import quote_plus

import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker


def build_database_url() -> str:
    configured_url = os.getenv("DATABASE_URL")
    if configured_url:
        if configured_url.startswith("postgres://"):
            return configured_url.replace("postgres://", "postgresql+psycopg2://", 1)
        if configured_url.startswith("postgresql://"):
            return configured_url.replace("postgresql://", "postgresql+psycopg2://", 1)
        return configured_url

    db_user = os.getenv("POSTGRES_USER", "postgres")
    db_password = quote_plus(os.getenv("POSTGRES_PASSWORD", "2096"))
    db_host = os.getenv("POSTGRES_HOST", "127.0.0.1")
    db_port = os.getenv("POSTGRES_PORT", "5432")
    db_name = os.getenv("POSTGRES_DB", "school_management_system")
    return f"postgresql+psycopg2://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"


def ensure_database_exists() -> None:
    if os.getenv("DATABASE_URL"):
        return

    db_name = os.getenv("POSTGRES_DB", "school_management_system")
    admin_db = os.getenv("POSTGRES_ADMIN_DB", "postgres")
    try:
        connection = psycopg2.connect(
            dbname=admin_db,
            user=os.getenv("POSTGRES_USER", "postgres"),
            password=os.getenv("POSTGRES_PASSWORD", "2096"),
            host=os.getenv("POSTGRES_HOST", "127.0.0.1"),
            port=os.getenv("POSTGRES_PORT", "5432"),
        )
        connection.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)

        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s", (db_name,))
                if cursor.fetchone() is None:
                    cursor.execute(f'CREATE DATABASE "{db_name}"')
        finally:
            connection.close()
    except psycopg2.OperationalError as exc:
        raise RuntimeError(
            "Unable to connect to PostgreSQL with the configured credentials. "
            "If your pgAdmin or PostgreSQL password is not 2096, set POSTGRES_PASSWORD "
            "or DATABASE_URL before starting the backend."
        ) from exc


DATABASE_URL = build_database_url()
ensure_database_exists()

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
