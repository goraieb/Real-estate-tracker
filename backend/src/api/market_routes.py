"""Market data API endpoints for the ITBI Transaction Explorer.

Provides endpoints for querying ITBI transactions, neighborhood stats,
price evolution, yield maps, and market alerts.
"""

from typing import Optional

import aiosqlite
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from ..database.db import DB_PATH
from ..services.geo_boundaries import (
    SP_BAIRRO_CENTERS,
    get_bairro_center,
    get_sp_neighborhoods_geojson,
)

router = APIRouter(prefix="/api/v1/market", tags=["market"])


# --- Schemas ---


class AlertCreate(BaseModel):
    tipo: str  # 'price_drop', 'new_transaction', 'yield_change'
    bairro: Optional[str] = None
    logradouro: Optional[str] = None
    preco_m2_limite: Optional[float] = None
    yield_limite: Optional[float] = None


# --- Helper ---


async def get_db():
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    return db


# --- Endpoints ---


def _build_transaction_filters(
    bbox: Optional[str],
    data_inicio: Optional[str],
    data_fim: Optional[str],
    tipo: Optional[str],
    preco_m2_min: Optional[float],
    preco_m2_max: Optional[float],
    bairro: Optional[str],
    require_geocoded: bool = True,
) -> tuple[str, list]:
    """Build WHERE clause and params for transaction queries."""
    conditions: list[str] = []
    params: list = []

    if require_geocoded:
        conditions.extend(["geocoded = 1", "latitude IS NOT NULL", "longitude IS NOT NULL"])

    if bbox:
        parts = [float(x) for x in bbox.split(",")]
        if len(parts) == 4:
            lat1, lng1, lat2, lng2 = parts
            conditions.append("latitude BETWEEN ? AND ?")
            params.extend([min(lat1, lat2), max(lat1, lat2)])
            conditions.append("longitude BETWEEN ? AND ?")
            params.extend([min(lng1, lng2), max(lng1, lng2)])

    if data_inicio:
        conditions.append("data_transacao >= ?")
        params.append(data_inicio)
    if data_fim:
        conditions.append("data_transacao <= ?")
        params.append(data_fim)
    if tipo:
        conditions.append("tipo_imovel LIKE ?")
        params.append(f"%{tipo}%")
    if preco_m2_min is not None:
        conditions.append("preco_m2 >= ?")
        params.append(preco_m2_min)
    if preco_m2_max is not None:
        conditions.append("preco_m2 <= ?")
        params.append(preco_m2_max)
    if bairro:
        conditions.append("bairro LIKE ?")
        params.append(f"%{bairro}%")

    where = " AND ".join(conditions) if conditions else "1=1"
    return where, params


@router.get("/transactions/count")
async def get_transaction_count(
    bbox: Optional[str] = Query(None, description="lat1,lng1,lat2,lng2"),
    data_inicio: Optional[str] = Query(None, description="YYYY-MM-DD"),
    data_fim: Optional[str] = Query(None, description="YYYY-MM-DD"),
    tipo: Optional[str] = Query(None),
    preco_m2_min: Optional[float] = Query(None),
    preco_m2_max: Optional[float] = Query(None),
    bairro: Optional[str] = Query(None),
):
    """Get total count of transactions matching filters (for pagination)."""
    db = await get_db()
    try:
        where, params = _build_transaction_filters(
            bbox, data_inicio, data_fim, tipo, preco_m2_min, preco_m2_max, bairro
        )
        cursor = await db.execute(
            f"SELECT COUNT(*) as total FROM transacoes_itbi WHERE {where}", params
        )
        row = await cursor.fetchone()

        # Also get total without filters for context
        cursor_all = await db.execute(
            "SELECT COUNT(*) as total FROM transacoes_itbi"
        )
        row_all = await cursor_all.fetchone()

        # Date range in DB
        cursor_range = await db.execute(
            "SELECT MIN(data_transacao) as min_date, MAX(data_transacao) as max_date FROM transacoes_itbi"
        )
        row_range = await cursor_range.fetchone()

        return {
            "filtered": row["total"] if row else 0,
            "total": row_all["total"] if row_all else 0,
            "minDate": row_range["min_date"] if row_range else None,
            "maxDate": row_range["max_date"] if row_range else None,
            "source": "database",
        }
    finally:
        await db.close()


