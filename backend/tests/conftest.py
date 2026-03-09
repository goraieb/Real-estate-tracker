"""Shared test fixtures for the Real Estate Tracker backend."""

import pytest
import pytest_asyncio
import aiosqlite
from pathlib import Path
from unittest.mock import MagicMock
import pandas as pd

SCHEMA_PATH = Path(__file__).parent.parent / "src" / "database" / "schema.sql"


@pytest_asyncio.fixture
async def db():
    """In-memory SQLite database with schema."""
    conn = await aiosqlite.connect(":memory:")
    conn.row_factory = aiosqlite.Row
    schema = SCHEMA_PATH.read_text()
    await conn.executescript(schema)
    yield conn
    await conn.close()


@pytest.fixture
def sample_imovel_data():
    """Minimal valid property data for CRUD tests."""
    return {
        "nome": "Apto Vila Mariana",
        "tipo": "apartamento",
        "bairro": "Vila Mariana",
        "cidade": "São Paulo",
        "uf": "SP",
        "area_util": 65.0,
        "quartos": 2,
        "vagas": 1,
        "valor_compra": 450000.0,
        "data_compra": "2023-06-15",
        "aluguel_mensal": 2500.0,
        "iptu_anual": 2400.0,
        "condominio_mensal": 800.0,
    }


@pytest.fixture
def mock_bcb_client():
    """Mocked BCBClient returning realistic data."""
    client = MagicMock()

    selic_df = pd.DataFrame({
        "data": pd.date_range("2024-01-01", periods=252, freq="B"),
        "valor": [13.75] * 252,
    })
    ipca_df = pd.DataFrame({
        "data": pd.date_range("2023-01-01", periods=12, freq="ME"),
        "valor": [0.53, 0.84, 0.71, 0.61, 0.23, -0.08, 0.12, 0.23, 0.26, 0.24, 0.28, 0.56],
    })
    igpm_df = pd.DataFrame({
        "data": pd.date_range("2023-01-01", periods=12, freq="ME"),
        "valor": [0.21, 0.06, 0.05, -0.95, -1.84, -1.93, -0.72, -0.14, 0.37, 0.50, 0.59, 0.74],
    })
    fin_df = pd.DataFrame({
        "data": pd.date_range("2024-01-01", periods=12, freq="ME"),
        "valor": [9.45] * 12,
    })

    client.get_selic.return_value = selic_df
    client.get_ipca.return_value = ipca_df
    client.get_igpm.return_value = igpm_df
    client.get_taxa_financiamento.return_value = fin_df
    client.calcular_acumulado.return_value = 4.62
    client.get_serie_by_name.return_value = selic_df

    return client


@pytest.fixture
def sample_fipezap_df():
    """Sample FipeZAP DataFrame for testing."""
    dates = pd.date_range("2023-01-01", periods=24, freq="ME")
    sp_prices = [10500 + i * 50 for i in range(24)]
    rj_prices = [9500 + i * 40 for i in range(24)]

    return pd.DataFrame({
        "data": list(dates) + list(dates),
        "cidade": ["São Paulo"] * 24 + ["Rio de Janeiro"] * 24,
        "preco_m2": sp_prices + rj_prices,
    })
