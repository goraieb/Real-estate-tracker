"""Testes para os módulos de data sources e serviços de cálculo.

Testes unitários que não dependem de APIs externas (usando dados mock).
"""

import pandas as pd
import pytest

from src.services.yield_calc import YieldService


class TestYieldService:
    """Testes para cálculos de yield."""

    def test_yield_bruto(self):
        result = YieldService.yield_bruto(500_000, 30_000)
        assert result == 6.0

    def test_yield_bruto_zero_valor(self):
        result = YieldService.yield_bruto(0, 30_000)
        assert result == 0

    def test_yield_bruto_mensal(self):
        result = YieldService.yield_bruto_mensal(500_000, 2_500)
        assert result == 6.0

    def test_yield_liquido_basico(self):
        resultado = YieldService.yield_liquido(
            valor_imovel=500_000,
            aluguel_mensal=2_500,
            iptu_anual=2_400,
            condominio_mensal=600,
        )
        assert resultado["yield_bruto"] == 6.0
        assert resultado["yield_liquido"] < resultado["yield_bruto"]
        assert "breakdown" in resultado

    def test_yield_liquido_com_vacancia(self):
        sem_vacancia = YieldService.yield_liquido(
            valor_imovel=500_000,
            aluguel_mensal=2_500,
            vacancia_pct=0,
        )
        com_vacancia = YieldService.yield_liquido(
            valor_imovel=500_000,
            aluguel_mensal=2_500,
            vacancia_pct=10,
        )
        assert com_vacancia["yield_liquido"] < sem_vacancia["yield_liquido"]

    def test_yield_airbnb(self):
        resultado = YieldService.yield_airbnb(
            valor_imovel=500_000,
            diaria_media=300,
            taxa_ocupacao_pct=60,
            custos_fixos_mensal=1_000,
        )
        assert resultado["yield_bruto"] > 0
        assert resultado["yield_liquido"] > 0
        assert resultado["noites_ocupadas_ano"] == 219  # 365 * 0.6
        assert "breakdown" in resultado

    def test_comparar_longterm_vs_airbnb(self):
        lt = {"yield_liquido": 4.5}
        airbnb = {"yield_liquido": 7.2}
        comp = YieldService.comparar_longterm_vs_airbnb(lt, airbnb)
        assert comp["diferenca_pp"] == 2.7
        assert comp["recomendacao"] == "Airbnb"

    def test_payback(self):
        result = YieldService.calcular_payback(500_000, 25_000)
        assert result == 20.0

    def test_payback_receita_zero(self):
        result = YieldService.calcular_payback(500_000, 0)
        assert result is None

    def test_ir_aluguel_isento(self):
        # Aluguel abaixo da faixa de isenção
        ir = YieldService._calcular_ir_aluguel(2_000)
        assert ir == 0

    def test_ir_aluguel_tributado(self):
        # Aluguel acima da isenção
        ir = YieldService._calcular_ir_aluguel(5_000)
        assert ir > 0


class TestPropertyModel:
    """Testes para o modelo de dados."""

    def test_custos_recorrentes(self):
        from src.models.property import CustosRecorrentes

        custos = CustosRecorrentes(
            iptu_anual=3_600,
            condominio_mensal=800,
            seguro_anual=600,
        )
        assert custos.custo_mensal_total == 800 + 3_600 / 12 + 600 / 12

    def test_dados_renda_longterm(self):
        from src.models.property import DadosRenda, TipoRenda

        renda = DadosRenda(
            tipo=TipoRenda.ALUGUEL_LONGTERM,
            aluguel_mensal=3_000,
            taxa_vacancia_pct=5,
        )
        # 3000 * (1 - 0.05) = 2850
        assert renda.receita_bruta_mensal == 2_850

    def test_dados_renda_airbnb(self):
        from src.models.property import DadosRenda, TipoRenda

        renda = DadosRenda(
            tipo=TipoRenda.AIRBNB,
            diaria_media=300,
            taxa_ocupacao_pct=60,
            custos_plataforma_pct=3,
        )
        # 300 * (30 * 0.6) * (1 - 0.03) = 300 * 18 * 0.97 = 5238
        assert round(renda.receita_bruta_mensal, 0) == 5238

    def test_dados_compra_custo_total(self):
        from src.models.property import DadosCompra
        from datetime import date

        compra = DadosCompra(
            valor_compra=500_000,
            data_compra=date(2023, 1, 1),
            itbi_pago=15_000,
            custos_cartorio=5_000,
            comissao_corretor=30_000,
        )
        assert compra.custo_total_aquisicao == 550_000