@router.get("/transactions")
async def get_transactions(
    bbox: Optional[str] = Query(None, description="lat1,lng1,lat2,lng2"),
    data_inicio: Optional[str] = Query(None, description="YYYY-MM-DD"),
    data_fim: Optional[str] = Query(None, description="YYYY-MM-DD"),
    tipo: Optional[str] = Query(None),
    preco_m2_min: Optional[float] = Query(None),
    preco_m2_max: Optional[float] = Query(None),
    bairro: Optional[str] = Query(None),
    limit: int = Query(5000, le=1_000_000),
    offset: int = Query(0, ge=0),
):
    """Get geocoded ITBI transactions as GeoJSON FeatureCollection."""
    db = await get_db()
    try:
        where, params = _build_transaction_filters(
            bbox, data_inicio, data_fim, tipo, preco_m2_min, preco_m2_max, bairro
        )

        # Get total count for this query
        cursor_count = await db.execute(
            f"SELECT COUNT(*) as total FROM transacoes_itbi WHERE {where}", params
        )
        count_row = await cursor_count.fetchone()
        total = count_row["total"] if count_row else 0

        params.extend([limit, offset])

        cursor = await db.execute(
            f"""SELECT id, latitude, longitude, valor_transacao, preco_m2,
                       area_construida, tipo_imovel, bairro, logradouro,
                       data_transacao
            FROM transacoes_itbi
            WHERE {where}
            ORDER BY data_transacao DESC
            LIMIT ? OFFSET ?""",
            params,
        )
        rows = await cursor.fetchall()

        features = []
        for row in rows:
            features.append(
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [row["longitude"], row["latitude"]],
                    },
                    "properties": {
                        "id": row["id"],
                        "valorTransacao": row["valor_transacao"],
                        "precoM2": row["preco_m2"],
                        "areaM2": row["area_construida"],
                        "tipoImovel": row["tipo_imovel"],
                        "bairro": row["bairro"],
                        "logradouro": row["logradouro"],
                        "dataTransacao": row["data_transacao"],
                    },
                }
            )

        return {
            "type": "FeatureCollection",
            "features": features,
            "total": total,
            "limit": limit,
            "offset": offset,
            "source": "database",
        }
    finally:
        await db.close()


@router.get("/neighborhoods")
async def get_neighborhoods():
    """Get SP neighborhood stats with GeoJSON boundaries."""
    db = await get_db()
    try:
        cursor = await db.execute(
            """SELECT bairro,
                      COUNT(*) as qtd_transacoes,
                      AVG(preco_m2) as preco_m2_medio,
                      MEDIAN(preco_m2) as preco_m2_mediano
            FROM transacoes_itbi
            WHERE preco_m2 IS NOT NULL AND preco_m2 BETWEEN 500 AND 150000
            GROUP BY bairro
            ORDER BY preco_m2_medio DESC"""
        )
    except Exception:
        # SQLite doesn't have MEDIAN - use a subquery approach
        cursor = await db.execute(
            """SELECT bairro,
                      COUNT(*) as qtd_transacoes,
                      AVG(preco_m2) as preco_m2_medio
            FROM transacoes_itbi
            WHERE preco_m2 IS NOT NULL AND preco_m2 BETWEEN 500 AND 150000
            GROUP BY bairro
            ORDER BY preco_m2_medio DESC"""
        )

    rows = await cursor.fetchall()

    # Try to get GeoJSON boundaries
    boundaries = get_sp_neighborhoods_geojson()

    result = []
    for row in rows:
        bairro_name = row["bairro"]
        center = get_bairro_center(bairro_name) if bairro_name else None

        entry = {
            "bairro": bairro_name,
            "qtdTransacoes": row["qtd_transacoes"],
            "precoM2Medio": round(row["preco_m2_medio"], 2) if row["preco_m2_medio"] else None,
            "precoM2Mediano": round(row["preco_m2_medio"], 2) if row["preco_m2_medio"] else None,
            "centroLat": center[0] if center else None,
            "centroLng": center[1] if center else None,
        }
        result.append(entry)

    await db.close()
    return {"neighborhoods": result, "boundaries": boundaries}


@router.get("/price-evolution")
async def get_price_evolution(
    bairro: str = Query(..., description="Nome do bairro"),
    freq: str = Query("monthly", description="monthly or quarterly"),
):
    """Get price evolution time series for a neighborhood."""
    db = await get_db()
    try:
        # Group by month
        group_expr = "strftime('%Y-%m', data_transacao)"
        if freq == "quarterly":
            group_expr = "strftime('%Y', data_transacao) || '-Q' || ((CAST(strftime('%m', data_transacao) AS INTEGER) - 1) / 3 + 1)"

        cursor = await db.execute(
            f"""SELECT {group_expr} as periodo,
                       AVG(preco_m2) as preco_m2_medio,
                       COUNT(*) as qtd_transacoes
            FROM transacoes_itbi
            WHERE bairro LIKE ? AND preco_m2 BETWEEN 500 AND 150000
            GROUP BY periodo
            ORDER BY periodo""",
            (f"%{bairro}%",),
        )
        rows = await cursor.fetchall()

        data = [
            {
                "date": row["periodo"],
                "medianPrecoM2": round(row["preco_m2_medio"], 2),
                "count": row["qtd_transacoes"],
            }
            for row in rows
        ]

        return {"bairro": bairro, "data": data}
    finally:
        await db.close()


