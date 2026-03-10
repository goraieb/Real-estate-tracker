"""Download and parse SP ITBI transaction data from Prefeitura de São Paulo.

Data source: Secretaria Municipal da Fazenda - Dados Abertos
https://prefeitura.sp.gov.br/web/fazenda/w/acesso_a_informacao/31501

The Prefeitura publishes annual XLSX files with all ITBI transactions.
Data is available from 2019 onwards, totaling ~1M+ transactions.

Usage:
    # Download all available years (2019-2025):
    python -m src.data_sources.itbi_downloader --download-all

    # Download a specific file by URL:
    python -m src.data_sources.itbi_downloader --download <URL>

    # Parse and insert into database:
    python -m src.data_sources.itbi_downloader --parse --insert

    # Full pipeline (download + parse + insert):
    python -m src.data_sources.itbi_downloader --download-all --parse --insert
"""

import argparse
import logging
import time
from pathlib import Path
from typing import Optional

import pandas as pd
import requests

from .itbi import ITBIParser

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent.parent.parent / "data" / "itbi"
RAW_DIR = DATA_DIR / "raw"

# Prefeitura SP publishes annual XLSX files at this portal.
# The exact download URLs change when new data is published; these are the
# known patterns. If a URL returns 404, the script logs instructions for
# manual download from the portal page below.
SP_ITBI_PORTAL = "https://prefeitura.sp.gov.br/web/fazenda/w/acesso_a_informacao/31501"
SP_ITBI_BASE_URL = "https://www.prefeitura.sp.gov.br/cidade/secretarias/fazenda"

# Known ITBI data files by year.  Each entry maps a year to a list of
# candidate URLs (the Prefeitura occasionally changes the URL scheme).
SP_ITBI_FILES: dict[int, list[str]] = {
    2019: [
        f"{SP_ITBI_BASE_URL}/acesso_a_informacao/dados_abertos/itbi_2019.xlsx",
        f"{SP_ITBI_BASE_URL}/acesso_a_informacao/dados_abertos/ITBI_2019.xlsx",
    ],
    2020: [
        f"{SP_ITBI_BASE_URL}/acesso_a_informacao/dados_abertos/itbi_2020.xlsx",
        f"{SP_ITBI_BASE_URL}/acesso_a_informacao/dados_abertos/ITBI_2020.xlsx",
    ],
    2021: [
        f"{SP_ITBI_BASE_URL}/acesso_a_informacao/dados_abertos/itbi_2021.xlsx",
        f"{SP_ITBI_BASE_URL}/acesso_a_informacao/dados_abertos/ITBI_2021.xlsx",
    ],
    2022: [
        f"{SP_ITBI_BASE_URL}/acesso_a_informacao/dados_abertos/itbi_2022.xlsx",
        f"{SP_ITBI_BASE_URL}/acesso_a_informacao/dados_abertos/ITBI_2022.xlsx",
    ],
    2023: [
        f"{SP_ITBI_BASE_URL}/acesso_a_informacao/dados_abertos/itbi_2023.xlsx",
        f"{SP_ITBI_BASE_URL}/acesso_a_informacao/dados_abertos/ITBI_2023.xlsx",
    ],
    2024: [
        f"{SP_ITBI_BASE_URL}/acesso_a_informacao/dados_abertos/itbi_2024.xlsx",
        f"{SP_ITBI_BASE_URL}/acesso_a_informacao/dados_abertos/ITBI_2024.xlsx",
    ],
    2025: [
        f"{SP_ITBI_BASE_URL}/acesso_a_informacao/dados_abertos/itbi_2025.xlsx",
        f"{SP_ITBI_BASE_URL}/acesso_a_informacao/dados_abertos/ITBI_2025.xlsx",
    ],
}

ALL_YEARS = sorted(SP_ITBI_FILES.keys())


