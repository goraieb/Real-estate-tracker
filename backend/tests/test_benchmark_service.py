"""Tests for BenchmarkService."""

import pytest
from unittest.mock import patch, MagicMock, PropertyMock

import pandas as pd

from src.services.benchmark import BenchmarkService


@pytest.fixture
def service(mock_bcb_client):
    svc = BenchmarkService()
    svc.bcb = mock_bcb_client
    return svc


class TestGetBenchmarksAtuais:
    def test_ok(self, service):
        result = service.get_benchmarks_atuais()
        assert "selic_anual" in result
        assert "ipca_12m" in result
        assert "igpm_12m" in result
        assert "poupanca_anual" in result
        assert "financiamento_tx" in result

    def test_selic_format(self, service):
        result = service.get_benchmarks_atuais()
        assert result["selic_anual"] == 13.75  # Annual, not daily

    def test_poupanca_formula_selic_alta(self, service):
        """When Selic > 8.5%, poupança = 6.17% (0.5%/mês + TR)."""
        result = service.get_benchmarks_atuais()
        assert result["poupanca_anual"] == 6.17

    def test_poupanca_selic_baixa(self, mock_bcb_client):
        """When Selic ≤ 8.5%, poupança = 70% × Selic."""
        selic_df = pd.DataFrame({
            "data": pd.date_range("2024-01-01", periods=10, freq="B"),
            "valor": [7.0] * 10,
        })
        mock_bcb_client.get_selic.return_value = selic_df

        svc = BenchmarkService()
        svc.bcb = mock_bcb_client
        result = svc.get_benchmarks_atuais()
        assert result["poupanca_anual"] == round(7.0 * 0.7, 2)

    def test_bcb_failure(self):
        """Graceful handling when BCB API fails."""
        svc = BenchmarkService()
        svc.bcb = MagicMock()
        svc.bcb.get_selic.return_value = pd.DataFrame(columns=["data", "valor"])
        svc.bcb.get_ipca.return_value = pd.DataFrame(columns=["data", "valor"])
        svc.bcb.get_igpm.return_value = pd.DataFrame(columns=["data", "valor"])
        svc.bcb.get_taxa_financiamento.return_value = pd.DataFrame(columns=["data", "valor"])

        result = svc.get_benchmarks_atuais()
        assert result["selic_anual"] is None
        assert result["ipca_12m"] is None
        assert result["poupanca_anual"] is None


class TestCompararComRendaFixa:
    def test_yield_acima_selic(self, service):
        result = service.comparar_com_renda_fixa(15.0, selic_anual=13.75, ipca_12m=4.62)
        spread = result["comparacoes"]["vs_selic"]["spread_pp"]
        assert spread > 0

    def test_yield_abaixo_selic(self, service):
        result = service.comparar_com_renda_fixa(5.0, selic_anual=13.75, ipca_12m=4.62)
        spread = result["comparacoes"]["vs_selic"]["spread_pp"]
        assert spread < 0

    def test_spread_calculation(self, service):
        result = service.comparar_com_renda_fixa(8.0, selic_anual=13.75, ipca_12m=4.62)
        assert result["comparacoes"]["vs_selic"]["spread_pp"] == round(8.0 - 13.75, 2)

    def test_cdb_110_pct(self, service):
        result = service.comparar_com_renda_fixa(8.0, selic_anual=13.75, ipca_12m=4.62)
        cdb = result["comparacoes"]["vs_cdb_100_cdi"]
        assert cdb["taxa_liquida"] == round(13.75 * 0.85, 2)

    def test_tesouro_ipca(self, service):
        result = service.comparar_com_renda_fixa(8.0, selic_anual=13.75, ipca_12m=4.62)
        ipca_plus = result["comparacoes"]["vs_tesouro_ipca"]
        assert ipca_plus["taxa_bruta"] == round(4.62 + 6.0, 2)
        assert ipca_plus["taxa_liquida"] == round((4.62 + 6.0) * 0.85, 2)

    def test_yield_real(self, service):
        result = service.comparar_com_renda_fixa(8.0, selic_anual=13.75, ipca_12m=4.62)
        assert "imovel_yield_real" in result


class TestCustoOportunidade:
    def test_basic(self, service):
        result = service.custo_oportunidade(500_000, 6.0, selic_anual=13.75)
        assert "retorno_total_imovel_aa" in result
        assert "cdi_liquido_aa" in result
        assert "projecoes" in result

    def test_com_valorizacao(self, service):
        result = service.custo_oportunidade(500_000, 6.0, valorizacao_anual_pct=5.0, selic_anual=13.75)
        assert result["retorno_total_imovel_aa"] == 11.0  # 6 + 5

    def test_projecao_anos(self, service):
        result = service.custo_oportunidade(500_000, 6.0, selic_anual=13.75)
        projecoes = result["projecoes"]
        assert "1_anos" in projecoes
        assert "3_anos" in projecoes
        assert "5_anos" in projecoes
        assert "10_anos" in projecoes
        for key, proj in projecoes.items():
            assert "imovel_valor" in proj
            assert "cdi_valor" in proj
            assert "melhor" in proj

    def test_valor_zero(self, service):
        result = service.custo_oportunidade(0, 0, selic_anual=13.75)
        for key, proj in result["projecoes"].items():
            assert proj["imovel_valor"] == 0
            assert proj["cdi_valor"] == 0
