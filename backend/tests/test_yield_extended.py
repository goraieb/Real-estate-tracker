"""Extended tests for YieldService — additional coverage beyond test_data_sources.py."""

import pytest

from src.services.yield_calc import YieldService


class TestYieldBrutoExtended:
    def test_typical(self):
        result = YieldService.yield_bruto(500_000, 2_500 * 12)
        assert result == 6.0

    def test_mensal_equivalence(self):
        bruto = YieldService.yield_bruto(500_000, 2_500 * 12)
        mensal = YieldService.yield_bruto_mensal(500_000, 2_500)
        assert bruto == mensal


class TestYieldLiquidoExtended:
    def test_all_costs(self):
        result = YieldService.yield_liquido(
            valor_imovel=500_000,
            aluguel_mensal=3_000,
            iptu_anual=3_600,
            condominio_mensal=800,
            seguro_anual=600,
            manutencao_mensal=200,
            taxa_administracao_pct=8,
            vacancia_pct=5,
        )
        assert result["yield_bruto"] > result["yield_liquido"]
        assert result["custos_totais_anual"] > 0
        assert result["breakdown"]["administracao"] > 0
        assert result["breakdown"]["iptu"] == 3_600

    def test_zero_property_value(self):
        result = YieldService.yield_liquido(valor_imovel=0, aluguel_mensal=2_500)
        assert result["yield_bruto"] == 0
        assert result["yield_liquido"] == 0

    def test_ir_isento_below_2112(self):
        """IR is 0 when monthly net rent < R$2,259.20."""
        result = YieldService.yield_liquido(
            valor_imovel=500_000,
            aluguel_mensal=2_000,
            incluir_ir=True,
        )
        assert result["ir_anual"] == 0

    def test_ir_faixa_15pct(self):
        """IR hits 15% bracket for mid-range rents."""
        ir = YieldService._calcular_ir_aluguel(3_000)
        expected = 3_000 * 0.15 - 381.44
        assert abs(ir - expected) < 0.01

    def test_ir_faixa_275pct(self):
        """IR hits 27.5% bracket for high rents."""
        ir = YieldService._calcular_ir_aluguel(10_000)
        expected = 10_000 * 0.275 - 896.00
        assert abs(ir - expected) < 0.01

    def test_sem_ir(self):
        """incluir_ir=False skips IR deduction."""
        with_ir = YieldService.yield_liquido(
            valor_imovel=500_000, aluguel_mensal=5_000, incluir_ir=True
        )
        without_ir = YieldService.yield_liquido(
            valor_imovel=500_000, aluguel_mensal=5_000, incluir_ir=False
        )
        assert without_ir["yield_liquido"] >= with_ir["yield_liquido"]
        assert without_ir["ir_anual"] == 0


class TestYieldAirbnbExtended:
    def test_high_occupancy(self):
        result = YieldService.yield_airbnb(500_000, 300, 90)
        assert result["yield_bruto"] > 15  # 300 * 365 * 0.9 / 500k ≈ 19.7%

    def test_low_occupancy(self):
        result = YieldService.yield_airbnb(500_000, 300, 20)
        assert result["yield_bruto"] < 5  # 300 * 365 * 0.2 / 500k ≈ 4.4%

    def test_cleaning_costs_impact(self):
        without = YieldService.yield_airbnb(500_000, 300, 70)
        with_cleaning = YieldService.yield_airbnb(
            500_000, 300, 70,
            custos_limpeza_por_estadia=150,
            media_noites_por_estadia=3,
        )
        assert with_cleaning["yield_liquido"] < without["yield_liquido"]


class TestPaybackExtended:
    def test_negative_revenue(self):
        result = YieldService.calcular_payback(500_000, -10_000)
        assert result is None