class ITBIDownloader:
    """Downloads and processes ITBI transaction data for São Paulo."""

    def __init__(self, data_dir: Path = DATA_DIR):
        self.data_dir = data_dir
        self.raw_dir = data_dir / "raw"
        self.raw_dir.mkdir(parents=True, exist_ok=True)
        self.parser = ITBIParser()

    def download_sp(self, url: str, filename: Optional[str] = None) -> Path:
        """Download SP ITBI file from a given URL.

        Args:
            url: Direct URL to the XLSX/CSV file.
            filename: Optional filename override.

        Returns:
            Path to the downloaded file.
        """
        if filename is None:
            filename = url.split("/")[-1]
        filepath = self.raw_dir / filename

        if filepath.exists():
            logger.info(f"File already exists: {filepath}")
            return filepath

        logger.info(f"Downloading {url}...")
        resp = requests.get(url, timeout=120)
        resp.raise_for_status()

        filepath.write_bytes(resp.content)
        logger.info(f"Saved to {filepath} ({len(resp.content)} bytes)")
        return filepath

    def download_all(self, years: Optional[list[int]] = None) -> list[Path]:
        """Download ITBI files for all available years (2019-2025).

        For each year, tries candidate URLs in order. If all URLs fail,
        logs a manual download instruction pointing to the Prefeitura portal.

        Args:
            years: Specific years to download. Defaults to ALL_YEARS.

        Returns:
            List of paths to successfully downloaded files.
        """
        target_years = years or ALL_YEARS
        downloaded: list[Path] = []
        failed_years: list[int] = []

        for year in target_years:
            candidates = SP_ITBI_FILES.get(year, [])
            if not candidates:
                logger.warning(f"No known URLs for year {year}")
                failed_years.append(year)
                continue

            # Check if we already have a file for this year
            existing = list(self.raw_dir.glob(f"*{year}*"))
            if existing:
                logger.info(f"Already have file for {year}: {existing[0].name}")
                downloaded.append(existing[0])
                continue

            success = False
            for url in candidates:
                try:
                    path = self.download_sp(url, filename=f"itbi_{year}.xlsx")
                    downloaded.append(path)
                    success = True
                    logger.info(f"✓ Downloaded {year}: {path.name}")
                    break
                except requests.HTTPError as e:
                    logger.debug(f"URL failed for {year}: {url} ({e})")
                except requests.ConnectionError:
                    logger.warning(f"Connection error downloading {year}")
                    time.sleep(2)

            if not success:
                failed_years.append(year)

        if failed_years:
            logger.warning(
                f"\nCould not auto-download files for years: {failed_years}\n"
                f"Please download manually from:\n  {SP_ITBI_PORTAL}\n"
                f"Save XLSX files to: {self.raw_dir}/\n"
                f"Expected filenames: itbi_YYYY.xlsx (e.g. itbi_2023.xlsx)"
            )

        logger.info(
            f"Download complete: {len(downloaded)} files downloaded, "
            f"{len(failed_years)} failed"
        )
        return downloaded

    def parse_sp_file(self, filepath: Path) -> pd.DataFrame:
        """Parse a downloaded SP ITBI file into a normalized DataFrame.

        Args:
            filepath: Path to the XLSX or CSV file.

        Returns:
            Normalized DataFrame with transaction data.
        """
        logger.info(f"Parsing {filepath}...")
        df = self.parser.parse_itbi_sp(filepath)

        # Ensure required columns exist
        required = ["valor_transacao", "data_transacao"]
        missing = [c for c in required if c not in df.columns]
        if missing:
            raise ValueError(f"Missing required columns: {missing}")

        # Clean data
        df = df.dropna(subset=["valor_transacao"])
        df = df[df["valor_transacao"] > 0]

        # Filter outlier prices per m² if available
        if "preco_m2" in df.columns:
            mask = df["preco_m2"].isna() | (
                (df["preco_m2"] >= 500) & (df["preco_m2"] <= 150_000)
            )
            df = df[mask]

        logger.info(f"Parsed {len(df)} valid transactions from {filepath.name}")
        return df

    def parse_all_raw_files(self) -> pd.DataFrame:
        """Parse all raw files in the data directory.

        Returns:
            Combined DataFrame of all transactions.
        """
        all_dfs = []
        for filepath in sorted(self.raw_dir.glob("*.xlsx")) + sorted(
            self.raw_dir.glob("*.csv")
        ):
            try:
                df = self.parse_sp_file(filepath)
                all_dfs.append(df)
            except Exception as e:
                logger.warning(f"Failed to parse {filepath}: {e}")

        if not all_dfs:
            logger.warning("No files found to parse")
            return pd.DataFrame()

        combined = pd.concat(all_dfs, ignore_index=True)

        # Deduplicate by SQL + data_transacao if both exist
        if "sql" in combined.columns and "data_transacao" in combined.columns:
            before = len(combined)
            combined = combined.drop_duplicates(
                subset=["sql", "data_transacao"], keep="last"
            )
            logger.info(f"Deduplicated: {before} → {len(combined)} transactions")

        return combined

    def to_db_records(self, df: pd.DataFrame) -> list[dict]:
        """Convert DataFrame to list of dicts matching transacoes_itbi schema.

        Args:
            df: Parsed ITBI DataFrame.

        Returns:
            List of dicts ready for DB insertion.
        """
        records = []
        for _, row in df.iterrows():
            record = {
                "cidade": row.get("cidade", "São Paulo"),
                "bairro": row.get("bairro"),
                "logradouro": row.get("endereco") or row.get("logradouro"),
                "numero": row.get("numero"),
                "sql_cadastral": row.get("sql"),
                "tipo_imovel": row.get("tipo_imovel"),
                "area_construida": row.get("area_construida"),
                "area_terreno": row.get("area_terreno"),
                "valor_transacao": row["valor_transacao"],
                "preco_m2": row.get("preco_m2"),
                "data_transacao": (
                    str(row["data_transacao"].date())
                    if hasattr(row["data_transacao"], "date")
                    else str(row["data_transacao"])
                ),
                "fonte": "prefeitura_sp",
            }
            # Clean None/NaN values
            for k, v in record.items():
                if pd.isna(v) if isinstance(v, float) else v is None:
                    record[k] = None
            records.append(record)
        return records


