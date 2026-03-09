"""Download and parse SP ITBI transaction data from Prefeitura de São Paulo.

Data source: Secretaria Municipal da Fazenda - Dados Abertos
https://prefeitura.sp.gov.br/web/fazenda/w/acesso_a_informacao/31501

Usage:
    python -m src.data_sources.itbi_downloader --download --parse
"""

import argparse
import logging
from pathlib import Path
from typing import Optional

import pandas as pd
import requests

from .itbi import ITBIParser

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent.parent.parent / "data" / "itbi"
RAW_DIR = DATA_DIR / "raw"

# Known SP ITBI data URLs (Prefeitura SP publishes monthly XLSX files)
# These are example URLs - the actual URLs change as new data is published
SP_ITBI_BASE_URL = "https://www.prefeitura.sp.gov.br/cidade/secretarias/fazenda"


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


async def insert_transactions(records: list[dict]) -> int:
    """Insert transaction records into the database.

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
            try:
                await db.execute(
                    """INSERT OR IGNORE INTO transacoes_itbi
                    (cidade, bairro, logradouro, numero, sql_cadastral,
                     tipo_imovel, area_construida, area_terreno,
                     valor_transacao, preco_m2, data_transacao, fonte)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
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
    parser = argparse.ArgumentParser(description="ITBI Data Downloader (São Paulo)")
    parser.add_argument(
        "--download",
        type=str,
        help="URL to download ITBI file from",
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
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO)
    downloader = ITBIDownloader()

    if args.download:
        downloader.download_sp(args.download)

    if args.parse or args.insert:
        df = downloader.parse_all_raw_files()
        if not df.empty:
            logger.info(f"Total transactions: {len(df)}")
            if args.insert:
                import asyncio

                records = downloader.to_db_records(df)
                asyncio.run(insert_transactions(records))
        else:
            logger.warning("No data to process. Place ITBI files in data/itbi/raw/")


if __name__ == "__main__":
    main()
