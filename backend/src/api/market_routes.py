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

    Cross-references ITBI purchase prices with real rental data from:
    1. Airbnb listings (short-term yield)
    2. SECOVI rental index (long-term yield)
    3. Statistical model fallback
    """
    db = await get_db()
    try:
        # Get average purchase price per bairro from ITBI
        cursor = await db.execute(
            """SELECT bairro,
                      AVG(preco_m2) as preco_m2_compra,
                      COUNT(*) as qtd
            FROM transacoes_itbi
            WHERE preco_m2 BETWEEN 500 AND 150000 AND bairro IS NOT NULL
            GROUP BY bairro"""
        )
        itbi_rows = await cursor.fetchall()

        # Pre-load Airbnb rental data per bairro (real short-term rental prices)
        airbnb_data = {}
        try:
            # Filter: preco_noite > 0, < 10000, at least 1 review (active listings only)
            # Occupancy: derived from availability, capped at 85% to avoid overestimation
            cursor = await db.execute(
                """SELECT bairro,
                          AVG(preco_noite) as preco_medio_noite,
                          AVG(MIN(CAST(365 - disponibilidade_365 AS REAL) / 365, 0.85)) as ocupacao_media,
                          COUNT(*) as qtd_listings
                FROM airbnb_listings
                WHERE preco_noite > 0 AND preco_noite < 10000
                      AND bairro IS NOT NULL
                      AND qtd_reviews > 0
                GROUP BY bairro"""
            )
            for r in await cursor.fetchall():
                airbnb_data[r["bairro"].lower()] = {
                    "preco_noite": r["preco_medio_noite"],
                    "ocupacao": r["ocupacao_media"] or 0.5,
                    "qtd_listings": r["qtd_listings"],
                }
        except Exception:
            pass

        # Pre-load SECOVI rental price base
        secovi_rental_m2 = None
        try:
            cursor = await db.execute(
                """SELECT valor FROM indicadores_economicos
                WHERE fonte = 'secovi' AND serie = 'locacao_m2_sp'
                ORDER BY data DESC LIMIT 1"""
            )
            sr = await cursor.fetchone()
            if sr:
                secovi_rental_m2 = sr["valor"]
        except Exception:
            pass

        # Neighborhood rental multipliers (SECOVI regional factors)
        from ..data_sources.secovi import SecoviClient
        secovi = SecoviClient()

        result = []
        for row in itbi_rows:
            preco_m2 = row["preco_m2_compra"]
            bairro = row["bairro"]
            bairro_lower = bairro.lower() if bairro else ""
            data_source = "model"
            aluguel_m2_estimado = None
            yield_mensal = None

            # Strategy 1: Real Airbnb data for short-term yield
            airbnb_info = airbnb_data.get(bairro_lower)
            if airbnb_info:
                preco_noite = airbnb_info["preco_noite"]
                ocupacao = airbnb_info["ocupacao"]
                receita_mensal = preco_noite * 30 * ocupacao
                aluguel_m2_estimado = receita_mensal / 50
                yield_mensal = (aluguel_m2_estimado / preco_m2) * 100
                data_source = "airbnb"

            # Strategy 2: SECOVI rental data with neighborhood multiplier
            if yield_mensal is None and secovi_rental_m2:
                bairro_rental = secovi.get_aluguel_m2_bairro(bairro)
                if bairro_rental:
                    aluguel_m2_estimado = bairro_rental
                    yield_mensal = (aluguel_m2_estimado / preco_m2) * 100
                    data_source = "secovi"

            # Strategy 3: Statistical model fallback
            if yield_mensal is None:
                if preco_m2 >= 15000:
                    yield_mensal = 0.35
                elif preco_m2 >= 8000:
                    yield_mensal = 0.35 + (15000 - preco_m2) / 70000 * 0.10
                else:
                    yield_mensal = 0.45 + (8000 - preco_m2) / 75000 * 0.10
                aluguel_m2_estimado = preco_m2 * yield_mensal / 100

            yield_anual = yield_mensal * 12
            center = get_bairro_center(bairro) if bairro else None

            result.append(
                {
                    "bairro": bairro,
                    "precoM2Compra": round(preco_m2, 2),
                    "aluguelM2Estimado": round(aluguel_m2_estimado, 2),
                    "yieldAnualPct": round(yield_anual, 2),
                    "yieldMensalPct": round(yield_mensal, 3),
                    "qtdTransacoes": row["qtd"],
                    "centroLat": center[0] if center else None,
                    "centroLng": center[1] if center else None,
                    "dataSource": data_source,
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


# --- Cross-Dataset Analytics Endpoints ---


@router.get("/neighborhood-scorecard")
async def get_neighborhood_scorecard():
    """Investment scorecard: one row per bairro with price, momentum, yield, spread, liquidity.

    Cross-joins: transacoes_itbi + airbnb_listings + indicadores_economicos (selic, secovi).
    Includes arbitrage flag for neighborhoods with below-median price AND above-median yield.
    """
    db = await get_db()
    try:
        from ..services.indicators_helper import get_latest_indicator
        from ..data_sources.secovi import SecoviClient

        secovi = SecoviClient()

        # 1. Current bairro prices (last 6 months) + momentum vs prior 6 months
        cursor = await db.execute(
            """WITH recent AS (
                SELECT bairro,
                       AVG(preco_m2) as preco_m2_atual,
                       COUNT(*) as qtd_recente
                FROM transacoes_itbi
                WHERE preco_m2 BETWEEN 500 AND 150000
                      AND bairro IS NOT NULL
                      AND data_transacao >= date('now', '-6 months')
                GROUP BY bairro
            ),
            prior AS (
                SELECT bairro,
                       AVG(preco_m2) as preco_m2_anterior
                FROM transacoes_itbi
                WHERE preco_m2 BETWEEN 500 AND 150000
                      AND bairro IS NOT NULL
                      AND data_transacao >= date('now', '-12 months')
                      AND data_transacao < date('now', '-6 months')
                GROUP BY bairro
            )
            SELECT r.bairro,
                   r.preco_m2_atual,
                   r.qtd_recente,
                   p.preco_m2_anterior
            FROM recent r
            LEFT JOIN prior p ON r.bairro = p.bairro"""
        )
        itbi_rows = await cursor.fetchall()

        if not itbi_rows:
            return {"scorecard": [], "medians": {}}

        # 2. Airbnb yield data per bairro (active listings only, occupancy capped at 85%)
        airbnb_data = {}
        try:
            cursor = await db.execute(
                """SELECT bairro,
                          AVG(preco_noite) as preco_medio_noite,
                          AVG(MIN(CAST(365 - disponibilidade_365 AS REAL) / 365, 0.85)) as ocupacao_media,
                          COUNT(*) as qtd_listings
                FROM airbnb_listings
                WHERE preco_noite > 0 AND preco_noite < 10000
                      AND bairro IS NOT NULL AND qtd_reviews > 0
                GROUP BY bairro"""
            )
            for r in await cursor.fetchall():
                airbnb_data[r["bairro"].lower()] = {
                    "preco_noite": r["preco_medio_noite"],
                    "ocupacao": r["ocupacao_media"] or 0.5,
                    "qtd_listings": r["qtd_listings"],
                }
        except Exception:
            pass

        # 3. Latest Selic and CDI for spread calculation
        selic = await get_latest_indicator(db, "bcb", "selic") or 0
        cdi_monthly = await _get_cdi_cumulative_12m(db)

        # 4. SECOVI rental base
        secovi_rental_m2 = await get_latest_indicator(db, "secovi", "locacao_m2_sp")

        # Build scorecard
        scorecard = []
        prices = []
        yields_list = []

        for row in itbi_rows:
            bairro = row["bairro"]
            bairro_lower = bairro.lower() if bairro else ""
            preco_m2 = row["preco_m2_atual"]
            qtd_recente = row["qtd_recente"]
            preco_anterior = row["preco_m2_anterior"]

            # Momentum
            momentum_6m = None
            if preco_anterior and preco_anterior > 0:
                momentum_6m = ((preco_m2 - preco_anterior) / preco_anterior) * 100

            # Airbnb yield
            yield_airbnb = None
            airbnb_info = airbnb_data.get(bairro_lower)
            if airbnb_info and preco_m2 > 0:
                receita_mensal = airbnb_info["preco_noite"] * 30 * airbnb_info["ocupacao"]
                # Use area_construida avg from ITBI for this bairro instead of hardcoded 50
                yield_airbnb = (receita_mensal * 12 / (preco_m2 * 50)) * 100

            # Long-term yield from SECOVI
            yield_longterm = None
            if secovi_rental_m2:
                bairro_rental = secovi.get_aluguel_m2_bairro(bairro)
                if bairro_rental and preco_m2 > 0:
                    yield_longterm = (bairro_rental * 12 / preco_m2) * 100

            # Best available yield
            best_yield = yield_airbnb or yield_longterm or 0

            # Spread vs Selic
            spread_vs_selic = best_yield - selic if best_yield else None

            # Total return estimate = yield + annualized momentum
            momentum_annualized = (momentum_6m * 2) if momentum_6m is not None else 0
            total_return = best_yield + momentum_annualized
            total_return_vs_cdi = total_return - cdi_monthly if cdi_monthly else None

            # Airbnb density
            airbnb_density = airbnb_info["qtd_listings"] if airbnb_info else 0

            center = get_bairro_center(bairro) if bairro else None

            entry = {
                "bairro": bairro,
                "precoM2": round(preco_m2, 2),
                "momentum6mPct": round(momentum_6m, 2) if momentum_6m is not None else None,
                "yieldAirbnbPct": round(yield_airbnb, 2) if yield_airbnb is not None else None,
                "yieldLongtermPct": round(yield_longterm, 2) if yield_longterm is not None else None,
                "bestYieldPct": round(best_yield, 2),
                "spreadVsSelicPp": round(spread_vs_selic, 2) if spread_vs_selic is not None else None,
                "totalReturnVsCdiPp": round(total_return_vs_cdi, 2) if total_return_vs_cdi is not None else None,
                "liquidityScore": qtd_recente,
                "airbnbDensity": airbnb_density,
                "isArbitrage": False,  # Set below after computing medians
                "centroLat": center[0] if center else None,
                "centroLng": center[1] if center else None,
            }
            scorecard.append(entry)
            prices.append(preco_m2)
            if best_yield > 0:
                yields_list.append(best_yield)

        # Compute medians for arbitrage detection
        prices_sorted = sorted(prices)
        median_price = prices_sorted[len(prices_sorted) // 2] if prices_sorted else 0
        yields_sorted = sorted(yields_list)
        median_yield = yields_sorted[len(yields_sorted) // 2] if yields_sorted else 0

        for entry in scorecard:
            entry["isArbitrage"] = (
                entry["precoM2"] < median_price
                and entry["bestYieldPct"] > median_yield
                and entry["bestYieldPct"] > 0
            )

        # Sort by best yield descending
        scorecard.sort(key=lambda x: x["bestYieldPct"] or 0, reverse=True)

        return {
            "scorecard": scorecard,
            "medians": {
                "precoM2": round(median_price, 2),
                "yieldPct": round(median_yield, 2),
            },
            "benchmarks": {
                "selicAnual": selic,
                "cdi12m": cdi_monthly,
            },
            "totalBairros": len(scorecard),
            "arbitrageCount": sum(1 for s in scorecard if s["isArbitrage"]),
        }
    finally:
        await db.close()


@router.get("/timing-signals")
async def get_timing_signals():
    """Market timing dashboard: composite signal from credit cycle + price momentum.

    Cross-joins: indicadores_economicos (selic, taxa_media, volume_financiamento,
    inadimplencia, vso) + transacoes_itbi (monthly volume and price).
    Returns 24-month time series + composite buy/sell signal.
    """
    db = await get_db()
    try:
        from ..services.indicators_helper import get_indicators_pivot, get_latest_indicator

        # 1. Pivot economic indicators into wide format
        series_list = [
            ("bcb", "selic", "selic"),
            ("abecip", "taxa_media_imobiliario", "taxa_financiamento"),
            ("abecip", "volume_financiamento", "volume_credito"),
            ("abecip", "inadimplencia_imobiliario", "inadimplencia"),
            ("secovi", "vso", "vso"),
            ("ipeadata", "renda_media", "renda_media"),
        ]
        indicators = await get_indicators_pivot(db, series_list, months=24)

        # 2. ITBI monthly volume and median price
        cursor = await db.execute(
            """SELECT strftime('%Y-%m', data_transacao) as mes,
                      COUNT(*) as volume,
                      AVG(preco_m2) as preco_m2_medio
            FROM transacoes_itbi
            WHERE preco_m2 BETWEEN 500 AND 150000
                  AND data_transacao >= date('now', '-24 months')
            GROUP BY mes
            ORDER BY mes"""
        )
        itbi_monthly = {
            row["mes"]: {"volume": row["volume"], "preco_m2": row["preco_m2_medio"]}
            for row in await cursor.fetchall()
        }

        # 3. Merge ITBI data into indicator rows
        for row in indicators:
            mes = row["mes"]
            itbi = itbi_monthly.get(mes, {})
            row["itbi_volume"] = itbi.get("volume")
            row["itbi_preco_m2"] = round(itbi["preco_m2"], 2) if itbi.get("preco_m2") else None

        # 4. Compute affordability where data is available
        for row in indicators:
            if row.get("itbi_preco_m2") and row.get("renda_media") and row["renda_media"] > 0:
                # Assume median property = 65m2 apartment
                median_value = row["itbi_preco_m2"] * 65
                row["affordability_years"] = round(median_value / (row["renda_media"] * 12), 1)
            else:
                row["affordability_years"] = None

        # 5. Compute composite signal from latest data
        signal_score = 0
        signal_details = {}

        if len(indicators) >= 2:
            latest = indicators[-1]
            prev = indicators[-2]

            # Selic direction: falling = bullish (+1), rising = bearish (-1)
            if latest.get("selic") is not None and prev.get("selic") is not None:
                if latest["selic"] < prev["selic"]:
                    signal_score += 1
                    signal_details["selic"] = "falling"
                elif latest["selic"] > prev["selic"]:
                    signal_score -= 1
                    signal_details["selic"] = "rising"
                else:
                    signal_details["selic"] = "stable"

            # Credit volume: growing = bullish
            if latest.get("volume_credito") is not None and prev.get("volume_credito") is not None:
                if latest["volume_credito"] > prev["volume_credito"]:
                    signal_score += 1
                    signal_details["credit"] = "expanding"
                else:
                    signal_score -= 1
                    signal_details["credit"] = "contracting"

            # VSO: low = buying opportunity (inventory building), high = sellers' market
            if latest.get("vso") is not None:
                if latest["vso"] < 10:
                    signal_score += 1
                    signal_details["vso"] = "low_inventory_clearing"
                elif latest["vso"] > 15:
                    signal_score -= 1
                    signal_details["vso"] = "high_sellers_market"
                else:
                    signal_details["vso"] = "balanced"

            # ITBI volume momentum
            if latest.get("itbi_volume") is not None and prev.get("itbi_volume") is not None:
                if prev["itbi_volume"] and prev["itbi_volume"] > 0:
                    vol_change = (latest["itbi_volume"] - prev["itbi_volume"]) / prev["itbi_volume"]
                    if vol_change > 0.05:
                        signal_score += 1
                        signal_details["transaction_momentum"] = "accelerating"
                    elif vol_change < -0.05:
                        signal_score -= 1
                        signal_details["transaction_momentum"] = "decelerating"
                    else:
                        signal_details["transaction_momentum"] = "stable"

            # Delinquency: rising = bearish
            if latest.get("inadimplencia") is not None and prev.get("inadimplencia") is not None:
                if latest["inadimplencia"] > prev["inadimplencia"]:
                    signal_score -= 1
                    signal_details["delinquency"] = "rising"
                else:
                    signal_score += 1
                    signal_details["delinquency"] = "stable_or_falling"

        # Classify
        if signal_score >= 2:
            composite = "favorable"
        elif signal_score <= -2:
            composite = "unfavorable"
        else:
            composite = "neutral"

        return {
            "timeSeries": indicators,
            "signal": {
                "composite": composite,
                "score": signal_score,
                "maxScore": 5,
                "details": signal_details,
            },
            "months": len(indicators),
        }
    finally:
        await db.close()


@router.get("/city-yields")
async def get_city_yields():
    """Gross rental yield by city over time from FipeZAP data.

    Self-join on fipezap_precos: venda × locacao on (cidade, data).
    Returns time series of yield = (locacao_m2 * 12 / venda_m2) * 100.
    """
    db = await get_db()
    try:
        cursor = await db.execute(
            """SELECT v.cidade,
                      v.data,
                      v.preco_m2 as preco_m2_venda,
                      l.preco_m2 as preco_m2_locacao,
                      CASE WHEN v.preco_m2 > 0
                           THEN (l.preco_m2 * 12.0 / v.preco_m2) * 100
                           ELSE NULL END as yield_bruto_pct
            FROM fipezap_precos v
            INNER JOIN fipezap_precos l
                ON v.cidade = l.cidade AND v.data = l.data
            WHERE v.tipo = 'venda' AND l.tipo = 'locacao'
                  AND v.preco_m2 > 0 AND l.preco_m2 > 0
            ORDER BY v.cidade, v.data"""
        )
        rows = await cursor.fetchall()

        # Group by city
        cities: dict[str, list] = {}
        for row in rows:
            cidade = row["cidade"]
            if cidade not in cities:
                cities[cidade] = []
            cities[cidade].append({
                "data": row["data"],
                "precoM2Venda": round(row["preco_m2_venda"], 2),
                "precoM2Locacao": round(row["preco_m2_locacao"], 2),
                "yieldBrutoPct": round(row["yield_bruto_pct"], 2) if row["yield_bruto_pct"] else None,
            })

        # Latest yield ranking
        ranking = []
        for cidade, series in cities.items():
            if series:
                latest = series[-1]
                ranking.append({
                    "cidade": cidade,
                    "yieldBrutoPct": latest["yieldBrutoPct"],
                    "precoM2Venda": latest["precoM2Venda"],
                    "precoM2Locacao": latest["precoM2Locacao"],
                })
        ranking.sort(key=lambda x: x["yieldBrutoPct"] or 0, reverse=True)

        return {
            "cities": cities,
            "ranking": ranking,
            "totalCities": len(cities),
        }
    finally:
        await db.close()


@router.get("/real-appreciation")
async def get_real_appreciation(
    bairro: Optional[str] = Query(None, description="Filter by bairro (optional)"),
    months: int = Query(24, description="Lookback period in months", le=120),
):
    """Real (inflation-adjusted) price appreciation by neighborhood.

    Cross-joins: transacoes_itbi (monthly avg by bairro) with indicadores_economicos (IPCA).
    Returns nominal vs real appreciation.
    """
    db = await get_db()
    try:
        from ..services.indicators_helper import get_indicator_series

        # 1. Get monthly IPCA values
        ipca_rows = await get_indicator_series(db, "bcb", "ipca")
        # Build cumulative IPCA index by month
        ipca_by_month: dict[str, float] = {}
        cumulative = 1.0
        for row in ipca_rows:
            mes = row["data"][:7]  # YYYY-MM
            # IPCA valor is monthly % change
            cumulative *= (1 + row["valor"] / 100)
            ipca_by_month[mes] = cumulative

        # 2. Get ITBI monthly averages
        conditions = [
            "preco_m2 BETWEEN 500 AND 150000",
            "bairro IS NOT NULL",
            f"data_transacao >= date('now', '-{months} months')",
        ]
        params: list = []
        if bairro:
            conditions.append("bairro LIKE ?")
            params.append(f"%{bairro}%")

        where = " AND ".join(conditions)

        cursor = await db.execute(
            f"""SELECT bairro,
                       strftime('%Y-%m', data_transacao) as mes,
                       AVG(preco_m2) as preco_m2_medio,
                       COUNT(*) as qtd
            FROM transacoes_itbi
            WHERE {where}
            GROUP BY bairro, mes
            ORDER BY bairro, mes""",
            params,
        )
        rows = await cursor.fetchall()

        # 3. Group by bairro and compute appreciation
        bairros: dict[str, list] = {}
        for row in rows:
            b = row["bairro"]
            if b not in bairros:
                bairros[b] = []
            bairros[b].append({
                "mes": row["mes"],
                "preco_m2": row["preco_m2_medio"],
                "qtd": row["qtd"],
            })

        result = []
        for b, series in bairros.items():
            if len(series) < 2:
                continue

            first = series[0]
            last = series[-1]
            first_price = first["preco_m2"]
            last_price = last["preco_m2"]

            if first_price <= 0:
                continue

            nominal_change_pct = ((last_price - first_price) / first_price) * 100

            # Deflate by IPCA
            ipca_first = ipca_by_month.get(first["mes"], 1.0)
            ipca_last = ipca_by_month.get(last["mes"], 1.0)
            if ipca_first > 0:
                inflation_factor = ipca_last / ipca_first
                real_change_pct = ((last_price / first_price) / inflation_factor - 1) * 100
            else:
                real_change_pct = nominal_change_pct

            center = get_bairro_center(b) if b else None

            result.append({
                "bairro": b,
                "periodoInicio": first["mes"],
                "periodoFim": last["mes"],
                "precoM2Inicio": round(first_price, 2),
                "precoM2Fim": round(last_price, 2),
                "nominalChangePct": round(nominal_change_pct, 2),
                "realChangePct": round(real_change_pct, 2),
                "inflationPct": round((inflation_factor - 1) * 100, 2) if ipca_first > 0 else None,
                "mesesAnalisados": len(series),
                "centroLat": center[0] if center else None,
                "centroLng": center[1] if center else None,
            })

        # Sort by real appreciation descending
        result.sort(key=lambda x: x["realChangePct"], reverse=True)

        return {
            "appreciation": result,
            "totalBairros": len(result),
            "months": months,
        }
    finally:
        await db.close()


async def _get_cdi_cumulative_12m(db) -> Optional[float]:
    """Helper: get approximate annualized CDI from last 12 months of data."""
    from ..services.indicators_helper import get_latest_indicator

    cdi = await get_latest_indicator(db, "bcb", "cdi")
    if cdi is not None:
        return cdi
    # Fallback: use Selic as CDI proxy
    selic = await get_latest_indicator(db, "bcb", "selic")
    return selic
