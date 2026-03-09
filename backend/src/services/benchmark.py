"""Serviço de benchmark: compara rentabilidade do imóvel com outros investimentos.

Compara yield imobiliário contra Selic/CDI, poupança, Tesouro IPCA+, etc.
"""

from datetime import date
from typing import Optional

from ..data_sources.bcb import BCBClient


class BenchmarkService:
    """Compara rentabilidade imobiliária com investimentos financeiros."""

    def __init__(self):
        self.bcb = BCBClient()

    def get_benchmarks_atuais(self) -> dict:
        """Busca as taxas atuais dos principais benchmarks.

        Returns:
            Dict com taxas anuais atuais de Selic, CDI, poupança, IPCA.
        """
        # Selic meta atual (último valor)
        df_selic = self.bcb.get_selic()
        selic_atual = df_selic["valor"].iloc[-1] if not df_selic.empty else None

        # IPCA acumulado 12 meses
        df_ipca = self.bcb.get_ipca()
        ipca_12m = self.bcb.calcular_acumulado(df_ipca, 12) if not df_ipca.empty else None

        # IGP-M acumulado 12 meses
        df_igpm = self.bcb.get_igpm()
        igpm_12m = self.bcb.calcular_acumulado(df_igpm, 12) if not df_igpm.empty else None

        # Taxa de financiamento imobiliário
        df_fin = self.bcb.get_taxa_financiamento()
        tx_financiamento = df_fin["valor"].iloc[-1] if not df_fin.empty else None

        # Poupança: 70% da Selic quando Selic <= 8.5%, senão 0.5%/mês + TR
        poupanca_anual = None
        if selic_atual:
            # Selic no BCB é diária, precisamos anualizar
            # Simplificação: usamos a Selic meta anual
            selic_anual = selic_atual  # Já é anual na série SGS
            if selic_anual <= 8.5:
                poupanca_anual = selic_anual * 0.7
            else:
                poupanca_anual = 6.17  # 0.5%/mês + TR ≈ 6.17% a.a.

        return {
            "selic_anual": selic_atual,
            "ipca_12m": round(ipca_12m, 2) if ipca_12m else None,
            "igpm_12m": round(igpm_12m, 2) if igpm_12m else None,
            "poupanca_anual": round(poupanca_anual, 2) if poupanca_anual else None,
            "financiamento_tx": tx_financiamento,
        }

    def comparar_com_renda_fixa(
        self,
        yield_imovel: float,
        selic_anual: Optional[float] = None,
        ipca_12m: Optional[float] = None,
    ) -> dict:
        """Compara yield do imóvel com investimentos de renda fixa.

        Args:
            yield_imovel: Yield líquido do imóvel em % a.a.
            selic_anual: Taxa Selic anual. Se None, busca automaticamente.
            ipca_12m: IPCA acumulado 12m. Se None, busca automaticamente.

        Returns:
            Dict com spreads vs cada benchmark.
        """
        if selic_anual is None or ipca_12m is None:
            benchmarks = self.get_benchmarks_atuais()
            selic_anual = selic_anual or benchmarks.get("selic_anual", 0)
            ipca_12m = ipca_12m or benchmarks.get("ipca_12m", 0)

        # CDI ≈ Selic
        cdi_anual = selic_anual

        # CDB 100% CDI líquido (IR 15% para > 2 anos)
        cdb_liquido = cdi_anual * 0.85

        # Tesouro Selic líquido
        tesouro_selic_liquido = selic_anual * 0.85

        # Tesouro IPCA+ (estimativa: IPCA + 6% bruto, líquido ~85%)
        tesouro_ipca_bruto = ipca_12m + 6.0
        tesouro_ipca_liquido = tesouro_ipca_bruto * 0.85

        # Poupança
        if selic_anual <= 8.5:
            poupanca = selic_anual * 0.7
        else:
            poupanca = 6.17

        # Yield real do imóvel
        yield_real = ((1 + yield_imovel / 100) / (1 + ipca_12m / 100) - 1) * 100

        return {
            "imovel_yield": yield_imovel,
            "imovel_yield_real": round(yield_real, 2),
            "comparacoes": {
                "vs_selic": {
                    "taxa": selic_anual,
                    "spread_pp": round(yield_imovel - selic_anual, 2),
                },
                "vs_cdb_100_cdi": {
                    "taxa_liquida": round(cdb_liquido, 2),
                    "spread_pp": round(yield_imovel - cdb_liquido, 2),
                },
                "vs_tesouro_selic": {
                    "taxa_liquida": round(tesouro_selic_liquido, 2),
                    "spread_pp": round(yield_imovel - tesouro_selic_liquido, 2),
                },
                "vs_tesouro_ipca": {
                    "taxa_bruta": round(tesouro_ipca_bruto, 2),
                    "taxa_liquida": round(tesouro_ipca_liquido, 2),
                    "spread_pp": round(yield_imovel - tesouro_ipca_liquido, 2),
                },
                "vs_poupanca": {
                    "taxa": round(poupanca, 2),
                    "spread_pp": round(yield_imovel - poupanca, 2),
                },
            },
            "nota": (
                "O imóvel tem vantagem tributária sobre renda fixa pois "
                "valorização na venda tem isenção parcial (fator redutor)."
            ),
        }

    def custo_oportunidade(
        self,
        valor_imovel: float,
        yield_imovel: float,
        valorizacao_anual_pct: float = 0,
        selic_anual: Optional[float] = None,
    ) -> dict:
        """Calcula custo de oportunidade: o que renderia se vendesse e investisse.

        Args:
            valor_imovel: Valor atual do imóvel.
            yield_imovel: Yield líquido anual em %.
            valorizacao_anual_pct: Valorização anual estimada em %.
            selic_anual: Taxa Selic. Se None, busca automaticamente.

        Returns:
            Dict com retorno total imóvel vs CDI em diferentes horizontes.
        """
        if selic_anual is None:
            benchmarks = self.get_benchmarks_atuais()
            selic_anual = benchmarks.get("selic_anual", 0)

        cdi_liquido = selic_anual * 0.85  # CDB 100% CDI líquido

        retorno_total_imovel = yield_imovel + valorizacao_anual_pct

        projecoes = {}
        for anos in [1, 3, 5, 10]:
            # Imóvel: yield + valorização composta
            valor_futuro_imovel = valor_imovel * (
                (1 + retorno_total_imovel / 100) ** anos
            )
            ganho_imovel = valor_futuro_imovel - valor_imovel

            # CDI: juros compostos
            valor_futuro_cdi = valor_imovel * ((1 + cdi_liquido / 100) ** anos)
            ganho_cdi = valor_futuro_cdi - valor_imovel

            projecoes[f"{anos}_anos"] = {
                "imovel_valor": round(valor_futuro_imovel, 0),
                "imovel_ganho": round(ganho_imovel, 0),
                "cdi_valor": round(valor_futuro_cdi, 0),
                "cdi_ganho": round(ganho_cdi, 0),
                "diferenca": round(ganho_imovel - ganho_cdi, 0),
                "melhor": "Imóvel" if ganho_imovel > ganho_cdi else "CDI",
            }

        return {
            "retorno_total_imovel_aa": round(retorno_total_imovel, 2),
            "cdi_liquido_aa": round(cdi_liquido, 2),
            "projecoes": projecoes,
        }
