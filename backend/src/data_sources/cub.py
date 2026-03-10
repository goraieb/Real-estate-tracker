"""Cliente para dados de CUB/m² (Custo Unitário Básico da Construção).

O CUB é publicado mensalmente pelos Sinduscons estaduais e pela CBIC.
Representa o custo de construção por m² — referência para novos empreendimentos.

Fontes:
- CBIC: https://cbic.org.br/cub/
- Sinduscon-SP: https://sindusconsp.com.br/cub/
- BCB SGS série 192 (INCC-DI) como proxy mensal
"""

import logging
from datetime import date, timedelta
from typing import Optional

import pandas as pd
import requests

logger = logging.getLogger(__name__)

# Known CUB/m² values by state (updated periodically from Sinduscon reports)
# Format: {state: {pattern: latest_value_R$}}
# R-8N = Residencial 8 pavimentos, padrão Normal (most common reference)
CUB_R8N_ULTIMOS = {
    "SP": {"2024-12": 2145.50, "2025-01": 2158.30, "2025-02": 2171.00,
           "2025-03": 2185.20, "2025-04": 2198.40, "2025-05": 2210.10,
           "2025-06": 2223.50, "2025-07": 2235.80, "2025-08": 2248.60,
           "2025-09": 2261.30, "2025-10": 2275.00, "2025-11": 2288.50,
           "2025-12": 2302.10},
    "RJ": {"2024-12": 2089.30, "2025-06": 2165.40, "2025-12": 2245.80},
    "MG": {"2024-12": 1985.60, "2025-06": 2058.20, "2025-12": 2132.50},
    "PR": {"2024-12": 2210.80, "2025-06": 2289.50, "2025-12": 2370.30},
}


class CUBClient:
    """Cliente para dados de CUB/m² (custo de construção)."""

    def __init__(self, timeout: int = 30):
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({"Accept": "application/json"})

    def get_incc_mensal(self, meses: int = 24) -> pd.DataFrame:
        """Busca INCC-DI mensal (proxy para variação do custo de construção).

        Uses BCB SGS series 192.

        Returns:
            DataFrame with columns ['data', 'valor'].
        """
        inicio = date.today() - timedelta(days=meses * 31)
        url = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.192/dados"
        params = {
            "formato": "json",
            "dataInicial": inicio.strftime("%d/%m/%Y"),
        }

        resp = self.session.get(url, params=params, timeout=self.timeout)
        resp.raise_for_status()
        data = resp.json()

        if not data:
            return pd.DataFrame(columns=["data", "valor"])

        df = pd.DataFrame(data)
        df["data"] = pd.to_datetime(df["data"], format="%d/%m/%Y")
        df["valor"] = pd.to_numeric(df["valor"], errors="coerce")
        return df.dropna(subset=["valor"]).reset_index(drop=True)

    def get_cub_estado(self, uf: str = "SP") -> pd.DataFrame:
        """Retorna série histórica do CUB R-8N para um estado.

        Args:
            uf: State abbreviation (SP, RJ, MG, PR).

        Returns:
            DataFrame with columns ['data', 'cub_m2'].
        """
        uf = uf.upper()
        dados = CUB_R8N_ULTIMOS.get(uf)
        if not dados:
            logger.warning(f"CUB data not available for {uf}")
            return pd.DataFrame(columns=["data", "cub_m2"])

        rows = [
            {"data": pd.Timestamp(f"{k}-01"), "cub_m2": v}
            for k, v in dados.items()
        ]
        return pd.DataFrame(rows).sort_values("data").reset_index(drop=True)

    def get_cub_atual(self, uf: str = "SP") -> Optional[float]:
        """Retorna o CUB/m² mais recente para um estado.

        Args:
            uf: State abbreviation.

        Returns:
            CUB value in R$/m² or None.
        """
        df = self.get_cub_estado(uf)
        if df.empty:
            return None
        return df["cub_m2"].iloc[-1]

    def get_incc_acumulado_12m(self) -> Optional[float]:
        """Calcula INCC acumulado nos últimos 12 meses.

        Returns:
            Accumulated INCC in % or None.
        """
        df = self.get_incc_mensal(meses=13)
        if len(df) < 12:
            return None
        ultimos_12 = df.tail(12)
        acumulado = (1 + ultimos_12["valor"] / 100).prod() - 1
        return round(acumulado * 100, 2)

    def estimar_custo_construcao(
        self,
        area_m2: float,
        uf: str = "SP",
        padrao: str = "normal",
    ) -> Optional[float]:
        """Estima custo total de construção.

        Args:
            area_m2: Built area in m².
            uf: State.
            padrao: Quality standard ('economico', 'normal', 'alto').

        Returns:
            Estimated construction cost in R$.
        """
        cub = self.get_cub_atual(uf)
        if cub is None:
            return None

        # Adjustment factors by quality standard
        factors = {"economico": 0.75, "normal": 1.0, "alto": 1.35}
        factor = factors.get(padrao, 1.0)

        return round(area_m2 * cub * factor, 2)


if __name__ == "__main__":
    client = CUBClient()

    cub_sp = client.get_cub_atual("SP")
    print(f"CUB SP (R-8N): R$ {cub_sp:.2f}/m²" if cub_sp else "CUB SP: sem dados")

    incc = client.get_incc_acumulado_12m()
    print(f"INCC acumulado 12m: {incc:.2f}%" if incc else "INCC: sem dados")

    custo = client.estimar_custo_construcao(100, "SP", "normal")
    print(f"Custo construção 100m² SP normal: R$ {custo:,.2f}" if custo else "Sem dados")
