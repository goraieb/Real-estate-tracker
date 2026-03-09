"""Cliente para dados do Inside Airbnb.

O Inside Airbnb disponibiliza dados de listings do Airbnb em formato CSV
para diversas cidades, incluindo São Paulo e Rio de Janeiro.
Download: http://insideairbnb.com/get-the-data/
"""

import gzip
import io
from pathlib import Path
from typing import Optional

import pandas as pd
import requests

# URLs conhecidas para cidades brasileiras no Inside Airbnb
CITIES = {
    "rio-de-janeiro": {
        "name": "Rio de Janeiro",
        "base_url": "http://data.insideairbnb.com/brazil/rj/rio-de-janeiro",
    },
    "sao-paulo": {
        "name": "São Paulo",
        "base_url": "http://data.insideairbnb.com/brazil/sp/sao-paulo",
    },
}

# Colunas relevantes do listings.csv.gz
LISTING_COLUMNS = [
    "id",
    "name",
    "neighbourhood_cleansed",
    "latitude",
    "longitude",
    "room_type",
    "price",
    "minimum_nights",
    "number_of_reviews",
    "reviews_per_month",
    "availability_365",
    "calculated_host_listings_count",
]


class InsideAirbnbClient:
    """Cliente para download e parsing de dados do Inside Airbnb."""

    def __init__(self, data_dir: str | Path = "data/airbnb", timeout: int = 120):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.timeout = timeout
        self.session = requests.Session()

    def download_listings(
        self,
        cidade: str,
        data_snapshot: str,
    ) -> Path:
        """Baixa o arquivo listings.csv.gz de uma cidade.

        Args:
            cidade: Slug da cidade (ex: 'sao-paulo', 'rio-de-janeiro').
            data_snapshot: Data do snapshot (ex: '2024-09-27').
                Consulte insideairbnb.com/get-the-data para datas disponíveis.

        Returns:
            Path para o arquivo baixado.
        """
        if cidade not in CITIES:
            raise ValueError(
                f"Cidade '{cidade}' não suportada. Disponíveis: {list(CITIES.keys())}"
            )

        base = CITIES[cidade]["base_url"]
        url = f"{base}/{data_snapshot}/data/listings.csv.gz"

        output_path = self.data_dir / f"{cidade}_{data_snapshot}_listings.csv.gz"
        if output_path.exists():
            return output_path

        resp = self.session.get(url, timeout=self.timeout)
        resp.raise_for_status()
        output_path.write_bytes(resp.content)
        return output_path

    def parse_listings(self, filepath: str | Path) -> pd.DataFrame:
        """Parse do arquivo listings.csv.gz do Inside Airbnb.

        Args:
            filepath: Caminho para o arquivo .csv.gz.

        Returns:
            DataFrame com dados dos listings.
        """
        filepath = Path(filepath)
        df = pd.read_csv(filepath, compression="gzip" if str(filepath).endswith(".gz") else None)

        # Limpa a coluna de preço (remove $ e vírgulas)
        if "price" in df.columns:
            df["price"] = (
                df["price"]
                .astype(str)
                .str.replace("$", "", regex=False)
                .str.replace(",", "", regex=False)
            )
            df["price"] = pd.to_numeric(df["price"], errors="coerce")

        # Seleciona apenas colunas relevantes que existem
        cols_available = [c for c in LISTING_COLUMNS if c in df.columns]
        return df[cols_available].copy()

    def get_estatisticas_bairro(self, df: pd.DataFrame) -> pd.DataFrame:
        """Calcula estatísticas por bairro.

        Returns:
            DataFrame com colunas por bairro:
            ['bairro', 'qtd_listings', 'preco_medio', 'preco_mediano',
             'ocupacao_estimada', 'reviews_mes_medio'].
        """
        stats = df.groupby("neighbourhood_cleansed").agg(
            qtd_listings=("id", "count"),
            preco_medio=("price", "mean"),
            preco_mediano=("price", "median"),
            reviews_mes_medio=("reviews_per_month", "mean"),
            disponibilidade_media=("availability_365", "mean"),
        ).reset_index()

        stats = stats.rename(columns={"neighbourhood_cleansed": "bairro"})

        # Estimativa de ocupação: (365 - disponibilidade) / 365
        stats["ocupacao_estimada"] = (
            (365 - stats["disponibilidade_media"]) / 365 * 100
        )

        return stats.sort_values("preco_mediano", ascending=False).reset_index(drop=True)

    def estimar_receita_mensal(
        self,
        preco_noite: float,
        ocupacao_pct: float,
    ) -> float:
        """Estima a receita mensal bruta de um Airbnb.

        Args:
            preco_noite: Preço por noite em R$.
            ocupacao_pct: Taxa de ocupação em % (ex: 65.0).

        Returns:
            Receita mensal estimada em R$.
        """
        dias_ocupados = 30 * (ocupacao_pct / 100)
        return preco_noite * dias_ocupados

    @staticmethod
    def cidades_disponiveis() -> dict:
        """Retorna as cidades disponíveis."""
        return {k: v["name"] for k, v in CITIES.items()}


if __name__ == "__main__":
    client = InsideAirbnbClient()
    print(f"Cidades disponíveis: {client.cidades_disponiveis()}")

    # Para testar, seria necessário baixar um snapshot:
    # path = client.download_listings("sao-paulo", "2024-09-27")
    # df = client.parse_listings(path)
    # stats = client.get_estatisticas_bairro(df)
    # print(stats.head(10))