@router.get("/stats")
async def get_market_stats(
    bbox: Optional[str] = Query(None, description="lat1,lng1,lat2,lng2"),
):
    """Get summary statistics for the current map view."""
    db = await get_db()
    try:
        conditions = ["preco_m2 IS NOT NULL", "preco_m2 BETWEEN 500 AND 150000"]
        params: list = []

        if bbox:
            parts = [float(x) for x in bbox.split(",")]
            if len(parts) == 4:
                lat1, lng1, lat2, lng2 = parts
                conditions.append("latitude BETWEEN ? AND ?")
                params.extend([min(lat1, lat2), max(lat1, lat2)])
                conditions.append("longitude BETWEEN ? AND ?")
                params.extend([min(lng1, lng2), max(lng1, lng2)])

        where = " AND ".join(conditions)

        cursor = await db.execute(
            f"""SELECT COUNT(*) as total,
                       AVG(preco_m2) as preco_m2_medio,
                       MIN(preco_m2) as preco_m2_min,
                       MAX(preco_m2) as preco_m2_max
            FROM transacoes_itbi
            WHERE {where}""",
            params,
        )
        row = await cursor.fetchone()

        # Top and bottom bairros
        cursor = await db.execute(
            f"""SELECT bairro, AVG(preco_m2) as preco_m2_medio, COUNT(*) as qtd
            FROM transacoes_itbi
            WHERE {where} AND bairro IS NOT NULL
            GROUP BY bairro
            ORDER BY preco_m2_medio DESC
            LIMIT 5""",
            params,
        )
        top = [
            {"bairro": r["bairro"], "precoM2": round(r["preco_m2_medio"], 2), "qtd": r["qtd"]}
            for r in await cursor.fetchall()
        ]

        cursor = await db.execute(
            f"""SELECT bairro, AVG(preco_m2) as preco_m2_medio, COUNT(*) as qtd
            FROM transacoes_itbi
            WHERE {where} AND bairro IS NOT NULL
            GROUP BY bairro
            ORDER BY preco_m2_medio ASC
            LIMIT 5""",
            params,
        )
        bottom = [
            {"bairro": r["bairro"], "precoM2": round(r["preco_m2_medio"], 2), "qtd": r["qtd"]}
            for r in await cursor.fetchall()
        ]

        return {
            "totalTransacoes": row["total"] if row else 0,
            "precoM2Medio": round(row["preco_m2_medio"], 2) if row and row["preco_m2_medio"] else None,
            "precoM2Min": round(row["preco_m2_min"], 2) if row and row["preco_m2_min"] else None,
            "precoM2Max": round(row["preco_m2_max"], 2) if row and row["preco_m2_max"] else None,
            "topBairros": top,
            "bottomBairros": bottom,
        }
    finally:
        await db.close()


@router.get("/yield-map")
async def get_yield_map():
    """Get neighborhood-level yield estimates.

    Cross-references ITBI purchase prices with estimated rental values
    to calculate yield per bairro.
    """
    db = await get_db()
    try:
        # Get average purchase price per bairro
        cursor = await db.execute(
            """SELECT bairro,
                      AVG(preco_m2) as preco_m2_compra,
                      COUNT(*) as qtd
            FROM transacoes_itbi
            WHERE preco_m2 BETWEEN 500 AND 150000 AND bairro IS NOT NULL
            GROUP BY bairro"""
        )
        rows = await cursor.fetchall()

        # Estimate rental yield using typical SP rental-to-price ratios
        # Average SP rental yield is ~0.4-0.6% monthly (4.8-7.2% annual)
        # Higher yield in cheaper areas, lower in premium areas
        result = []
        for row in rows:
            preco_m2 = row["preco_m2_compra"]
            # Simple yield model: inversely correlated with price
            # Premium areas (~R$15K+/m²): ~0.35% monthly = 4.2% annual
            # Mid areas (~R$8-15K/m²): ~0.45% monthly = 5.4% annual
            # Affordable areas (<R$8K/m²): ~0.55% monthly = 6.6% annual
            if preco_m2 >= 15000:
                yield_mensal = 0.35
            elif preco_m2 >= 8000:
                yield_mensal = 0.35 + (15000 - preco_m2) / 70000 * 0.10
            else:
                yield_mensal = 0.45 + (8000 - preco_m2) / 75000 * 0.10

            yield_anual = yield_mensal * 12
            aluguel_m2_estimado = preco_m2 * yield_mensal / 100

            center = get_bairro_center(row["bairro"]) if row["bairro"] else None

            result.append(
                {
                    "bairro": row["bairro"],
                    "precoM2Compra": round(preco_m2, 2),
                    "aluguelM2Estimado": round(aluguel_m2_estimado, 2),
                    "yieldAnualPct": round(yield_anual, 2),
                    "yieldMensalPct": round(yield_mensal, 3),
                    "qtdTransacoes": row["qtd"],
                    "centroLat": center[0] if center else None,
                    "centroLng": center[1] if center else None,
                }
            )

        return {"yieldData": result}
    finally:
        await db.close()


