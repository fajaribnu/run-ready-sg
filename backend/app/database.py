import psycopg2
from psycopg2 import pool
from contextlib import contextmanager
from app.config import settings

_pool = None


def init_db():
    """Call once at app startup to create the connection pool."""
    global _pool
    _pool = psycopg2.pool.SimpleConnectionPool(
        minconn=1,
        maxconn=10,
        host=settings.DB_HOST,
        port=settings.DB_PORT,
        dbname=settings.DB_NAME,
        user=settings.DB_USER,
        password=settings.DB_PASSWORD,
    )


def close_db():
    """Call at app shutdown."""
    global _pool
    if _pool:
        _pool.closeall()


@contextmanager
def get_db():
    """Usage: with get_db() as conn: ..."""
    conn = _pool.getconn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        _pool.putconn(conn)
