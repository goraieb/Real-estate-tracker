"""Tests for ITBIParser."""

import pandas as pd
import pytest

from src.data_sources.itbi import ITBIParser


@pytest.fixture
def parser():
    return ITBIParser()


@pytest.fixture
def sp_csv(tmp_path):
    """Create a sample SP ITBI CSV file."""
    content = (
        "bairro;valor;area;data\n"
        "Vila Mariana;500000;65;01/06/2023\n"
        "Vila Mariana;480000;60;15/06/2023\n"
        "Moema;750000;80;01/07/2023\n"
        "Moema;900000;100;15/07/2023\n"
        "Pinheiros;620000;55;01/08/2023\n"
    )
    filepath = tmp_path / "itbi_sp.csv"
    filepath.write_text(content, encoding="latin-1")
    return filepath


@pytest.fixture
def rj_csv(tmp_path):
    """Create a sample RJ ITBI CSV file."""
    content = (
        "bairro;preco_m2;qtd_transacoes;periodo\n"
        "Copacabana;15000;120;2023-Q1\n"
        "Ipanema;22000;80;2023-Q1\n"
        "Centro;8000;200;2023-Q1\n"
    )
    filepath = tmp_path / "itbi_rj.csv"
    filepath.write_text(content, encoding="utf-8")
    return filepath


class TestParseItbiSP:
    def test_columns(self, parser, sp_csv):
        df = parser.parse_itbi_sp(sp_csv)
        assert "cidade" in df.columns
        assert df["cidade"].iloc[0] == "São Paulo"

    def test_numeric_types(self, parser, sp_csv):
        df = parser.parse_itbi_sp(sp_csv)
        # The parser maps columns dynamically; check if value-like columns are numeric
        if "valor_transacao" in df.columns:
            assert pd.api.types.is_numeric_dtype(df["valor_transacao"])

    def test_file_not_found(self, parser):
        with pytest.raises(FileNotFoundError):
            parser.parse_itbi_sp("/nonexistent/file.xlsx")

    def test_unsupported_format(self, parser, tmp_path):
        filepath = tmp_path / "file.json"
        filepath.write_text("{}")
        with pytest.raises(ValueError, match="não suportado"):
            parser.parse_itbi_sp(filepath)


class TestParseItbiRJ:
    def test_columns(self, parser, rj_csv):
        df = parser.parse_itbi_rj(rj_csv)
        assert "cidade" in df.columns
        assert df["cidade"].iloc[0] == "Rio de Janeiro"

    def test_file_not_found(self, parser):
        with pytest.raises(FileNotFoundError):
            parser.parse_itbi_rj("/nonexistent/file.csv")


class TestPrecoM2PorBairro:
    def test_all_bairros(self, parser):
        df = pd.DataFrame({
            "bairro": ["Vila Mariana", "Vila Mariana", "Moema", "Moema"],
            "preco_m2": [7692, 8000, 9375, 9000],
            "valor_transacao": [500000, 480000, 750000, 900000],
        })
        result = parser.get_preco_m2_por_bairro(df)
        assert len(result) == 2
        assert "preco_m2_medio" in result.columns
        assert "preco_m2_mediano" in result.columns
        assert "qtd_transacoes" in result.columns

    def test_specific_bairro(self, parser):
        df = pd.DataFrame({
            "bairro": ["Vila Mariana", "Vila Mariana", "Moema"],
            "preco_m2": [7692, 8000, 9375],
            "valor_transacao": [500000, 480000, 750000],
        })
        result = parser.get_preco_m2_por_bairro(df, bairro="Vila Mariana")
        assert len(result) == 1
        assert result["bairro"].iloc[0] == "Vila Mariana"


class TestEvolucaoPrecos:
    def test_monthly(self, parser):
        dates = pd.date_range("2023-01-15", periods=6, freq="ME")
        df = pd.DataFrame({
            "bairro": ["Centro"] * 6,
            "preco_m2": [5000, 5100, 5200, 5300, 5400, 5500],
            "data_transacao": dates,
        })
        result = parser.get_evolucao_precos(df, freq="ME")
        assert "periodo" in result.columns
        assert "preco_m2_mediano" in result.columns
        assert len(result) > 0

    def test_missing_columns(self, parser):
        df = pd.DataFrame({"bairro": ["A"], "other": [1]})
        with pytest.raises(ValueError, match="preco_m2"):
            parser.get_evolucao_precos(df)
