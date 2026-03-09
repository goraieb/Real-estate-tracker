"""Nominatim geocoding service with database caching.

Geocodes addresses from ITBI transactions using OpenStreetMap's Nominatim.
Rate-limited to 1 request/second per Nominatim usage policy.

Usage:
    python -m src.services.geocoding --batch --limit=1000
"""

import argparse
import asyncio
import logging
import time
import unicodedata
from pathlib import Path

logger = logging.getLogger(__name__)


def normalize_address(
    logradouro: str | None,
    numero: str | None,
    bairro: str | None,
    cidade: str = "São Paulo",
    uf: str = "SP",
) -> str:
    """Normalize an address string for cache lookup."""
    parts = []
    if logradouro:
        parts.append(logradouro.strip())
    if numero:
        parts.append(numero.strip())
    if bairro:
        parts.append(bairro.strip())
    parts.extend([cidade, uf, "Brasil"])
    addr = ", ".join(parts)
    # Normalize unicode (remove accents for consistent caching)
    addr = unicodedata.normalize("NFKD", addr).encode("ascii", "ignore").decode()
    return addr.lower().strip()


class GeocodingService:
    """Geocoding service using Nominatim with SQLite cache."""

    def __init__(self):
        self._last_request_time = 0.0
        self._min_interval = 1.1  # seconds between requests

    def _rate_limit(self):
        """Enforce Nominatim rate limit of 1 req/sec."""
        elapsed = time.time() - self._last_request_time
        if elapsed < self._min_interval:
            time.sleep(self._min_interval - elapsed)
        self._last_request_time = time.time()

    def geocode_address(
        self,
        logradouro: str | None,
        numero: str | None,
        bairro: str | None,
        cidade: str = "São Paulo",
        uf: str = "SP",
    ) -> tuple[float | None, float | None]:
        """Geocode a single address using Nominatim.

        Returns:
            (latitude, longitude) tuple, or (None, None) if not found.
        """
        from geopy.geocoders import Nominatim

        geocoder = Nominatim(
            user_agent="real-estate-tracker-br/1.0",
            timeout=10,
        )

        # Try full address first
        full_addr = normalize_address(logradouro, numero, bairro, cidade, uf)
        self._rate_limit()
        try:
            location = geocoder.geocode(full_addr)
            if location:
                return (location.latitude, location.longitude)
        except Exception as e:
            logger.debug(f"Geocode failed for '{full_addr}': {e}")

        # Fallback: without numero
        if numero:
            addr_no_num = normalize_address(logradouro, None, bairro, cidade, uf)
            self._rate_limit()
            try:
                location = geocoder.geocode(addr_no_num)
                if location:
                    return (location.latitude, location.longitude)
            except Exception as e:
                logger.debug(f"Geocode fallback failed for '{addr_no_num}': {e}")

        # Fallback: bairro only
        if bairro:
            bairro_addr = f"{bairro}, {cidade}, {uf}, Brasil"
            self._rate_limit()
            try:
                location = geocoder.geocode(bairro_addr)
                if location:
                    return (location.latitude, location.longitude)
            except Exception as e:
                logger.debug(f"Geocode bairro fallback failed: {e}")

        return (None, None)


async def check_cache(
    db, endereco_normalizado: str
) -> tuple[float | None, float | None]:
    """Check geocode cache for a previously geocoded address."""
    cursor = await db.execute(
        "SELECT latitude, longitude FROM geocode_cache WHERE endereco_normalizado = ?",
        (endereco_normalizado,),
    )
    row = await cursor.fetchone()
    if row:
        return (row[0], row[1])
    return (None, None)


async def save_to_cache(
    db, endereco_normalizado: str, lat: float, lng: float
):
    """Save geocoded result to cache."""
    await db.execute(
        """INSERT OR REPLACE INTO geocode_cache
        (endereco_normalizado, latitude, longitude, provider)
        VALUES (?, ?, ?, 'nominatim')""",
        (endereco_normalizado, lat, lng),
    )


async def batch_geocode(limit: int = 1000):
    """Geocode ungecoded ITBI transactions in the database.

    Prioritizes recent transactions first.

    Args:
        limit: Maximum number of addresses to geocode in this batch.
    """
    import aiosqlite

    from ..database.db import DB_PATH

    service = GeocodingService()

    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row

        # Get ungecoded transactions, recent first
        cursor = await db.execute(
            """SELECT id, logradouro, numero, bairro, cidade
            FROM transacoes_itbi
            WHERE geocoded = 0 AND logradouro IS NOT NULL
            ORDER BY data_transacao DESC
            LIMIT ?""",
            (limit,),
        )
        rows = await cursor.fetchall()

        if not rows:
            logger.info("No transactions to geocode")
            return

        logger.info(f"Geocoding {len(rows)} transactions...")
        geocoded_count = 0
        failed_count = 0

        for row in rows:
            addr_key = normalize_address(
                row["logradouro"],
                row["numero"],
                row["bairro"],
                row["cidade"] or "São Paulo",
            )

            # Check cache first
            lat, lng = await check_cache(db, addr_key)

            if lat is None:
                # Geocode it
                lat, lng = service.geocode_address(
                    row["logradouro"],
                    row["numero"],
                    row["bairro"],
                    row["cidade"] or "São Paulo",
                )

                if lat is not None and lng is not None:
                    await save_to_cache(db, addr_key, lat, lng)

            if lat is not None and lng is not None:
                await db.execute(
                    "UPDATE transacoes_itbi SET latitude = ?, longitude = ?, geocoded = 1 WHERE id = ?",
                    (lat, lng, row["id"]),
                )
                geocoded_count += 1
            else:
                # Mark as attempted (geocoded=-1 means failed)
                await db.execute(
                    "UPDATE transacoes_itbi SET geocoded = -1 WHERE id = ?",
                    (row["id"],),
                )
                failed_count += 1

            if (geocoded_count + failed_count) % 50 == 0:
                await db.commit()
                logger.info(
                    f"Progress: {geocoded_count} geocoded, {failed_count} failed"
                )

        await db.commit()
        logger.info(
            f"Done: {geocoded_count} geocoded, {failed_count} failed out of {len(rows)}"
        )


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(description="Geocoding service for ITBI data")
    parser.add_argument(
        "--batch", action="store_true", help="Run batch geocoding"
    )
    parser.add_argument(
        "--limit", type=int, default=1000, help="Max addresses to geocode"
    )
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO)

    if args.batch:
        asyncio.run(batch_geocode(limit=args.limit))


if __name__ == "__main__":
    main()
