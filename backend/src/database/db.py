"""Database connection and initialization for SQLite."""

import aiosqlite
from pathlib import Path

DB_PATH = Path(__file__).parent.parent.parent.parent / "data" / "imoveis.db"
SCHEMA_PATH = Path(__file__).parent / "schema.sql"


async def get_db() -> aiosqlite.Connection:
    """Open a connection to the SQLite database."""
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA journal_mode=WAL")
    await db.execute("PRAGMA foreign_keys=ON")
    return db


async def init_db(db_path: Path | None = None):
    """Create tables if they don't exist."""
    path = db_path or DB_PATH
    path.parent.mkdir(parents=True, exist_ok=True)
    db = await aiosqlite.connect(path)
    schema = SCHEMA_PATH.read_text()
    await db.executescript(schema)
    await db.close()
