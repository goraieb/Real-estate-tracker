"""Tests for FipeZAPParser."""

import pandas as pd
import pytest

from src.data_sources.fipezap import FipeZAPParser


@pytest.fixture
def parser():
    return FipeZAPParser()


@pytest.fixture
def sample_df():
    """A pre-built DataFrame matching parsed FipeZAP output."""
    dates = pd.date_range("2023-01-01", periods=12, freq="ME")
    sp_prices = [10000 + i * 100 for i in range(12)]
    rj_prices = [8000 + i * 80 for i in range(12)]
    return pd.DataFrame({
        "data": list(dates) + list(dates),
        "cidade": ["São Paulo"] * 12 + ["Rio de Janeiro"] * 12,
        "preco_m2": sp_prices + rj_prices,
    })


class TestGetPrecoM2:
    def test_sp_returns_numeric(self, parser, sample_df):
        price = parser.get_preco_m2(sample_df, "São Paulo")
        assert float(price) > 0

    def test_latest_by_default(self, parser, sample_df):
        price = parser.get_preco_m2(sample_df, "São Paulo")
        # Last month's price: 10000 + 11 * 100 = 11100
        assert price == 11100

    def test_specific_date(self, parser, sample_df):
        target_date = pd.Timestamp("2023-06-30")
        price = parser.get_preco_m2(sample_df, "São Paulo", target_date)
        assert float(price) > 0

    def test_unknown_city(self, parser, sample_df):
        result = parser.get_preco_m2(sample_df, "Curitiba")
        assert result is None

    def test_rj(self, parser, sample_df):
        price = parser.get_preco_m2(sample_df, "Rio de Janeiro")
        assert price == 8000 + 11 * 80  # 8880


class TestCalcularVariacao:
    def test_positive_variation(self, parser, sample_df):
        result = parser.calcular_variacao(
            sample_df, "São Paulo",
            pd.Timestamp("2023-01-31"),
            pd.Timestamp("2023-12-31"),
        )
        assert result is not None
        assert result > 0

    def test_negative_variation(self, parser):
        """Falling prices → negative %."""
        dates = pd.date_range("2023-01-01", periods=6, freq="ME")
        df = pd.DataFrame({
            "data": dates,
            "cidade": ["São Paulo"] * 6,
            "preco_m2": [10000, 9800, 9600, 9400, 9200, 9000],
        })
        result = parser.calcular_variacao(
            df, "São Paulo",
            pd.Timestamp("2023-01-31"),
            pd.Timestamp("2023-06-30"),
        )
        assert result is not None
        assert result < 0

    def test_unknown_city(self, parser, sample_df):
        result = parser.calcular_variacao(
            sample_df, "Manaus",
            pd.Timestamp("2023-01-31"),
            pd.Timestamp("2023-12-31"),
        )
        assert result is None


class TestCidadesDisponiveis:
    def test_returns_list(self, sample_df):
        cities = FipeZAPParser.cidades_disponiveis(sample_df)
        assert isinstance(cities, list)
        assert "São Paulo" in cities
        assert "Rio de Janeiro" in cities
        assert len(cities) == 2


class TestParseIndice:
    def test_file_not_found(self, parser):
        with pytest.raises(FileNotFoundError):
            parser.parse_indice("/nonexistent/file.xlsx")

    def test_parse_venda_delegates(self, parser, tmp_path):
        """parse_venda calls parse_indice."""
        # Create a minimal Excel file
        df = pd.DataFrame({
            "Data": pd.date_range("2023-01-01", periods=3, freq="ME"),
            "São Paulo": [10000, 10100, 10200],
        })
        filepath = tmp_path / "fipezap_venda.xlsx"
        df.to_excel(filepath, index=False, engine="openpyxl")

        result = parser.parse_venda(filepath)
        assert "data" in result.columns
        assert "cidade" in result.columns
        assert "preco_m2" in result.columns
        assert len(result) == 3

    def test_parse_locacao_delegates(self, parser, tmp_path):
        df = pd.DataFrame({
            "Data": pd.date_range("2023-01-01", periods=3, freq="ME"),
            "Rio de Janeiro": [40, 42, 44],
        })
        filepath = tmp_path / "fipezap_locacao.xlsx"
        df.to_excel(filepath, index=False, engine="openpyxl")

        result = parser.parse_locacao(filepath)
        assert len(result) == 3
        assert "Rio de Janeiro" in result["cidade"].values
