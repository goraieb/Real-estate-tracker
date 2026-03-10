"""Cliente para dados da ABECIP (Associação Brasileira das Entidades de Crédito Imobiliário).

A ABECIP publica dados mensais sobre:
- Volume de financiamento imobiliário (SBPE)
- Número de unidades financiadas
- Taxas médias por banco
- Inadimplência do setor

Fonte: https://www.abecip.org.br/credito-imobiliario/indicadores
BCB complementar: séries SGS de crédito imobiliário
"""

import logging
from datetime import date, timedelta
from typing import Optional

import pandas as pd
import requests

logger = logging.getLogger(__name__)

# BCB SGS series related to real estate credit
BCB_CREDIT_SERIES = {
    "credito_imobiliario_pf": 20611,        # Saldo de crédito imobiliário PF
    "credito_imobiliario_concessoes": 20613, # Concessões mensais
    "taxa_media_imobiliario": 20772,         # Taxa média de juros
    "inadimplencia_imobiliario": 21085,      # Taxa de inadimplência
    "sbpe_poupanca": 7415,                   # Captação líquida da poupança SBPE
}


class ABECIPClient:
    """Cliente para dados de crédito imobiliário (ABECIP + BCB)."""

    def __init__(self, timeout: int = 30):
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({"Accept": "application/json"})

    def _bcb_serie(self, codigo: int, data_inicio: Optional[date] = None) -> pd.DataFrame:
        """Fetch a BCB SGS series."""
        url = f"https://api.bcb.gov.br/dados/serie/bcdata.sgs.{codigo}/dados"
        params = {"formato": "json"}
        if data_inicio:
            params["dataInicial"] = data_inicio.strftime("%d/%m/%Y")

        resp = self.session.get(url, params=params, timeout=self.timeout)
        resp.raise_for_status()
        data = resp.json()

        if not data:
            return pd.DataFrame(columns=["data", "valor"])

        df = pd.DataFrame(data)
        df["data"] = pd.to_datetime(df["data"], format="%d/%m/%Y")
        df["valor"] = pd.to_numeric(df["valor"], errors="coerce")
        return df.dropna(subset=["valor"]).reset_index(drop=True)

    def get_volume_financiamento(self, meses: int = 24) -> pd.DataFrame:
        """Volume mensal de concessões de crédito imobiliário (R$ milhões).

        Returns:
            DataFrame with columns ['data', 'valor'].
        """
        inicio = date.today() - timedelta(days=meses * 31)
        return self._bcb_serie(BCB_CREDIT_SERIES["credito_imobiliario_concessoes"], inicio)

    def get_saldo_credito(self, meses: int = 24) -> pd.DataFrame:
        """Saldo total de crédito imobiliário PF (R$ milhões).

        Returns:
            DataFrame with columns ['data', 'valor'].
        """
        inicio = date.today() - timedelta(days=meses * 31)
        return self._bcb_serie(BCB_CREDIT_SERIES["credito_imobiliario_pf"], inicio)

    def get_taxa_media(self, meses: int = 24) -> pd.DataFrame:
        """Taxa média de juros de financiamento imobiliário (% a.a.).

        Returns:
            DataFrame with columns ['data', 'valor'].
        """
        inicio = date.today() - timedelta(days=meses * 31)
        return self._bcb_serie(BCB_CREDIT_SERIES["taxa_media_imobiliario"], inicio)

    def get_inadimplencia(self, meses: int = 24) -> pd.DataFrame:
        """Taxa de inadimplência do crédito imobiliário (%).

        Returns:
            DataFrame with columns ['data', 'valor'].
        """
        inicio = date.today() - timedelta(days=meses * 31)
        return self._bcb_serie(BCB_CREDIT_SERIES["inadimplencia_imobiliario"], inicio)

    def get_poupanca_sbpe(self, meses: int = 24) -> pd.DataFrame:
        """Captação líquida da poupança SBPE (funding for mortgage market).

        Returns:
            DataFrame with columns ['data', 'valor'].
        """
        inicio = date.today() - timedelta(days=meses * 31)
        return self._bcb_serie(BCB_CREDIT_SERIES["sbpe_poupanca"], inicio)

    def get_resumo_credito(self) -> dict:
        """Resumo atual do mercado de crédito imobiliário.

        Returns:
            Dict with current credit market indicators.
        """
        result = {}

        try:
            df_taxa = self.get_taxa_media(meses=3)
            if not df_taxa.empty:
                result["taxa_media_aa"] = round(df_taxa["valor"].iloc[-1], 2)
                result["taxa_data"] = str(df_taxa["data"].iloc[-1].date())
        except Exception as e:
            logger.debug(f"Taxa média failed: {e}")

        try:
            df_inad = self.get_inadimplencia(meses=3)
            if not df_inad.empty:
                result["inadimplencia_pct"] = round(df_inad["valor"].iloc[-1], 2)
        except Exception as e:
            logger.debug(f"Inadimplência failed: {e}")

        try:
            df_vol = self.get_volume_financiamento(meses=3)
            if not df_vol.empty:
                result["volume_concessoes_mm"] = round(df_vol["valor"].iloc[-1], 0)
        except Exception as e:
            logger.debug(f"Volume failed: {e}")

        return result


if __name__ == "__main__":
    client = ABECIPClient()
    resumo = client.get_resumo_credito()
    print(f"Resumo crédito imobiliário: {resumo}")

    df = client.get_taxa_media(meses=12)
    print(f"\nTaxa média - últimos registros:\n{df.tail()}")
