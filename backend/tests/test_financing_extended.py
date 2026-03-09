"""Extended tests for FinancingService — additional coverage beyond test_financing.py."""

import pytest

from src.services.financing import FinancingService

svc = FinancingService()


class TestSACExtended:
    def test_amortizacao_constante(self):
        result = svc.tabela_sac(300_000, 10.0, 360)
        amortizations = [r["amortizacao"] for r in result["tabela"]]
        assert all(abs(a - amortizations[0]) < 0.01 for a in amortizations)

    def test_juros_decrescente(self):
        result = svc.tabela_sac(300_000, 10.0, 360)
        juros = [r["juros"] for r in result["tabela"]]
        for i in range(1, len(juros)):
            assert juros[i] <= juros[i - 1] + 0.01

    def test_saldo_devedor_monotone(self):
        result = svc.tabela_sac(300_000, 10.0, 360)
        saldos = [r["saldo_devedor"] for r in result["tabela"]]
        for i in range(1, len(saldos)):
            assert saldos[i] <= saldos[i - 1] + 0.01

    def test_resumo_fields(self):
        result = svc.tabela_sac(300_000, 10.0, 360)
        resumo = result["resumo"]
        assert "sistema" in resumo
        assert resumo["sistema"] == "SAC"
        assert "primeira_parcela" in resumo
        assert "ultima_parcela" in resumo
        assert "total_pago" in resumo
        assert "total_juros" in resumo

    def test_total_juros_formula(self):
        result = svc.tabela_sac(300_000, 10.0, 360)
        total_juros_tabela = sum(r["juros"] for r in result["tabela"])
        assert abs(result["resumo"]["total_juros"] - total_juros_tabela) < 1.0

    def test_short_term_12_meses(self):
        result = svc.tabela_sac(120_000, 10.0, 12)
        assert len(result["tabela"]) == 12
        assert result["tabela"][-1]["saldo_devedor"] < 1.0

    def test_high_interest_30pct(self):
        result = svc.tabela_sac(100_000, 30.0, 120)
        assert len(result["tabela"]) == 120
        assert result["resumo"]["total_juros"] > 0


class TestPRICEExtended:
    def test_amortizacao_crescente(self):
        result = svc.tabela_price(300_000, 10.0, 360)
        amortizations = [r["amortizacao"] for r in result["tabela"]]
        for i in range(1, len(amortizations)):
            assert amortizations[i] >= amortizations[i - 1] - 0.01

    def test_juros_decrescente(self):
        result = svc.tabela_price(300_000, 10.0, 360)
        juros = [r["juros"] for r in result["tabela"]]
        for i in range(1, len(juros)):
            assert juros[i] <= juros[i - 1] + 0.01

    def test_prestacao_constante(self):
        result = svc.tabela_price(300_000, 10.0, 360)
        prestacoes = [r["prestacao"] for r in result["tabela"]]
        for p in prestacoes:
            assert abs(p - prestacoes[0]) < 0.02

    def test_saldo_final_zero(self):
        result = svc.tabela_price(300_000, 10.0, 360)
        assert result["tabela"][-1]["saldo_devedor"] < 1.0

    def test_short_term_12_meses(self):
        result = svc.tabela_price(120_000, 10.0, 12)
        assert len(result["tabela"]) == 12
        assert result["tabela"][-1]["saldo_devedor"] < 1.0

    def test_high_interest_30pct(self):
        result = svc.tabela_price(100_000, 30.0, 120)
        assert len(result["tabela"]) == 120
        assert result["resumo"]["total_juros"] > 0


class TestCompararExtended:
    def test_economia_formula(self):
        result = svc.comparar_sac_price(300_000, 10.0, 360)
        expected = result["price"]["total_pago"] - result["sac"]["total_pago"]
        assert abs(result["economia_sac"] - expected) < 0.01

    def test_recomendacao_sac(self):
        """SAC always has lower total cost → always recommended."""
        result = svc.comparar_sac_price(300_000, 10.0, 360)
        assert result["recomendacao"] == "SAC"


class TestAvistaVsFinanciadoExtended:
    def test_patrimonio_imovel_only(self):
        result = svc.avista_vs_financiado(500_000, 100_000, 10.0, 360, 13.0)
        for p in result["projecao"]:
            assert p["avista_patrimonio"] == 500_000

    def test_financiado_patrimonio_initial(self):
        """At early stage, financed buyer has property + investments - debt."""
        result = svc.avista_vs_financiado(500_000, 100_000, 10.0, 360, 13.0)
        assert len(result["projecao"]) > 0
        # First projection point should have both components
        first = result["projecao"][0]
        assert "financiado_patrimonio" in first

    def test_long_term_with_high_yield(self):
        """With high investment return, financed strategy wins at some point."""
        result = svc.avista_vs_financiado(500_000, 100_000, 10.0, 360, 20.0)
        # With 20% return vs 10% financing, eventually financed wins
        later_projections = [p for p in result["projecao"] if p["meses"] >= 120]
        if later_projections:
            assert any(p["melhor"] == "Financiado" for p in later_projections)
