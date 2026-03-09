"""Serviço de avaliação (valuation) de imóveis.

Calcula o valor atualizado de um imóvel usando variação do FipeZAP
e opcionalmente valida com dados reais de transações ITBI.
"""

from datetime import date
from typing import Optional

import pandas as pd

from ..data_sources.bcb import BCBClient
from ..data_sources.fipezap import FipeZAPParser


class ValuationService:
    """Calcula valor atualizado e valorização de imóveis."""

    def __init__(self):
        self.bcb = BCBClient()
        self.fipezap = FipeZAPParser()

    def calcular_valor_atualizado(
        self,
        valor_compra: float,
        data_compra: date,
        cidade: str,
        df_fipezap: pd.DataFrame,
        data_referencia: Optional[date] = None,
    ) -> dict:
        """Calcula o valor atualizado de um imóvel usando variação FipeZAP.

        Args:
            valor_compra: Valor pago na compra em R$.
            data_compra: Data da compra.
            cidade: Nome da cidade (como aparece no FipeZAP).
            df_fipezap: DataFrame parseado do FipeZAP (via FipeZAPParser.parse_venda).
            data_referencia: Data para avaliação. Se None, usa a mais recente.

        Returns:
            Dict com valor_atualizado, variacao_pct e detalhes.
        """
        ts_compra = pd.Timestamp(data_compra)
        ts_ref = pd.Timestamp(data_referencia) if data_referencia else None

        variacao = self.fipezap.calcular_variacao(
            df_fipezap, cidade, ts_compra, ts_ref
        )

        if variacao is None:
            return {
                "valor_atualizado": None,
                "variacao_pct": None,
                "metodo": "FipeZAP",
                "erro": f"Dados insuficientes para {cidade}",
            }

        valor_atualizado = valor_compra * (1 + variacao / 100)

        return {
            "valor_atualizado": round(valor_atualizado, 2),
            "variacao_pct": round(variacao, 2),
            "ganho_nominal": round(valor_atualizado - valor_compra, 2),
            "metodo": "FipeZAP",
            "cidade": cidade,
            "data_compra": str(data_compra),
            "data_referencia": str(data_referencia or "mais recente"),
        }

    def calcular_valor_por_m2(
        self,
        area_m2: float,
        cidade: str,
        df_fipezap: pd.DataFrame,
        data: Optional[date] = None,
    ) -> dict:
        """Estima valor de mercado baseado no preço/m² FipeZAP da cidade.

        Args:
            area_m2: Área útil do imóvel em m².
            cidade: Nome da cidade.
            df_fipezap: DataFrame parseado do FipeZAP.
            data: Data de referência. Se None, usa a mais recente.

        Returns:
            Dict com valor_estimado e preco_m2.
        """
        ts_data = pd.Timestamp(data) if data else None
        preco_m2 = self.fipezap.get_preco_m2(df_fipezap, cidade, ts_data)

        if preco_m2 is None:
            return {
                "valor_estimado": None,
                "preco_m2": None,
                "erro": f"Preço/m² não disponível para {cidade}",
            }

        return {
            "valor_estimado": round(preco_m2 * area_m2, 2),
            "preco_m2": round(preco_m2, 2),
            "area_m2": area_m2,
            "cidade": cidade,
            "metodo": "FipeZAP preço/m² × área",
        }

    def calcular_ganho_real(
        self,
        valor_compra: float,
        valor_atual: float,
        data_compra: date,
        data_atual: Optional[date] = None,
    ) -> dict:
        """Calcula ganho real (descontando inflação IPCA).

        Args:
            valor_compra: Valor na compra.
            valor_atual: Valor atual estimado.
            data_compra: Data da compra.
            data_atual: Data atual. Se None, usa hoje.

        Returns:
            Dict com ganho_nominal, ganho_real e ipca_acumulado.
        """
        data_atual = data_atual or date.today()

        # Busca IPCA do período
        df_ipca = self.bcb.get_ipca(data_inicio=data_compra, data_fim=data_atual)

        if df_ipca.empty:
            return {
                "ganho_nominal_pct": round(
                    ((valor_atual / valor_compra) - 1) * 100, 2
                ),
                "ganho_real_pct": None,
                "ipca_acumulado_pct": None,
                "erro": "IPCA não disponível para o período",
            }

        # IPCA acumulado no período
        ipca_acumulado = (1 + df_ipca["valor"] / 100).prod() - 1

        ganho_nominal = (valor_atual / valor_compra) - 1
        ganho_real = ((1 + ganho_nominal) / (1 + ipca_acumulado)) - 1

        return {
            "ganho_nominal_pct": round(ganho_nominal * 100, 2),
            "ganho_real_pct": round(ganho_real * 100, 2),
            "ipca_acumulado_pct": round(ipca_acumulado * 100, 2),
            "valor_compra_corrigido": round(valor_compra * (1 + ipca_acumulado), 2),
        }
