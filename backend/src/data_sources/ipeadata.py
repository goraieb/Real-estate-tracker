"""Cliente para a API do Ipeadata.

Acessa séries temporais de índices econômicos como INCC, IGP-M e outros
indicadores relevantes para o mercado imobiliário.
Docs: http://www.ipeadata.gov.br/api/
"""

from datetime import date
from typing import Optional

import pandas as pd
import requests

BASE_URL = "http://www.ipeadata.gov.br/api/odata4"

# Séries relevantes para imobiliário
SERIES = {
    "incc": "ABCR12_INCCDI12",       # INCC-DI acumulado 12 meses
    "incc_mensal": "FGV12_INCCDI",    # INCC-DI mensal
    "igpm": "IGP12_IGPMG12",          # IGP-M acumulado 12 meses
    "igpm_mensal": "IGP12_IGPMG",     # IGP-M mensal
    "ipca": "PRECOS12_IPCA12",        # IPCA acumulado 12 meses
    "selic_anual": "BM12_TJOVER12",   # Selic anualizada
    "cambio": "BM12_ERC12",           # Taxa de câmbio
    "pib_real": "SCN104_PIBPMG4",     # PIB real variação
    "renda_media": "PNADC12_RRTH12",  # Rendimento real habitual médio
}


class IpeadataClient:
    """Cliente para a API OData do Ipeadata."""

    def __init__(self, timeout: int = 30):
        self.timeout = timeout
        self.session = requests.Session()

    def get_serie(self, serie_id: str) -> pd.DataFrame:
        """Busca uma série temporal pelo código Ipeadata.

        Args:
            serie_id: Código da série (ex: 'IGP12_IGPMG12').

        Returns:
            DataFrame com colunas ['data', 'valor'].
        """
        url = f"{BASE_URL}/Metadados('{serie_id}')/Valores"
        resp = self.session.get(url, timeout=self.timeout)
        resp.raise_for_status()
        data = resp.json()

        records = data.get("value", [])
        if not records:
            return pd.DataFrame(columns=["data", "valor"])

        df = pd.DataFrame(records)
        # A coluna de data no Ipeadata é 'VALDATA', valor é 'VALVALOR'
        df = df.rename(columns={"VALDATA": "data", "VALVALOR": "valor"})
        df["data"] = pd.to_datetime(df["data"])
        df["valor"] = pd.to_numeric(df["valor"], errors="coerce")
        return df[["data", "valor"]].dropna().sort_values("data").reset_index(drop=True)

    def get_serie_by_name(self, nome: str) -> pd.DataFrame:
        """Busca série pelo nome amigável (ex: 'incc', 'igpm', 'ipca')."""
        nome_lower = nome.lower()
        if nome_lower not in SERIES:
            raise ValueError(
                f"Série '{nome}' não encontrada. Disponíveis: {list(SERIES.keys())}"
            )
        return self.get_serie(SERIES[nome_lower])

    def get_metadados(self, serie_id: str) -> dict:
        """Busca metadados de uma série (nome, fonte, periodicidade, etc.)."""
        url = f"{BASE_URL}/Metadados('{serie_id}')"
        resp = self.session.get(url, timeout=self.timeout)
        resp.raise_for_status()
        return resp.json()

    def buscar_series(self, termo: str) -> pd.DataFrame:
        """Busca séries cujo nome contenha o termo informado.

        Args:
            termo: Texto para busca (ex: 'construção', 'imobiliário').

        Returns:
            DataFrame com colunas ['SERCODIGO', 'SERNOME', 'SERFONTE'].
        """
        url = (
            f"{BASE_URL}/Metadados?"
            f"$filter=contains(SERNOME,'{termo}')"
            f"&$select=SERCODIGO,SERNOME,SERFONTE,SERPERI"
            f"&$top=50"
        )
        resp = self.session.get(url, timeout=self.timeout)
        resp.raise_for_status()
        data = resp.json()
        return pd.DataFrame(data.get("value", []))

    def get_incc(self) -> pd.DataFrame:
        """Atalho para INCC-DI mensal."""
        return self.get_serie(SERIES["incc_mensal"])

    def get_igpm(self) -> pd.DataFrame:
        """Atalho para IGP-M mensal."""
        return self.get_serie(SERIES["igpm_mensal"])


if __name__ == "__main__":
    client = IpeadataClient()

    # Buscar INCC mensal
    df = client.get_incc()
    print(f"INCC-DI mensal - últimos registros:\n{df.tail()}\n")

    # Buscar séries relacionadas a construção
    resultados = client.buscar_series("construção civil")
    print(f"Séries sobre construção civil:\n{resultados[['SERCODIGO', 'SERNOME']].head(10)}")
