"""Data ingestion orchestrator — loads real market data from all sources into the database.

Replaces mock data with actual data from:
- ITBI transactions (Prefeitura SP)
- BCB economic indicators (Selic, IPCA, IGP-M, CDI, TR, INCC)
- Ipeadata economic series
- FipeZAP price indices (when Excel files are available)
- Inside Airbnb listings
- B3 IFIX (real estate fund index)
- ABECIP credit data
- CUB construction costs
- SECOVI rental/sales velocity data

Usage:
    from src.services.data_loader import DataLoader
    loader = DataLoader()

    # Load all sources:
    await loader.load_all()

    # Load specific source:
    await loader.load_bcb_indicators()
    await loader.load_itbi(years=[2023, 2024, 2025])
"""

import asyncio
import logging
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Optional

import aiosqlite
import pandas as pd

from ..database.db import DB_PATH, init_db
from ..data_sources.bcb import BCBClient, SERIES as BCB_SERIES
from ..data_sources.ipeadata import IpeadataClient, SERIES as IPEA_SERIES
from ..data_sources.ibge import IBGEClient
from ..data_sources.insideairbnb import InsideAirbnbClient
from ..data_sources.b3 import B3Client
from ..data_sources.abecip import ABECIPClient, BCB_CREDIT_SERIES
from ..data_sources.cub import CUBClient
from ..data_sources.secovi import SecoviClient
from ..data_sources.itbi_downloader import ITBIDownloader, insert_transactions

logger = logging.getLogger(__name__)


