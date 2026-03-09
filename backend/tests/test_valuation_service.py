"""Tests for ValuationService."""

from datetime import date
from unittest.mock import MagicMock

import pandas as pd
import pytest

from src.services.valuation import ValuationService


@pytest.fixture
def service(mock_bcb_client):
    svc = ValuationService()
    svc.bcb = mock_bcb_client
    return svc


class TestCalcularValorAtualizado:
    def test_basic_positive(self, service, sample_fipezap_df):
        result = service.calcular_valor_atualizado(
            valor_compra=500_000,
            data_compra=date(2023, 1, 15),
            cidade="São Paulo",
            df_fipezap=sample_fipezap_df,
            data_referencia=date(2024, 6, 15),
        )
        assert result["valor_atualizado"] is not None
        assert result["variacao_pct"] > 0
        assert result["ganho_nominal"] > 0
        assert result["metodo"] == "FipeZAP"

    def test_desvalorizacao(self, service):
        """Falling prices → value decreases."""
        dates = pd.date_range("2023-01-01", periods=12, freq="ME")
        df = pd.DataFrame({
            "data": dates,
            "cidade": ["São Paulo"] * 12,
            "preco_m2": [10000 - i * 200 for i in range(12)],
        })
        result = service.calcular_valor_atualizado(
            500_000, date(2023, 1, 15), "São Paulo", df, date(2023, 12, 15)
        )
        if result["variacao_pct"] is not None:
            assert result["variacao_pct"] < 0

    def test_cidade_invalida(self, service, sample_fipezap_df):
        result = service.calcular_valor_atualizado(
            500_000, date(2023, 1, 15), "Manaus", sample_fipezap_df
        )
        assert result["valor_atualizado"] is None
        assert "erro" in result

    def test_mesmo_periodo(self, service, sample_fipezap_df):
        result = service.calcular_valor_atualizado(
            500_000, date(2023, 6, 15), "São Paulo", sample_fipezap_df, date(2023, 6, 15)
        )
        # Same date → ~0% variation
        if result["variacao_pct"] is not None:
            assert abs(result["variacao_pct"]) < 1.0


class TestCalcularValorPorM2:
    def test_sp(self, service, sample_fipezap_df):
        result = service.calcular_valor_por_m2(65.0, "São Paulo", sample_fipezap_df)
        assert result["valor_estimado"] is not None
        assert result["preco_m2"] > 0
        assert result["area_m2"] == 65.0

    def test_rj(self, service, sample_fipezap_df):
        result = service.calcular_valor_por_m2(80.0, "Rio de Janeiro", sample_fipezap_df)
        assert result["valor_estimado"] is not None
        assert result["preco_m2"] > 0

    def test_cidade_invalida(self, service, sample_fipezap_df):
        result = service.calcular_valor_por_m2(65.0, "Curitiba", sample_fipezap_df)
        assert result["valor_estimado"] is None
        assert "erro" in result

    def test_area_zero(self, service, sample_fipezap_df):
        result = service.calcular_valor_por_m2(0, "São Paulo", sample_fipezap_df)
        # preco_m2 * 0 = 0
        assert result["valor_estimado"] == 0


class TestCalcularGanhoReal:
    def test_positive(self, service):
        """Nominal gain > IPCA → positive real gain."""
        ipca_df = pd.DataFrame({
            "data": pd.date_range("2023-01-01", periods=12, freq="ME"),
            "valor": [0.5] * 12,  # ~6.17% accumulated
        })
        service.bcb.get_ipca.return_value = ipca_df

        result = service.calcular_ganho_real(
            500_000, 600_000, date(2023, 1, 1), date(2024, 1, 1)
        )
        assert result["ganho_nominal_pct"] == 20.0
        assert result["ganho_real_pct"] is not None
        assert result["ganho_real_pct"] > 0  # 20% gain > ~6% IPCA

    def test_negative(self, service):
        """Nominal gain < IPCA → negative real gain."""
        ipca_df = pd.DataFrame({
            "data": pd.date_range("2023-01-01", periods=12, freq="ME"),
            "valor": [1.5] * 12,  # ~19.6% accumulated
        })
        service.bcb.get_ipca.return_value = ipca_df

        result = service.calcular_ganho_real(
            500_000, 550_000, date(2023, 1, 1), date(2024, 1, 1)
        )
        assert result["ganho_nominal_pct"] == 10.0
        assert result["ganho_real_pct"] is not None
        assert result["ganho_real_pct"] < 0  # 10% gain < ~19.6% IPCA

    def test_bcb_fail(self, service):
        """BCB fails → returns nominal only."""
        service.bcb.get_ipca.return_value = pd.DataFrame(columns=["data", "valor"])

        result = service.calcular_ganho_real(
            500_000, 600_000, date(2023, 1, 1), date(2024, 1, 1)
        )
        assert result["ganho_nominal_pct"] == 20.0
        assert result["ganho_real_pct"] is None
        assert "erro" in result

    def test_same_date(self, service):
        """Same buy/current date → 0% gain."""
        ipca_df = pd.DataFrame(columns=["data", "valor"])
        service.bcb.get_ipca.return_value = ipca_df

        result = service.calcular_ganho_real(
            500_000, 500_000, date(2024, 1, 1), date(2024, 1, 1)
        )
        assert result["ganho_nominal_pct"] == 0.0
