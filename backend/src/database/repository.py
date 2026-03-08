"""Repository for CRUD operations on imoveis."""

import uuid
from datetime import datetime

import aiosqlite

from .db import get_db

# Columns that can be set by the user
WRITABLE_COLUMNS = [
    "nome", "tipo", "logradouro", "numero", "bairro", "cidade", "uf", "cep",
    "latitude", "longitude", "area_util", "quartos", "vagas", "andar",
    "ano_construcao", "valor_compra", "data_compra", "itbi_pago",
    "custos_cartorio", "comissao_corretor", "valor_financiado",
    "taxa_juros_anual", "prazo_meses", "banco", "sistema", "saldo_devedor",
    "iptu_anual", "condominio_mensal", "seguro_anual", "manutencao_mensal",
    "tipo_renda", "aluguel_mensal", "taxa_vacancia_pct", "diaria_media",
    "taxa_ocupacao_pct", "custos_plataforma_pct", "valor_atual_estimado",
    "data_ultima_avaliacao", "fonte_avaliacao", "notas",
]


def _row_to_dict(row: aiosqlite.Row) -> dict:
    """Convert a Row object to a plain dict."""
    return dict(row)


class ImovelRepository:
    """CRUD operations for the imoveis table."""

    def __init__(self, db: aiosqlite.Connection | None = None):
        self._db = db

    async def _get_db(self) -> aiosqlite.Connection:
        if self._db is not None:
            return self._db
        return await get_db()

    async def _close_if_owned(self, db: aiosqlite.Connection):
        if self._db is None:
            await db.close()

    async def criar(self, data: dict) -> dict:
        """Insert a new imovel and return it with generated id."""
        db = await self._get_db()
        try:
            imovel_id = str(uuid.uuid4())
            now = datetime.utcnow().isoformat()

            # Filter to writable columns only
            filtered = {k: v for k, v in data.items() if k in WRITABLE_COLUMNS}
            filtered["id"] = imovel_id
            filtered["criado_em"] = now
            filtered["atualizado_em"] = now

            columns = list(filtered.keys())
            placeholders = ", ".join(["?"] * len(columns))
            col_names = ", ".join(columns)
            values = [filtered[c] for c in columns]

            await db.execute(
                f"INSERT INTO imoveis ({col_names}) VALUES ({placeholders})",
                values,
            )
            await db.commit()
            return await self.buscar(imovel_id, db=db)
        finally:
            await self._close_if_owned(db)

    async def listar(self) -> list[dict]:
        """List all imoveis ordered by creation date descending."""
        db = await self._get_db()
        try:
            cursor = await db.execute(
                "SELECT * FROM imoveis ORDER BY criado_em DESC"
            )
            rows = await cursor.fetchall()
            return [_row_to_dict(r) for r in rows]
        finally:
            await self._close_if_owned(db)

    async def buscar(self, imovel_id: str, db: aiosqlite.Connection | None = None) -> dict | None:
        """Find a single imovel by id."""
        own_db = db is None
        if db is None:
            db = await self._get_db()
        try:
            cursor = await db.execute(
                "SELECT * FROM imoveis WHERE id = ?", (imovel_id,)
            )
            row = await cursor.fetchone()
            return _row_to_dict(row) if row else None
        finally:
            if own_db:
                await self._close_if_owned(db)

    async def atualizar(self, imovel_id: str, data: dict) -> dict | None:
        """Update an imovel with the given fields (PATCH-style)."""
        db = await self._get_db()
        try:
            filtered = {k: v for k, v in data.items() if k in WRITABLE_COLUMNS}
            if not filtered:
                return await self.buscar(imovel_id, db=db)

            filtered["atualizado_em"] = datetime.utcnow().isoformat()

            set_clause = ", ".join(f"{k} = ?" for k in filtered)
            values = list(filtered.values()) + [imovel_id]

            await db.execute(
                f"UPDATE imoveis SET {set_clause} WHERE id = ?",
                values,
            )
            await db.commit()
            return await self.buscar(imovel_id, db=db)
        finally:
            await self._close_if_owned(db)

    async def deletar(self, imovel_id: str) -> bool:
        """Delete an imovel by id. Returns True if a row was deleted."""
        db = await self._get_db()
        try:
            cursor = await db.execute(
                "DELETE FROM imoveis WHERE id = ?", (imovel_id,)
            )
            await db.commit()
            return cursor.rowcount > 0
        finally:
            await self._close_if_owned(db)
