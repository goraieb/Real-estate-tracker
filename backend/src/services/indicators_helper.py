"""Helper for querying indicadores_economicos table (EAV pattern).

The indicadores_economicos table stores all economic indicators in a tall/narrow
Entity-Attribute-Value format: (fonte, serie, data, valor).

This module provides helper functions to:
1. Query a single series as a time series
2. Pivot multiple series into a wide-format dict (month → {serie1: val, serie2: val})
3. Get the latest value for a given series
"""

import aiosqlite
from typing import Optional


async def get_indicator_series(
    db: aiosqlite.Connection,
    fonte: str,
    serie: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> list[dict]:
    """Query a single indicator series from the cache.

    Args:
        db: Open aiosqlite connection.
        fonte: Data source (e.g., 'bcb', 'abecip', 'secovi').
        serie: Series name (e.g., 'selic', 'ipca').
        start_date: Optional YYYY-MM-DD filter.
        end_date: Optional YYYY-MM-DD filter.

    Returns:
        List of {'data': str, 'valor': float} sorted by date ascending.
    """
    conditions = ["fonte = ?", "serie = ?"]
    params: list = [fonte, serie]

    if start_date:
        conditions.append("data >= ?")
        params.append(start_date)
    if end_date:
        conditions.append("data <= ?")
        params.append(end_date)

    where = " AND ".join(conditions)
    cursor = await db.execute(
        f"SELECT data, valor FROM indicadores_economicos WHERE {where} ORDER BY data ASC",
        params,
    )
    rows = await cursor.fetchall()
    return [{"data": row["data"], "valor": row["valor"]} for row in rows]


async def get_latest_indicator(
    db: aiosqlite.Connection,
    fonte: str,
    serie: str,
) -> Optional[float]:
    """Get the most recent value for a given indicator series.

    Returns:
        The latest valor, or None if no data.
    """
    cursor = await db.execute(
        """SELECT valor FROM indicadores_economicos
        WHERE fonte = ? AND serie = ?
        ORDER BY data DESC LIMIT 1""",
        (fonte, serie),
    )
    row = await cursor.fetchone()
    return row["valor"] if row else None


async def get_indicator_monthly(
    db: aiosqlite.Connection,
    fonte: str,
    serie: str,
    months: int = 24,
) -> list[dict]:
    """Get monthly aggregated indicator values (last N months).

    For series with multiple values per month (e.g., daily Selic),
    takes the last value of each month.

    Returns:
        List of {'mes': 'YYYY-MM', 'valor': float}.
    """
    cursor = await db.execute(
        """SELECT mes, valor FROM (
            SELECT strftime('%Y-%m', data) as mes,
                   valor,
                   ROW_NUMBER() OVER (PARTITION BY strftime('%Y-%m', data) ORDER BY data DESC) as rn
            FROM indicadores_economicos
            WHERE fonte = ? AND serie = ?
        ) WHERE rn = 1
        ORDER BY mes DESC
        LIMIT ?""",
        (fonte, serie, months),
    )
    rows = await cursor.fetchall()
    return [{"mes": row["mes"], "valor": row["valor"]} for row in reversed(list(rows))]


async def get_indicators_pivot(
    db: aiosqlite.Connection,
    series_list: list[tuple[str, str, str]],
    months: int = 24,
) -> list[dict]:
    """Pivot multiple indicator series into wide-format rows by month.

    Args:
        db: Open aiosqlite connection.
        series_list: List of (fonte, serie, alias) tuples.
            alias is the key name in the output dict.
        months: Number of months to look back.

    Returns:
        List of dicts: [{'mes': 'YYYY-MM', 'selic': 13.75, 'ipca': 0.56, ...}]
        Sorted ascending by month.
    """
    if not series_list:
        return []

    # Fetch each series independently and merge by month
    series_data: dict[str, dict[str, float]] = {}  # alias → {mes → valor}

    for fonte, serie, alias in series_list:
        rows = await get_indicator_monthly(db, fonte, serie, months)
        series_data[alias] = {r["mes"]: r["valor"] for r in rows}

    # Collect all months
    all_months: set[str] = set()
    for data in series_data.values():
        all_months.update(data.keys())

    if not all_months:
        return []

    # Build wide-format rows
    result = []
    for mes in sorted(all_months):
        row: dict = {"mes": mes}
        for alias, data in series_data.items():
            row[alias] = data.get(mes)
        result.append(row)

    return result
