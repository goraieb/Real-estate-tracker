"""Admin API endpoints for data loading, status monitoring, and economic indicators.

Provides endpoints to:
- Trigger data loading from any/all sources
- Monitor load progress and status
- Query cached economic indicators
- Access real FipeZAP, Airbnb, SECOVI, ABECIP, CUB data
"""

import asyncio
import logging
from typing import Optional

import aiosqlite
from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from pydantic import BaseModel

from ..database.db import DB_PATH
from ..services.data_loader import DataLoader

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/data", tags=["data"])

loader = DataLoader()


# --- Schemas ---


class LoadRequest(BaseModel):
    sources: list[str] = []  # empty = all
    include_itbi: bool = False
    itbi_years: Optional[list[int]] = None


# --- Background task runner ---

_running_tasks: dict[str, str] = {}  # source -> status


async def _run_load(source: str, coro):
    """Run a data load coroutine and track status."""
    _running_tasks[source] = "running"
    try:
        result = await coro
        _running_tasks[source] = f"completed ({result} records)"
    except Exception as e:
        _running_tasks[source] = f"failed: {e}"
        logger.error(f"Load {source} failed: {e}")


# --- Endpoints ---


@router.post("/load")
async def trigger_data_load(req: LoadRequest, background_tasks: BackgroundTasks):
    """Trigger data loading from specified sources (or all).

    Sources: bcb, ipeadata, b3, abecip, cub, secovi, fipezap, airbnb, itbi

    Data loading runs in the background. Use GET /data/status to monitor.
    """
    valid_sources = {"bcb", "ipeadata", "b3", "abecip", "cub", "secovi", "fipezap", "airbnb", "itbi"}
    sources = req.sources if req.sources else list(valid_sources - {"itbi"})

    if req.include_itbi and "itbi" not in sources:
        sources.append("itbi")

    invalid = set(sources) - valid_sources
    if invalid:
        raise HTTPException(400, f"Invalid sources: {invalid}. Valid: {valid_sources}")

    source_map = {
        "bcb": loader.load_bcb_indicators(),
        "ipeadata": loader.load_ipeadata(),
        "b3": loader.load_b3_ifix(),
        "abecip": loader.load_abecip(),
        "cub": loader.load_cub(),
        "secovi": loader.load_secovi(),
        "fipezap": loader.load_fipezap(),
        "airbnb": loader.load_airbnb(),
        "itbi": loader.load_itbi(years=req.itbi_years),
    }

    for source in sources:
        if source in source_map:
            background_tasks.add_task(_run_load, source, source_map[source])

    return {
        "message": f"Loading started for: {sources}",
        "sources": sources,
        "monitor": "/api/v1/data/status",
    }


@router.post("/load/{source}")
async def trigger_single_load(source: str, background_tasks: BackgroundTasks):
    """Trigger loading for a single data source."""
    source_map = {
        "bcb": loader.load_bcb_indicators,
        "ipeadata": loader.load_ipeadata,
        "b3": loader.load_b3_ifix,
        "abecip": loader.load_abecip,
        "cub": loader.load_cub,
        "secovi": loader.load_secovi,
        "fipezap": loader.load_fipezap,
        "airbnb": loader.load_airbnb,
        "itbi": loader.load_itbi,
    }

    if source not in source_map:
        raise HTTPException(400, f"Invalid source: {source}. Valid: {list(source_map.keys())}")

    background_tasks.add_task(_run_load, source, source_map[source]())
    return {"message": f"Loading {source}...", "monitor": "/api/v1/data/status"}


@router.get("/status")
async def get_load_status():
    """Get data load history and current running tasks."""
    history = await loader.get_load_status()
    return {
        "running": {k: v for k, v in _running_tasks.items() if "running" in v},
        "recent": {k: v for k, v in _running_tasks.items()},
        "history": history[:50],
    }


@router.get("/summary")
async def get_data_summary():
    """Get summary of all loaded data across tables."""
    return await loader.get_data_summary()


# --- Economic Indicators ---


@router.get("/indicators/{serie}")
async def get_indicator_series(
    serie: str,
    fonte: Optional[str] = Query(None, description="Filter by source (bcb, ipeadata, b3, etc.)"),
    limit: int = Query(100, le=5000),
):
    """Get cached economic indicator time series.

    Available series: selic, ipca, igpm, incc, cdi, tr, poupanca,
    ifix, ntnb, vso, locacao_m2_sp, taxa_media_imobiliario,
    inadimplencia_imobiliario, incc_mensal, cub_r8n_sp, etc.
    """
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        conditions = ["serie LIKE ?"]
        params: list = [f"%{serie}%"]

        if fonte:
            conditions.append("fonte = ?")
            params.append(fonte)

        where = " AND ".join(conditions)
        params.append(limit)

        cursor = await db.execute(
            f"""SELECT fonte, serie, data, valor
            FROM indicadores_economicos
            WHERE {where}
            ORDER BY data DESC
            LIMIT ?""",
            params,
        )
        rows = await cursor.fetchall()

        if not rows:
            raise HTTPException(404, f"No data for series '{serie}'")

        return {
            "serie": serie,
            "fonte": fonte,
            "total": len(rows),
            "data": [dict(r) for r in rows],
        }
    finally:
        await db.close()


@router.get("/indicators")
async def list_available_indicators():
    """List all available cached indicator series."""
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        cursor = await db.execute(
            """SELECT fonte, serie, COUNT(*) as records,
                      MIN(data) as data_inicio, MAX(data) as data_fim
            FROM indicadores_economicos
            GROUP BY fonte, serie
            ORDER BY fonte, serie"""
        )
        rows = await cursor.fetchall()
        return {"indicators": [dict(r) for r in rows]}
    finally:
        await db.close()