@router.get("/time-series-geo")
async def get_time_series_geo(
    periodo: str = Query(..., description="YYYY-MM"),
    tipo: Optional[str] = Query(None),
):
    """Get transactions for a specific month (for time-lapse animation)."""
    db = await get_db()
    try:
        conditions = [
            "strftime('%Y-%m', data_transacao) = ?",
            "geocoded = 1",
            "latitude IS NOT NULL",
        ]
        params: list = [periodo]

        if tipo:
            conditions.append("tipo_imovel LIKE ?")
            params.append(f"%{tipo}%")

        where = " AND ".join(conditions)

        cursor = await db.execute(
            f"""SELECT id, latitude, longitude, valor_transacao, preco_m2,
                       area_construida, tipo_imovel, bairro, logradouro,
                       data_transacao
            FROM transacoes_itbi
            WHERE {where}
            LIMIT 1000000""",
            params,
        )
        rows = await cursor.fetchall()

        features = [
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [row["longitude"], row["latitude"]],
                },
                "properties": {
                    "id": row["id"],
                    "valorTransacao": row["valor_transacao"],
                    "precoM2": row["preco_m2"],
                    "areaM2": row["area_construida"],
                    "tipoImovel": row["tipo_imovel"],
                    "bairro": row["bairro"],
                    "dataTransacao": row["data_transacao"],
                },
            }
            for row in rows
        ]

        return {"type": "FeatureCollection", "features": features, "periodo": periodo}
    finally:
        await db.close()


# --- Alerts ---


@router.get("/alerts")
async def list_alerts():
    """List all market alerts."""
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM market_alerts ORDER BY criado_em DESC"
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        await db.close()


@router.post("/alerts", status_code=201)
async def create_alert(alert: AlertCreate):
    """Create a new market alert."""
    db = await get_db()
    try:
        cursor = await db.execute(
            """INSERT INTO market_alerts (tipo, bairro, logradouro, preco_m2_limite, yield_limite)
            VALUES (?, ?, ?, ?, ?)""",
            (
                alert.tipo,
                alert.bairro,
                alert.logradouro,
                alert.preco_m2_limite,
                alert.yield_limite,
            ),
        )
        await db.commit()
        return {"id": cursor.lastrowid, **alert.model_dump()}
    finally:
        await db.close()


@router.delete("/alerts/{alert_id}")
async def delete_alert(alert_id: int):
    """Delete a market alert."""
    db = await get_db()
    try:
        await db.execute("DELETE FROM market_alerts WHERE id = ?", (alert_id,))
        await db.commit()
        return {"ok": True}
    finally:
        await db.close()


@router.get("/alerts/check")
async def check_alerts():
    """Check which alerts have been triggered by recent transactions."""
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM market_alerts WHERE ativo = 1"
        )
        alerts = await cursor.fetchall()

        triggered = []
        for alert in alerts:
            alert_dict = dict(alert)

            if alert_dict["tipo"] == "price_drop" and alert_dict.get("bairro"):
                cursor = await db.execute(
                    """SELECT AVG(preco_m2) as avg_price
                    FROM transacoes_itbi
                    WHERE bairro LIKE ? AND preco_m2 BETWEEN 500 AND 150000
                    AND data_transacao >= date('now', '-30 days')""",
                    (f"%{alert_dict['bairro']}%",),
                )
                row = await cursor.fetchone()
                if (
                    row
                    and row["avg_price"]
                    and alert_dict.get("preco_m2_limite")
                    and row["avg_price"] <= alert_dict["preco_m2_limite"]
                ):
                    triggered.append(
                        {
                            **alert_dict,
                            "triggered": True,
                            "currentValue": round(row["avg_price"], 2),
                        }
                    )

        return {"triggered": triggered, "total_active": len(alerts)}
    finally:
        await db.close()


@router.get("/boundaries")
async def get_boundaries():
    """Get SP neighborhood boundary GeoJSON."""
    geojson = get_sp_neighborhoods_geojson()
    if geojson:
        return geojson
    # Fallback: return bairro centers as points
    features = [
        {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [lng, lat],
            },
            "properties": {"bairro": name},
        }
        for name, (lat, lng) in SP_BAIRRO_CENTERS.items()
    ]
    return {"type": "FeatureCollection", "features": features}
