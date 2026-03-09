"""Parser de planilhas do FipeZAP.

O FipeZAP publica índices de preço de venda e locação por m² para 50+ cidades.
Os dados são disponibilizados em planilhas Excel no site da FIPE.
Download: https://fipe.org.br/pt-br/indices/fipezap/
"""

from pathlib import Path
from typing import Optional

import pandas as pd


class FipeZAPParser:
    """Parser para planilhas Excel do índice FipeZAP."""

    def parse_indice(self, filepath: str | Path) -> pd.DataFrame:
        """Parse genérico de planilha FipeZAP (venda ou locação).

        As planilhas FipeZAP tipicamente têm:
        - Primeira linha: cabeçalho com nomes das cidades
        - Primeira coluna: datas (mês/ano)
        - Valores: preço médio por m² ou variação percentual

        Args:
            filepath: Caminho para o arquivo .xlsx do FipeZAP.

        Returns:
            DataFrame com colunas ['data', 'cidade', 'preco_m2'].
        """
        filepath = Path(filepath)
        if not filepath.exists():
            raise FileNotFoundError(f"Arquivo não encontrado: {filepath}")

        # Lê o Excel - a estrutura pode variar, então tentamos detectar
        df_raw = pd.read_excel(filepath, engine="openpyxl")

        # Tenta identificar a coluna de data (geralmente a primeira)
        date_col = df_raw.columns[0]

        # Derrete a tabela: de wide (cidades como colunas) para long
        cidades = [c for c in df_raw.columns if c != date_col]
        df_melted = df_raw.melt(
            id_vars=[date_col],
            value_vars=cidades,
            var_name="cidade",
            value_name="preco_m2",
        )
        df_melted = df_melted.rename(columns={date_col: "data"})
        df_melted["data"] = pd.to_datetime(df_melted["data"], errors="coerce")
        df_melted["preco_m2"] = pd.to_numeric(df_melted["preco_m2"], errors="coerce")

        return df_melted.dropna(subset=["data"]).sort_values(
            ["cidade", "data"]
        ).reset_index(drop=True)

    def parse_venda(self, filepath: str | Path) -> pd.DataFrame:
        """Parse de planilha FipeZAP de preços de venda."""
        return self.parse_indice(filepath)

    def parse_locacao(self, filepath: str | Path) -> pd.DataFrame:
        """Parse de planilha FipeZAP de preços de locação."""
        return self.parse_indice(filepath)

    def get_preco_m2(
        self,
        df: pd.DataFrame,
        cidade: str,
        data: Optional[pd.Timestamp] = None,
    ) -> Optional[float]:
        """Retorna o preço/m² mais recente para uma cidade.

        Args:
            df: DataFrame parseado pelo parse_indice().
            cidade: Nome da cidade (deve corresponder ao cabeçalho da planilha).
            data: Data específica. Se None, retorna o mais recente.

        Returns:
            Preço por m² ou None se não encontrado.
        """
        df_cidade = df[df["cidade"].str.contains(cidade, case=False, na=False)]
        if df_cidade.empty:
            return None

        if data:
            # Busca o registro mais próximo da data solicitada
            df_cidade = df_cidade.iloc[
                (df_cidade["data"] - data).abs().argsort()[:1]
            ]
        else:
            df_cidade = df_cidade.sort_values("data").tail(1)

        return df_cidade["preco_m2"].iloc[0]

    def calcular_variacao(
        self,
        df: pd.DataFrame,
        cidade: str,
        data_inicio: pd.Timestamp,
        data_fim: Optional[pd.Timestamp] = None,
    ) -> Optional[float]:
        """Calcula a variação percentual do preço/m² entre duas datas.

        Args:
            df: DataFrame parseado.
            cidade: Nome da cidade.
            data_inicio: Data de compra/referência.
            data_fim: Data final. Se None, usa o mais recente.

        Returns:
            Variação percentual (ex: 15.3 para +15.3%) ou None.
        """
        preco_inicio = self.get_preco_m2(df, cidade, data_inicio)
        preco_fim = self.get_preco_m2(df, cidade, data_fim)

        if preco_inicio and preco_fim and preco_inicio > 0:
            return ((preco_fim / preco_inicio) - 1) * 100
        return None

    @staticmethod
    def cidades_disponiveis(df: pd.DataFrame) -> list[str]:
        """Lista as cidades disponíveis no DataFrame parseado."""
        return sorted(df["cidade"].unique().tolist())