# --- FipeZAP Cached Data ---


@router.get("/fipezap/precos")
async def get_fipezap_precos(
    tipo: str = Query("venda", description="venda or locacao"),
    cidade: Optional[str] = Query(None),
    limit: int = Query(500, le=5000),
):
    """Get cached FipeZAP price data."""
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        conditions = ["tipo = ?"]
        params: list = [tipo]

        if cidade:
            conditions.append("cidade LIKE ?")
            params.append(f"%{cidade}%")

        where = " AND ".join(conditions)
        params.append(limit)

        cursor = await db.execute(
            f"""SELECT tipo, cidade, data, preco_m2
            FROM fipezap_precos
            WHERE {where}
            ORDER BY data DESC
            LIMIT ?""",
            params,
        )
        rows = await cursor.fetchall()
        return {"tipo": tipo, "total": len(rows), "data": [dict(r) for r in rows]}
    finally:
        await db.close()


# --- Airbnb Cached Data ---


@router.get("/airbnb/stats")
async def get_airbnb_stats(
    cidade: str = Query("São Paulo"),
):
    """Get Airbnb neighborhood statistics from cached data."""
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        cursor = await db.execute(
            """SELECT bairro,
                      COUNT(*) as qtd_listings,
                      AVG(preco_noite) as preco_medio,
                      AVG(reviews_por_mes) as reviews_mes_medio,
                      AVG(CAST(365 - disponibilidade_365 AS REAL) / 365 * 100) as ocupacao_estimada
            FROM airbnb_listings
            WHERE cidade = ? AND preco_noite > 0 AND preco_noite < 10000
            GROUP BY bairro
            ORDER BY preco_medio DESC""",
            (cidade,),
        )
        rows = await cursor.fetchall()
        return {"cidade": cidade, "total_bairros": len(rows), "stats": [dict(r) for r in rows]}
    finally:
        await db.close()


@router.get("/airbnb/yield-estimate")
async def get_airbnb_yield_estimate(
    bairro: str = Query(..., description="Neighborhood name"),
    preco_m2_compra: Optional[float] = Query(None, description="Purchase price/m² (uses ITBI avg if None)"),
):
    """Estimate Airbnb yield for a neighborhood using real listing data.

    Cross-references Airbnb nightly rates with ITBI purchase prices.
    """
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        # Get Airbnb stats for the neighborhood
        cursor = await db.execute(
            """SELECT AVG(preco_noite) as preco_medio_noite,
                      AVG(CAST(365 - disponibilidade_365 AS REAL) / 365 * 100) as ocupacao_pct,
                      COUNT(*) as qtd_listings
            FROM airbnb_listings
            WHERE bairro LIKE ? AND preco_noite > 0 AND preco_noite < 10000""",
            (f"%{bairro}%",),
        )
        airbnb = await cursor.fetchone()

        if not airbnb or not airbnb["preco_medio_noite"]:
            raise HTTPException(404, f"No Airbnb data for '{bairro}'")

        # Get purchase price from ITBI if not provided
        if preco_m2_compra is None:
            cursor = await db.execute(
                """SELECT AVG(preco_m2) as avg_pm2
                FROM transacoes_itbi
                WHERE bairro LIKE ? AND preco_m2 BETWEEN 500 AND 150000""",
                (f"%{bairro}%",),
            )
            itbi = await cursor.fetchone()
            preco_m2_compra = itbi["avg_pm2"] if itbi and itbi["avg_pm2"] else None

        if preco_m2_compra is None:
            raise HTTPException(404, f"No price data for '{bairro}'")

        # Calculate yield
        preco_noite = airbnb["preco_medio_noite"]
        ocupacao = airbnb["ocupacao_pct"] / 100
        receita_mensal = preco_noite * 30 * ocupacao
        receita_anual = receita_mensal * 12
        # Assume 50m² average apartment
        valor_imovel = preco_m2_compra * 50
        yield_bruto = (receita_anual / valor_imovel) * 100
        # Net yield (subtract ~30% for costs: platform fees, cleaning, condo, etc.)
        yield_liquido = yield_bruto * 0.70

        return {
            "bairro": bairro,
            "preco_noite_medio": round(preco_noite, 2),
            "ocupacao_estimada_pct": round(airbnb["ocupacao_pct"], 1),
            "receita_mensal_estimada": round(receita_mensal, 2),
            "preco_m2_compra": round(preco_m2_compra, 2),
            "yield_bruto_anual_pct": round(yield_bruto, 2),
            "yield_liquido_anual_pct": round(yield_liquido, 2),
            "qtd_listings_referencia": airbnb["qtd_listings"],
        }
    finally:
        await db.close()


# --- Credit Market ---


@router.get("/credit/summary")
async def get_credit_summary():
    """Get current real estate credit market summary from cached data."""
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        result = {}
        series = [
            ("abecip", "taxa_media_imobiliario", "taxa_media_aa"),
            ("abecip", "inadimplencia_imobiliario", "inadimplencia_pct"),
            ("abecip", "volume_financiamento", "volume_concessoes_mm"),
        ]

        for fonte, serie, key in series:
            cursor = await db.execute(
                """SELECT valor FROM indicadores_economicos
                WHERE fonte = ? AND serie = ?
                ORDER BY data DESC LIMIT 1""",
                (fonte, serie),
            )
            row = await cursor.fetchone()
            if row:
                result[key] = round(row["valor"], 2)

        return result
    finally:
        await db.close()