def _assign_bairro_center_coords(rec: dict) -> dict:
    """Assign approximate lat/lng from bairro center + random offset.

    This enables immediate map display without waiting for Nominatim geocoding.
    Records are marked as geocoded=1 so the API can serve them right away.
    """
    from ..services.geo_boundaries import get_bairro_center

    bairro = rec.get("bairro")
    if not bairro:
        return rec

    center = get_bairro_center(bairro)
    if not center:
        return rec

    # Deterministic offset based on record content to spread points within bairro
    import hashlib

    seed_str = f"{bairro}:{rec.get('logradouro', '')}:{rec.get('valor_transacao', '')}:{rec.get('data_transacao', '')}"
    h = int(hashlib.md5(seed_str.encode()).hexdigest()[:8], 16)
    lat_offset = ((h % 1000) / 1000 - 0.5) * 0.02
    lng_offset = (((h >> 12) % 1000) / 1000 - 0.5) * 0.02

    rec["latitude"] = center[0] + lat_offset
    rec["longitude"] = center[1] + lng_offset
    rec["geocoded"] = 1
    return rec


async def insert_transactions(records: list[dict]) -> int:
    """Insert transaction records into the database.

    Automatically assigns approximate coordinates from bairro centers
    so records are immediately visible on the map.

    Args:
        records: List of transaction dicts.

    Returns:
        Number of records inserted.
    """
    import aiosqlite

    from ..database.db import DB_PATH

    DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    async with aiosqlite.connect(DB_PATH) as db:
        inserted = 0
        for rec in records:
            # Assign bairro-center coordinates for immediate map display
            rec = _assign_bairro_center_coords(rec)

            try:
                await db.execute(
                    """INSERT OR IGNORE INTO transacoes_itbi
                    (cidade, bairro, logradouro, numero, sql_cadastral,
                     tipo_imovel, area_construida, area_terreno,
                     valor_transacao, preco_m2, data_transacao, fonte,
                     latitude, longitude, geocoded)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        rec["cidade"],
                        rec.get("bairro"),
                        rec.get("logradouro"),
                        rec.get("numero"),
                        rec.get("sql_cadastral"),
                        rec.get("tipo_imovel"),
                        rec.get("area_construida"),
                        rec.get("area_terreno"),
                        rec["valor_transacao"],
                        rec.get("preco_m2"),
                        rec["data_transacao"],
                        rec.get("fonte", "prefeitura_sp"),
                        rec.get("latitude"),
                        rec.get("longitude"),
                        rec.get("geocoded", 0),
                    ),
                )
                inserted += 1
            except Exception as e:
                logger.warning(f"Failed to insert record: {e}")
        await db.commit()
        logger.info(f"Inserted {inserted} / {len(records)} records")
        return inserted


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(
        description="ITBI Data Downloader (São Paulo) — 2019-2025, ~1M+ transactions",
        epilog=(
            f"Data source: {SP_ITBI_PORTAL}\n\n"
            "Examples:\n"
            "  Download all years:  --download-all\n"
            "  Specific years:      --download-all --years 2023 2024 2025\n"
            "  Full pipeline:       --download-all --parse --insert\n"
            "  Manual file:         --download <URL>"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--download",
        type=str,
        help="URL to download a single ITBI file from",
    )
    parser.add_argument(
        "--download-all",
        action="store_true",
        help="Download ITBI files for all available years (2019-2025)",
    )
    parser.add_argument(
        "--years",
        nargs="+",
        type=int,
        help="Specific years to download (used with --download-all). Default: all years.",
    )
    parser.add_argument(
        "--parse",
        action="store_true",
        help="Parse all raw files in data/itbi/raw/",
    )
    parser.add_argument(
        "--insert",
        action="store_true",
        help="Insert parsed data into the database",
    )
    parser.add_argument(
        "--stats",
        action="store_true",
        help="Show statistics about downloaded/parsed data",
    )
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    downloader = ITBIDownloader()

    if args.download:
        downloader.download_sp(args.download)

    if args.download_all:
        downloader.download_all(years=args.years)

    if args.parse or args.insert or args.stats:
        df = downloader.parse_all_raw_files()
        if not df.empty:
            logger.info(f"Total transactions parsed: {len(df):,}")
            if "data_transacao" in df.columns:
                min_date = df["data_transacao"].min()
                max_date = df["data_transacao"].max()
                logger.info(f"Date range: {min_date} to {max_date}")
            if "bairro" in df.columns:
                n_bairros = df["bairro"].nunique()
                logger.info(f"Neighborhoods: {n_bairros}")
            if args.stats:
                logger.info("\nTop 10 neighborhoods by transaction count:")
                if "bairro" in df.columns:
                    top = df["bairro"].value_counts().head(10)
                    for bairro, count in top.items():
                        logger.info(f"  {bairro}: {count:,}")
                logger.info(f"\nTransactions by year:")
                if "data_transacao" in df.columns:
                    by_year = df.groupby(df["data_transacao"].dt.year).size()
                    for year, count in by_year.items():
                        logger.info(f"  {year}: {count:,}")
            if args.insert:
                import asyncio

                records = downloader.to_db_records(df)
                asyncio.run(insert_transactions(records))
        else:
            logger.warning(
                "No data to process.\n"
                f"Run with --download-all to fetch files, or place XLSX files in:\n"
                f"  {downloader.raw_dir}/"
            )


if __name__ == "__main__":
    main()