class DataLoader:
    """Orchestrates loading real data from all sources into SQLite."""

    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = db_path or DB_PATH
        self.bcb = BCBClient()
        self.ipeadata = IpeadataClient()
        self.ibge = IBGEClient()
        self.airbnb = InsideAirbnbClient(
            data_dir=self.db_path.parent / "airbnb"
        )
        self.b3 = B3Client()
        self.abecip = ABECIPClient()
        self.cub = CUBClient()
        self.secovi = SecoviClient()
        self.itbi_downloader = ITBIDownloader(
            data_dir=self.db_path.parent / "itbi"
        )

    async def _get_db(self) -> aiosqlite.Connection:
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        db = await aiosqlite.connect(self.db_path)
        db.row_factory = aiosqlite.Row
        return db

    async def _log_status(self, source: str, status: str,
                          records: int = 0, error: str = None):
        """Log data load status to the tracking table."""
        db = await self._get_db()
        try:
            if status == "running":
                await db.execute(
                    "INSERT INTO data_load_status (source, status) VALUES (?, ?)",
                    (source, status),
                )
            else:
                await db.execute(
                    """UPDATE data_load_status
                    SET status = ?, records_loaded = ?, error_message = ?,
                        completed_at = datetime('now')
                    WHERE id = (SELECT MAX(id) FROM data_load_status WHERE source = ?)""",
                    (status, records, error, source),
                )
            await db.commit()
        except Exception as e:
            logger.debug(f"Status log failed: {e}")
        finally:
            await db.close()

    # ------------------------------------------------------------------
    # BCB Economic Indicators
    # ------------------------------------------------------------------

    async def load_bcb_indicators(self) -> int:
        """Load all BCB economic series into indicadores_economicos table.

        Fetches Selic, IPCA, IGP-M, INCC, CDI, TR, poupança, financing rates
        from the last 5 years.
        """
        await self._log_status("bcb", "running")
        total = 0
        inicio = date.today() - timedelta(days=5 * 365)

        db = await self._get_db()
        try:
            for nome, codigo in BCB_SERIES.items():
                try:
                    df = self.bcb.get_serie(codigo, data_inicio=inicio)
                    if df.empty:
                        continue

                    for _, row in df.iterrows():
                        await db.execute(
                            """INSERT OR REPLACE INTO indicadores_economicos
                            (fonte, serie, data, valor) VALUES (?, ?, ?, ?)""",
                            ("bcb", nome, str(row["data"].date()), float(row["valor"])),
                        )
                        total += 1

                    logger.info(f"BCB {nome}: {len(df)} records loaded")
                except Exception as e:
                    logger.warning(f"BCB {nome} failed: {e}")

            await db.commit()
            await self._log_status("bcb", "completed", total)
            logger.info(f"BCB total: {total} indicator records loaded")
        except Exception as e:
            await self._log_status("bcb", "failed", error=str(e))
            raise
        finally:
            await db.close()

        return total

    # ------------------------------------------------------------------
    # Ipeadata
    # ------------------------------------------------------------------

    async def load_ipeadata(self) -> int:
        """Load Ipeadata economic series (INCC, IGP-M, IPCA, PIB, income)."""
        await self._log_status("ipeadata", "running")
        total = 0

        db = await self._get_db()
        try:
            for nome, serie_id in IPEA_SERIES.items():
                try:
                    df = self.ipeadata.get_serie(serie_id)
                    if df.empty:
                        continue
                    # Keep last 5 years
                    cutoff = pd.Timestamp.now(tz="UTC") - pd.Timedelta(days=5 * 365)
                    df = df[df["data"] >= cutoff]

                    for _, row in df.iterrows():
                        await db.execute(
                            """INSERT OR REPLACE INTO indicadores_economicos
                            (fonte, serie, data, valor) VALUES (?, ?, ?, ?)""",
                            ("ipeadata", nome, str(row["data"].date()), float(row["valor"])),
                        )
                        total += 1

                    logger.info(f"Ipeadata {nome}: {len(df)} records loaded")
                except Exception as e:
                    logger.warning(f"Ipeadata {nome} failed: {e}")

            await db.commit()
            await self._log_status("ipeadata", "completed", total)
            logger.info(f"Ipeadata total: {total} records loaded")
        except Exception as e:
            await self._log_status("ipeadata", "failed", error=str(e))
            raise
        finally:
            await db.close()

        return total

    # ------------------------------------------------------------------
    # B3 / IFIX
    # ------------------------------------------------------------------

    async def load_b3_ifix(self) -> int:
        """Load IFIX (real estate fund index) historical data."""
        await self._log_status("b3", "running")
        total = 0

        db = await self._get_db()
        try:
            df = self.b3.get_ifix_historico()
            if not df.empty:
                for _, row in df.iterrows():
                    if pd.notna(row["valor"]):
                        await db.execute(
                            """INSERT OR REPLACE INTO indicadores_economicos
                            (fonte, serie, data, valor) VALUES (?, ?, ?, ?)""",
                            ("b3", "ifix", str(row["data"].date()), float(row["valor"])),
                        )
                        total += 1

            # Also store NTN-B rate
            ntnb = self.b3.get_tesouro_ntnb()
            if ntnb is not None:
                await db.execute(
                    """INSERT OR REPLACE INTO indicadores_economicos
                    (fonte, serie, data, valor) VALUES (?, ?, ?, ?)""",
                    ("b3", "ntnb", str(date.today()), ntnb),
                )
                total += 1

            await db.commit()
            await self._log_status("b3", "completed", total)
            logger.info(f"B3 IFIX: {total} records loaded")
        except Exception as e:
            await self._log_status("b3", "failed", error=str(e))
            logger.warning(f"B3 load failed: {e}")
        finally:
            await db.close()

        return total

    # ------------------------------------------------------------------
    # ABECIP Credit Data
    # ------------------------------------------------------------------

    async def load_abecip(self) -> int:
        """Load real estate credit indicators from ABECIP/BCB."""
        await self._log_status("abecip", "running")
        total = 0

        db = await self._get_db()
        try:
            series_map = {
                "taxa_media_imobiliario": self.abecip.get_taxa_media,
                "inadimplencia_imobiliario": self.abecip.get_inadimplencia,
                "volume_financiamento": self.abecip.get_volume_financiamento,
                "saldo_credito": self.abecip.get_saldo_credito,
            }

            for nome, fetch_fn in series_map.items():
                try:
                    df = fetch_fn(meses=24)
                    if df.empty:
                        continue
                    for _, row in df.iterrows():
                        await db.execute(
                            """INSERT OR REPLACE INTO indicadores_economicos
                            (fonte, serie, data, valor) VALUES (?, ?, ?, ?)""",
                            ("abecip", nome, str(row["data"].date()), float(row["valor"])),
                        )
                        total += 1
                    logger.info(f"ABECIP {nome}: {len(df)} records loaded")
                except Exception as e:
                    logger.warning(f"ABECIP {nome} failed: {e}")

            await db.commit()
            await self._log_status("abecip", "completed", total)
            logger.info(f"ABECIP total: {total} records loaded")
        except Exception as e:
            await self._log_status("abecip", "failed", error=str(e))
            raise
        finally:
            await db.close()

        return total

    # ------------------------------------------------------------------
    # CUB / INCC
    # ------------------------------------------------------------------

    async def load_cub(self) -> int:
        """Load CUB/m² construction cost data."""
        await self._log_status("cub", "running")
        total = 0

        db = await self._get_db()
        try:
            # Load INCC monthly from BCB
            df_incc = self.cub.get_incc_mensal(meses=60)
            if not df_incc.empty:
                for _, row in df_incc.iterrows():
                    await db.execute(
                        """INSERT OR REPLACE INTO indicadores_economicos
                        (fonte, serie, data, valor) VALUES (?, ?, ?, ?)""",
                        ("cub", "incc_mensal", str(row["data"].date()), float(row["valor"])),
                    )
                    total += 1

            # Load CUB R-8N values for available states
            for uf in ["SP", "RJ", "MG", "PR"]:
                df_cub = self.cub.get_cub_estado(uf)
                if not df_cub.empty:
                    for _, row in df_cub.iterrows():
                        await db.execute(
                            """INSERT OR REPLACE INTO indicadores_economicos
                            (fonte, serie, data, valor) VALUES (?, ?, ?, ?)""",
                            ("cub", f"cub_r8n_{uf.lower()}", str(row["data"].date()), row["cub_m2"]),
                        )
                        total += 1

            await db.commit()
            await self._log_status("cub", "completed", total)
            logger.info(f"CUB/INCC: {total} records loaded")
        except Exception as e:
            await self._log_status("cub", "failed", error=str(e))
            raise
        finally:
            await db.close()

        return total

    # ------------------------------------------------------------------
    # SECOVI
    # ------------------------------------------------------------------

    async def load_secovi(self) -> int:
        """Load SECOVI market indicators (VSO, rental prices)."""
        await self._log_status("secovi", "running")
        total = 0

        db = await self._get_db()
        try:
            # VSO (Vendas Sobre Oferta)
            df_vso = self.secovi.get_vso()
            if not df_vso.empty:
                for _, row in df_vso.iterrows():
                    await db.execute(
                        """INSERT OR REPLACE INTO indicadores_economicos
                        (fonte, serie, data, valor) VALUES (?, ?, ?, ?)""",
                        ("secovi", "vso", str(row["data"].date()), row["vso_pct"]),
                    )
                    total += 1

            # Rental prices
            df_loc = self.secovi.get_locacao_residencial()
            if not df_loc.empty:
                for _, row in df_loc.iterrows():
                    await db.execute(
                        """INSERT OR REPLACE INTO indicadores_economicos
                        (fonte, serie, data, valor) VALUES (?, ?, ?, ?)""",
                        ("secovi", "locacao_m2_sp", str(row["data"].date()), row["preco_m2_locacao"]),
                    )
                    total += 1

            await db.commit()
            await self._log_status("secovi", "completed", total)
            logger.info(f"SECOVI: {total} records loaded")
        except Exception as e:
            await self._log_status("secovi", "failed", error=str(e))
            raise
        finally:
            await db.close()

        return total

    # ------------------------------------------------------------------
    # FipeZAP (from Excel files if available)
    # ------------------------------------------------------------------

    async def load_fipezap(self, venda_path: Optional[str] = None,
                           locacao_path: Optional[str] = None) -> int:
        """Load FipeZAP price data from Excel files or database cache.

        If Excel paths are provided, parse and store. Otherwise, check
        if data/fipezap/ directory has any Excel files.

        Args:
            venda_path: Path to FipeZAP sale prices Excel.
            locacao_path: Path to FipeZAP rental prices Excel.

        Returns:
            Number of records loaded.
        """
        from ..data_sources.fipezap import FipeZAPParser

        await self._log_status("fipezap", "running")
        total = 0
        parser = FipeZAPParser()

        db = await self._get_db()
        try:
            fipezap_dir = self.db_path.parent / "fipezap"
            fipezap_dir.mkdir(parents=True, exist_ok=True)

            files_to_parse = []

            if venda_path:
                files_to_parse.append(("venda", Path(venda_path)))
            if locacao_path:
                files_to_parse.append(("locacao", Path(locacao_path)))

            # Auto-discover Excel files in data/fipezap/
            if not files_to_parse:
                for f in fipezap_dir.glob("*.xlsx"):
                    fname = f.name.lower()
                    if "venda" in fname or "sale" in fname:
                        files_to_parse.append(("venda", f))
                    elif "locacao" in fname or "aluguel" in fname or "rent" in fname:
                        files_to_parse.append(("locacao", f))
                    else:
                        files_to_parse.append(("venda", f))

            for tipo, filepath in files_to_parse:
                try:
                    df = parser.parse_indice(filepath)
                    for _, row in df.iterrows():
                        if pd.notna(row["preco_m2"]):
                            await db.execute(
                                """INSERT OR REPLACE INTO fipezap_precos
                                (tipo, cidade, data, preco_m2) VALUES (?, ?, ?, ?)""",
                                (tipo, row["cidade"], str(row["data"].date()), float(row["preco_m2"])),
                            )
                            total += 1
                    logger.info(f"FipeZAP {tipo} from {filepath.name}: {len(df)} records")
                except Exception as e:
                    logger.warning(f"FipeZAP parse {filepath} failed: {e}")

            await db.commit()
            await self._log_status("fipezap", "completed", total)
            logger.info(f"FipeZAP total: {total} records loaded")
        except Exception as e:
            await self._log_status("fipezap", "failed", error=str(e))
            raise
        finally:
            await db.close()

        return total

    # ------------------------------------------------------------------
    # Inside Airbnb
    # ------------------------------------------------------------------

    async def load_airbnb(self, cidade: str = "sao-paulo",
                          snapshot: Optional[str] = None) -> int:
        """Download and load Airbnb listing data.

        Args:
            cidade: City slug ('sao-paulo' or 'rio-de-janeiro').
            snapshot: Snapshot date string (e.g., '2024-09-27').
                     If None, tries recent dates.

        Returns:
            Number of listings loaded.
        """
        await self._log_status("airbnb", "running")
        total = 0

        # Try recent snapshots if none specified
        snapshots_to_try = [snapshot] if snapshot else [
            "2025-09-27", "2025-06-27", "2025-03-27",
            "2024-12-27", "2024-09-27", "2024-06-22",
        ]

        filepath = None
        for snap in snapshots_to_try:
            if snap is None:
                continue
            try:
                filepath = self.airbnb.download_listings(cidade, snap)
                logger.info(f"Airbnb {cidade} snapshot {snap} downloaded")
                break
            except Exception as e:
                logger.debug(f"Airbnb {cidade} snapshot {snap} failed: {e}")

        if filepath is None:
            # Check for existing files
            airbnb_dir = self.db_path.parent / "airbnb"
            existing = list(airbnb_dir.glob(f"{cidade}*listings*.csv*"))
            if existing:
                filepath = existing[0]
            else:
                await self._log_status("airbnb", "failed", error="No snapshot available")
                return 0

        db = await self._get_db()
        try:
            df = self.airbnb.parse_listings(filepath)
            cidade_name = "São Paulo" if "sao-paulo" in str(filepath) else "Rio de Janeiro"

            for _, row in df.iterrows():
                try:
                    await db.execute(
                        """INSERT OR REPLACE INTO airbnb_listings
                        (id, cidade, bairro, latitude, longitude, tipo_quarto,
                         preco_noite, minimo_noites, qtd_reviews, reviews_por_mes,
                         disponibilidade_365, snapshot_data)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                        (
                            int(row["id"]),
                            cidade_name,
                            row.get("neighbourhood_cleansed"),
                            row.get("latitude"),
                            row.get("longitude"),
                            row.get("room_type"),
                            row.get("price"),
                            row.get("minimum_nights"),
                            row.get("number_of_reviews"),
                            row.get("reviews_per_month"),
                            row.get("availability_365"),
                            str(filepath.name),
                        ),
                    )
                    total += 1
                except Exception:
                    pass

            await db.commit()
            await self._log_status("airbnb", "completed", total)
            logger.info(f"Airbnb {cidade}: {total} listings loaded")
        except Exception as e:
            await self._log_status("airbnb", "failed", error=str(e))
            raise
        finally:
            await db.close()

        return total

    # ------------------------------------------------------------------
    # ITBI Transactions
    # ------------------------------------------------------------------

    async def load_itbi(self, years: Optional[list[int]] = None) -> int:
        """Download and load ITBI transaction data from Prefeitura SP.

        Args:
            years: Specific years to load. Default: [2019-2025].

        Returns:
            Number of transactions inserted.
        """
        await self._log_status("itbi", "running")

        if years is None:
            years = list(range(2019, 2026))

        try:
            # Download files
            downloaded = self.itbi_downloader.download_all(years=years)
            if not downloaded:
                await self._log_status("itbi", "failed", error="No files downloaded")
                return 0

            # Parse all downloaded files
            df = self.itbi_downloader.parse_all_raw_files()
            if df.empty:
                await self._log_status("itbi", "failed", error="No data parsed")
                return 0

            # Convert to DB records and insert
            records = self.itbi_downloader.to_db_records(df)
            total = await insert_transactions(records)

            await self._log_status("itbi", "completed", total)
            logger.info(f"ITBI: {total} transactions loaded from {len(downloaded)} files")
            return total

        except Exception as e:
            await self._log_status("itbi", "failed", error=str(e))
            logger.error(f"ITBI load failed: {e}")
            return 0

    # ------------------------------------------------------------------
    # Full Load
    # ------------------------------------------------------------------

    async def load_all(self, include_itbi: bool = False,
                       itbi_years: Optional[list[int]] = None) -> dict:
        """Load data from all sources.

        Economic indicators are loaded first (fast, API-based).
        ITBI is optional and slow (large file downloads).

        Args:
            include_itbi: Whether to download/parse ITBI files.
            itbi_years: Specific years for ITBI.

        Returns:
            Dict with counts per source.
        """
        await init_db(self.db_path)
        results = {}

        # Fast API-based loads (run concurrently)
        tasks = {
            "bcb": self.load_bcb_indicators(),
            "ipeadata": self.load_ipeadata(),
            "b3": self.load_b3_ifix(),
            "abecip": self.load_abecip(),
            "cub": self.load_cub(),
            "secovi": self.load_secovi(),
        }

        for name, coro in tasks.items():
            try:
                results[name] = await coro
            except Exception as e:
                results[name] = 0
                logger.warning(f"{name} load failed: {e}")

        # FipeZAP (if Excel files exist)
        try:
            results["fipezap"] = await self.load_fipezap()
        except Exception as e:
            results["fipezap"] = 0
            logger.warning(f"FipeZAP load failed: {e}")

        # ITBI (slow, optional)
        if include_itbi:
            try:
                results["itbi"] = await self.load_itbi(years=itbi_years)
            except Exception as e:
                results["itbi"] = 0
                logger.warning(f"ITBI load failed: {e}")

        total = sum(results.values())
        logger.info(f"Data load complete. Total records: {total:,}")
        logger.info(f"  Results: {results}")
        return results

    async def get_load_status(self) -> list[dict]:
        """Get status of all data loads."""
        db = await self._get_db()
        try:
            cursor = await db.execute(
                """SELECT source, status, records_loaded, error_message,
                          started_at, completed_at
                FROM data_load_status
                ORDER BY started_at DESC"""
            )
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]
        finally:
            await db.close()

    async def get_data_summary(self) -> dict:
        """Get a summary of loaded data across all tables."""
        db = await self._get_db()
        try:
            summary = {}

            # ITBI transactions
            cursor = await db.execute("SELECT COUNT(*) as c FROM transacoes_itbi")
            row = await cursor.fetchone()
            summary["itbi_transactions"] = row["c"]

            # Economic indicators by source
            cursor = await db.execute(
                "SELECT fonte, serie, COUNT(*) as c, MIN(data) as min_d, MAX(data) as max_d "
                "FROM indicadores_economicos GROUP BY fonte, serie ORDER BY fonte, serie"
            )
            rows = await cursor.fetchall()
            summary["indicators"] = [dict(r) for r in rows]

            # FipeZAP
            cursor = await db.execute(
                "SELECT tipo, COUNT(DISTINCT cidade) as cidades, COUNT(*) as c "
                "FROM fipezap_precos GROUP BY tipo"
            )
            rows = await cursor.fetchall()
            summary["fipezap"] = [dict(r) for r in rows]

            # Airbnb
            cursor = await db.execute(
                "SELECT cidade, COUNT(*) as c FROM airbnb_listings GROUP BY cidade"
            )
            rows = await cursor.fetchall()
            summary["airbnb"] = [dict(r) for r in rows]

            return summary
        finally:
            await db.close()


# CLI entry point
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Load real market data from all sources")
    parser.add_argument("--all", action="store_true", help="Load all sources")
    parser.add_argument("--bcb", action="store_true", help="Load BCB indicators")
    parser.add_argument("--ipeadata", action="store_true", help="Load Ipeadata")
    parser.add_argument("--b3", action="store_true", help="Load B3 IFIX")
    parser.add_argument("--abecip", action="store_true", help="Load ABECIP credit data")
    parser.add_argument("--cub", action="store_true", help="Load CUB/INCC data")
    parser.add_argument("--secovi", action="store_true", help="Load SECOVI data")
    parser.add_argument("--fipezap", action="store_true", help="Load FipeZAP (needs Excel files)")
    parser.add_argument("--airbnb", action="store_true", help="Load Airbnb data")
    parser.add_argument("--itbi", action="store_true", help="Load ITBI transactions")
    parser.add_argument("--itbi-years", nargs="+", type=int, help="ITBI years")
    parser.add_argument("--status", action="store_true", help="Show data load status")
    parser.add_argument("--summary", action="store_true", help="Show data summary")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    loader = DataLoader()

    async def run():
        await init_db()

        if args.status:
            status = await loader.get_load_status()
            for s in status:
                print(f"  {s['source']}: {s['status']} ({s['records_loaded']} records)")
            return

        if args.summary:
            summary = await loader.get_data_summary()
            print(f"ITBI transactions: {summary['itbi_transactions']:,}")
            print(f"Indicators: {len(summary['indicators'])} series")
            for ind in summary["indicators"]:
                print(f"  {ind['fonte']}/{ind['serie']}: {ind['c']} records ({ind['min_d']} to {ind['max_d']})")
            return

        if args.all:
            results = await loader.load_all(include_itbi=args.itbi, itbi_years=args.itbi_years)
            print(f"Results: {results}")
            return

        if args.bcb:
            print(f"BCB: {await loader.load_bcb_indicators()} records")
        if args.ipeadata:
            print(f"Ipeadata: {await loader.load_ipeadata()} records")
        if args.b3:
            print(f"B3: {await loader.load_b3_ifix()} records")
        if args.abecip:
            print(f"ABECIP: {await loader.load_abecip()} records")
        if args.cub:
            print(f"CUB: {await loader.load_cub()} records")
        if args.secovi:
            print(f"SECOVI: {await loader.load_secovi()} records")
        if args.fipezap:
            print(f"FipeZAP: {await loader.load_fipezap()} records")
        if args.airbnb:
            print(f"Airbnb: {await loader.load_airbnb()} records")
        if args.itbi:
            print(f"ITBI: {await loader.load_itbi(years=args.itbi_years)} records")

    asyncio.run(run())
