"""Cliente para a API SGS do Banco Central do Brasil.

Acessa séries temporais como Selic, IPCA, IGP-M e taxas de financiamento imobiliário.
Docs: https://dadosabertos.bcb.gov.br/dataset/taxas-de-juros
"""

from datetime import date, datetime
from typing import Optional

import pandas as pd
import requests

BASE_URL = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.{codigo}/dados"

# Séries mais usadas para análise imobiliária
SERIES = {
    "selic": 11,
    "ipca": 433,
    "igpm": 189,
    "incc": 192,
    "cdi": 4390,
    "financiamento_imobiliario": 20772,
    "poupanca": 195,
    "tr": 226,
}


class BCBClient:
    """Cliente para a API SGS (Sistema Gerenciador de Séries Temporais) do BCB."""

    def __init__(self, timeout: int = 30):
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({"Accept": "application/json"})

    def get_serie(
        self,
        codigo: int,
        data_inicio: Optional[date] = None,
        data_fim: Optional[date] = None,
    ) -> pd.DataFrame:
        """Busca uma série temporal do BCB SGS.

        Args:
            codigo: Código da série no SGS (ex: 11 para Selic).
            data_inicio: Data inicial (dd/MM/yyyy). Se None, retorna desde o início.
            data_fim: Data final. Se None, retorna até a data mais recente.

        Returns:
            DataFrame com colunas ['data', 'valor'].
        """
        url = BASE_URL.format(codigo=codigo)
        params = {"formato": "json"}

        if data_inicio:
            params["dataInicial"] = data_inicio.strftime("%d/%m/%Y")
        if data_fim:
            params["dataFinal"] = data_fim.strftime("%d/%m/%Y")

        response = self.session.get(url, params=params, timeout=self.timeout)
        response.raise_for_status()

        data = response.json()
        if not data:
            return pd.DataFrame(columns=["data", "valor"])

        df = pd.DataFrame(data)
        df["data"] = pd.to_datetime(df["data"], format="%d/%m/%Y")
        df["valor"] = pd.to_numeric(df["valor"], errors="coerce")
        return df

    def get_serie_by_name(
        self,
        nome: str,
        data_inicio: Optional[date] = None,
        data_fim: Optional[date] = None,
    ) -> pd.DataFrame:
        """Busca série pelo nome amigável (ex: 'selic', 'ipca', 'igpm')."""
        nome_lower = nome.lower()
        if nome_lower not in SERIES:
            raise ValueError(
                f"Série '{nome}' não encontrada. Disponíveis: {list(SERIES.keys())}"
            )
        return self.get_serie(SERIES[nome_lower], data_inicio, data_fim)

    def get_selic(
        self,
        data_inicio: Optional[date] = None,
        data_fim: Optional[date] = None,
    ) -> pd.DataFrame:
        """Atalho para a taxa Selic diária."""
        return self.get_serie(SERIES["selic"], data_inicio, data_fim)

    def get_ipca(
        self,
        data_inicio: Optional[date] = None,
        data_fim: Optional[date] = None,
    ) -> pd.DataFrame:
        """Atalho para o IPCA mensal."""
        return self.get_serie(SERIES["ipca"], data_inicio, data_fim)

    def get_igpm(
        self,
        data_inicio: Optional[date] = None,
        data_fim: Optional[date] = None,
    ) -> pd.DataFrame:
        """Atalho para o IGP-M mensal."""
        return self.get_serie(SERIES["igpm"], data_inicio, data_fim)

    def get_taxa_financiamento(
        self,
        data_inicio: Optional[date] = None,
        data_fim: Optional[date] = None,
    ) -> pd.DataFrame:
        """Atalho para taxa média de financiamento imobiliário."""
        return self.get_serie(
            SERIES["financiamento_imobiliario"], data_inicio, data_fim
        )

    def calcular_acumulado(self, df: pd.DataFrame, periodo_meses: int = 12) -> float:
        """Calcula o acumulado de uma série nos últimos N meses.

        Útil para calcular IPCA acumulado 12 meses, IGP-M acumulado, etc.
        """
        ultimos = df.tail(periodo_meses)
        # Fórmula: produtório de (1 + taxa/100) - 1
        acumulado = (1 + ultimos["valor"] / 100).prod() - 1
        return acumulado * 100


if __name__ == "__main__":
    client = BCBClient()

    # Exemplo: buscar Selic dos últimos 30 dias
    inicio = date(2024, 1, 1)
    df_selic = client.get_selic(data_inicio=inicio)
    print(f"Selic - últimos registros:\n{df_selic.tail()}\n")

    # Exemplo: IPCA acumulado 12 meses
    df_ipca = client.get_ipca(data_inicio=date(2023, 1, 1))
    ipca_12m = client.calcular_acumulado(df_ipca, 12)
    print(f"IPCA acumulado 12 meses: {ipca_12m:.2f}%")
