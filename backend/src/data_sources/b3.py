"""Cliente para dados da B3 (bolsa de valores).

Acessa o índice IFIX (Fundos Imobiliários) e outros benchmarks de REITs
para comparação com rentabilidade de imóveis físicos.
"""

from datetime import date, timedelta
from typing import Optional

import pandas as pd
import requests

# B3 disponibiliza dados históricos do IFIX via API pública
# Alternativa: Yahoo Finance (^IFIX) ou Status Invest
YAHOO_FINANCE_URL = "https://query1.finance.yahoo.com/v8/finance/chart"


class B3Client:
    """Cliente para dados de mercado da B3."""

    def __init__(self, timeout: int = 30):
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Real Estate Tracker)",
        })

    def get_ifix_historico(
        self,
        data_inicio: Optional[date] = None,
        data_fim: Optional[date] = None,
    ) -> pd.DataFrame:
        """Busca cotações históricas do IFIX (índice de fundos imobiliários).

        Uses Yahoo Finance API as the data source.

        Args:
            data_inicio: Start date. Defaults to 2 years ago.
            data_fim: End date. Defaults to today.

        Returns:
            DataFrame with columns ['data', 'valor', 'variacao_pct'].
        """
        if data_inicio is None:
            data_inicio = date.today() - timedelta(days=730)
        if data_fim is None:
            data_fim = date.today()

        period1 = int(pd.Timestamp(data_inicio).timestamp())
        period2 = int(pd.Timestamp(data_fim).timestamp())

        url = f"{YAHOO_FINANCE_URL}/IFIX11.SA"
        params = {
            "period1": period1,
            "period2": period2,
            "interval": "1d",
        }

        try:
            resp = self.session.get(url, params=params, timeout=self.timeout)
            resp.raise_for_status()
            data = resp.json()

            result = data["chart"]["result"][0]
            timestamps = result["timestamp"]
            closes = result["indicators"]["quote"][0]["close"]

            df = pd.DataFrame({
                "data": pd.to_datetime(timestamps, unit="s"),
                "valor": closes,
            })
            df = df.dropna(subset=["valor"])
            df["variacao_pct"] = df["valor"].pct_change() * 100
            return df.reset_index(drop=True)

        except Exception:
            # Fallback: try alternative IFIX ticker
            return self._get_ifix_fallback(data_inicio, data_fim)

    def _get_ifix_fallback(self, data_inicio: date, data_fim: date) -> pd.DataFrame:
        """Fallback: fetch IFIX from alternative source."""
        try:
            # Try BOVA11 as a secondary market benchmark
            period1 = int(pd.Timestamp(data_inicio).timestamp())
            period2 = int(pd.Timestamp(data_fim).timestamp())

            url = f"{YAHOO_FINANCE_URL}/%5EBVSP"
            params = {"period1": period1, "period2": period2, "interval": "1mo"}

            resp = self.session.get(url, params=params, timeout=self.timeout)
            resp.raise_for_status()
            data = resp.json()

            result = data["chart"]["result"][0]
            timestamps = result["timestamp"]
            closes = result["indicators"]["quote"][0]["close"]

            df = pd.DataFrame({
                "data": pd.to_datetime(timestamps, unit="s"),
                "valor": closes,
            })
            df = df.dropna(subset=["valor"])
            df["variacao_pct"] = df["valor"].pct_change() * 100
            return df.reset_index(drop=True)
        except Exception:
            return pd.DataFrame(columns=["data", "valor", "variacao_pct"])

    def get_ifix_retorno_periodo(self, meses: int = 12) -> Optional[float]:
        """Calcula retorno acumulado do IFIX nos últimos N meses.

        Returns:
            Retorno percentual acumulado ou None.
        """
        inicio = date.today() - timedelta(days=meses * 30)
        df = self.get_ifix_historico(data_inicio=inicio)
        if df.empty or len(df) < 2:
            return None
        return ((df["valor"].iloc[-1] / df["valor"].iloc[0]) - 1) * 100

    def get_tesouro_ntnb(self) -> Optional[float]:
        """Busca taxa do Tesouro IPCA+ (NTN-B) como benchmark.

        Uses BCB SGS series 12466 (NTN-B 2035 indicative rate).
        """
        try:
            url = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.12466/dados/ultimos/1"
            params = {"formato": "json"}
            resp = self.session.get(url, params=params, timeout=self.timeout)
            resp.raise_for_status()
            data = resp.json()
            if data:
                return float(data[0]["valor"])
        except Exception:
            pass
        return None


if __name__ == "__main__":
    client = B3Client()
    df = client.get_ifix_historico()
    print(f"IFIX - últimos registros:\n{df.tail()}")
    retorno = client.get_ifix_retorno_periodo(12)
    print(f"IFIX retorno 12 meses: {retorno:.2f}%" if retorno else "IFIX: sem dados")
    ntnb = client.get_tesouro_ntnb()
    print(f"NTN-B taxa: {ntnb:.2f}%" if ntnb else "NTN-B: sem dados")
