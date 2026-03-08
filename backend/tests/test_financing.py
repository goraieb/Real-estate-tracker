"""Tests for financing service."""

import pytest
from src.services.financing import FinancingService

svc = FinancingService()


def test_tabela_sac_basic():
    result = svc.tabela_sac(300_000, 10.0, 360)
    assert len(result["tabela"]) == 360
    assert result["resumo"]["sistema"] == "SAC"
    # First payment > last payment in SAC
    assert result["tabela"][0]["prestacao"] > result["tabela"][-1]["prestacao"]
    # Amortization is constant
    amort_first = result["tabela"][0]["amortizacao"]
    amort_last = result["tabela"][-1]["amortizacao"]
    assert abs(amort_first - amort_last) < 0.01
    # Saldo devedor final is ~0
    assert result["tabela"][-1]["saldo_devedor"] < 1.0


def test_tabela_price_basic():
    result = svc.tabela_price(300_000, 10.0, 360)
    assert len(result["tabela"]) == 360
    assert result["resumo"]["sistema"] == "PRICE"
    # All payments are equal in PRICE
    first = result["tabela"][0]["prestacao"]
    last = result["tabela"][-1]["prestacao"]
    assert abs(first - last) < 0.01
    # Saldo devedor final is ~0
    assert result["tabela"][-1]["saldo_devedor"] < 1.0


def test_sac_pays_less_total_than_price():
    sac = svc.tabela_sac(300_000, 10.0, 360)
    price = svc.tabela_price(300_000, 10.0, 360)
    assert sac["resumo"]["total_pago"] < price["resumo"]["total_pago"]


def test_comparar_sac_price():
    result = svc.comparar_sac_price(300_000, 10.0, 360)
    assert result["economia_sac"] > 0
    assert result["recomendacao"] == "SAC"


def test_zero_values():
    result = svc.tabela_sac(0, 10.0, 360)
    assert result["tabela"] == []

    result = svc.tabela_price(100_000, 10.0, 0)
    assert result["tabela"] == []


def test_avista_vs_financiado():
    result = svc.avista_vs_financiado(
        valor_imovel=500_000,
        valor_entrada=100_000,
        taxa_juros_anual=10.0,
        prazo_meses=360,
        taxa_rendimento_anual=13.0,
    )
    assert result["valor_financiado"] == 400_000
    assert len(result["projecao"]) > 0
    # Each projection has required fields
    for p in result["projecao"]:
        assert "meses" in p
        assert "avista_patrimonio" in p
        assert "financiado_patrimonio" in p
        assert "melhor" in p
