"""Parser de dados de ITBI (Imposto de Transmissão de Bens Imóveis).

O ITBI registra transações reais de compra e venda de imóveis, oferecendo
a maior granularidade disponível publicamente.

Fontes:
- SP: Dados abertos da Prefeitura de SP (XLSX)
  https://www.prefeitura.sp.gov.br/cidade/secretarias/fazenda/
- RJ: Data.Rio - Portal de dados abertos do Rio
  https://www.data.rio/
"""

from pathlib import Path
from typing import Optional

import pandas as pd


class ITBIParser:
    """Parser para dados de transações ITBI de São Paulo e Rio de Janeiro."""

    # --- São Paulo ---

    def parse_itbi_sp(self, filepath: str | Path) -> pd.DataFrame:
        """Parse de arquivo XLSX de transações ITBI de São Paulo.

        Os dados de SP tipicamente contêm:
        - SQL (Setor-Quadra-Lote) do imóvel
        - Endereço
        - Valor da transação
        - Data da transação
        - Tipo do imóvel
        - Área construída / terreno

        Args:
            filepath: Caminho para o arquivo .xlsx ou .csv.

        Returns:
            DataFrame normalizado com transações.
        """
        filepath = Path(filepath)
        if not filepath.exists():
            raise FileNotFoundError(f"Arquivo não encontrado: {filepath}")

        if filepath.suffix == ".xlsx":
            df = pd.read_excel(filepath, engine="openpyxl")
        elif filepath.suffix == ".csv":
            df = pd.read_csv(filepath, sep=";", encoding="latin-1")
        else:
            raise ValueError(f"Formato não suportado: {filepath.suffix}")

        # Detect headerless files: if first column is numeric, assume no header
        if not isinstance(df.columns[0], str):
            SP_ITBI_HEADERS = [
                "sql", "endereco", "numero", "complemento", "bairro",
                "referencia", "cep", "natureza_transacao",
                "valor_transacao", "data_transacao",
                "valor_venal_ref", "proporcao_transmitida",
                "valor_venal_proporcional", "base_calculo",
                "tipo_financiamento", "valor_financiado",
                "cartorio", "matricula", "situacao_sql",
                "area_terreno", "testada", "fracao_ideal",
                "area_construida", "tipo_imovel", "descricao_uso",
                "padrao_iptu", "descricao_padrao", "acc_iptu",
            ]
            # Re-read with header=None and assign names
            if filepath.suffix == ".xlsx":
                df = pd.read_excel(filepath, engine="openpyxl", header=None)
            else:
                df = pd.read_csv(filepath, sep=";", encoding="latin-1", header=None)
            df.columns = SP_ITBI_HEADERS[: len(df.columns)]

        # Normaliza nomes de colunas (remove espaços, acentos, lowercase)
        df.columns = (
            pd.Index([str(c) for c in df.columns])
            .str.strip()
            .str.lower()
            .str.replace(" ", "_")
            .str.normalize("NFKD")
            .str.encode("ascii", errors="ignore")
            .str.decode("ascii")
        )

        # Tenta mapear colunas conhecidas
        column_map = self._detect_columns_sp(df.columns.tolist())
        df = df.rename(columns=column_map)
        # Drop duplicate columns (keep first occurrence)
        df = df.loc[:, ~df.columns.duplicated()]

        # Converte tipos
        if "valor_transacao" in df.columns:
            df["valor_transacao"] = pd.to_numeric(
                df["valor_transacao"], errors="coerce"
            )
        if "area_construida" in df.columns:
            df["area_construida"] = pd.to_numeric(
                df["area_construida"], errors="coerce"
            )
        if "data_transacao" in df.columns:
            df["data_transacao"] = pd.to_datetime(
                df["data_transacao"], errors="coerce", dayfirst=True
            )

        # Calcula preço por m² onde possível
        if "valor_transacao" in df.columns and "area_construida" in df.columns:
            mask = (df["area_construida"] > 0) & (df["valor_transacao"] > 0)
            df.loc[mask, "preco_m2"] = (
                df.loc[mask, "valor_transacao"] / df.loc[mask, "area_construida"]
            )

        df["cidade"] = "São Paulo"
        return df

    def _detect_columns_sp(self, columns: list[str]) -> dict:
        """Detecta e mapeia colunas do arquivo SP para nomes padronizados."""
        mapping = {}
        patterns = {
            "valor_transacao": ["valor", "vl_transacao", "valor_transacao", "vl_lancamento"],
            "data_transacao": ["data", "dt_transacao", "data_transacao", "dt_lancamento"],
            "endereco": ["endereco", "logradouro", "endereco_imovel"],
            "bairro": ["bairro", "distrito", "subdistrito"],
            "area_construida": ["area", "area_construida", "area_util", "ac"],
            "area_terreno": ["area_terreno", "at"],
            "sql": ["sql", "setor_quadra_lote", "inscricao"],
            "tipo_imovel": ["tipo", "tipo_imovel", "finalidade", "uso"],
        }

        for target, candidates in patterns.items():
            for col in columns:
                col_str = str(col).lower().strip() if not isinstance(col, float) else ""
                if col_str and (col_str in candidates or any(c in col_str for c in candidates)):
                    mapping[col] = target
                    break

        return mapping

    # --- Rio de Janeiro ---

    def parse_itbi_rj(self, filepath: str | Path) -> pd.DataFrame:
        """Parse de arquivo CSV/GeoJSON de ITBI do Data.Rio.

        Os dados do RJ incluem:
        - Logradouro
        - Bairro
        - Valor médio por m²
        - Número de transações
        - Período

        Args:
            filepath: Caminho para o arquivo .csv ou .geojson.

        Returns:
            DataFrame normalizado.
        """
        filepath = Path(filepath)
        if not filepath.exists():
            raise FileNotFoundError(f"Arquivo não encontrado: {filepath}")

        if filepath.suffix == ".csv":
            df = pd.read_csv(filepath, sep=";", encoding="utf-8")
        elif filepath.suffix == ".geojson":
            import json
            with open(filepath) as f:
                geojson = json.load(f)
            rows = [feat["properties"] for feat in geojson["features"]]
            df = pd.DataFrame(rows)
        else:
            raise ValueError(f"Formato não suportado: {filepath.suffix}")

        # Normaliza colunas
        df.columns = (
            df.columns.str.strip()
            .str.lower()
            .str.replace(" ", "_")
        )

        df["cidade"] = "Rio de Janeiro"
        return df

    # --- Análise ---

    def get_preco_m2_por_bairro(
        self,
        df: pd.DataFrame,
        bairro: Optional[str] = None,
    ) -> pd.DataFrame:
        """Calcula preço médio por m² agrupado por bairro.

        Args:
            df: DataFrame de transações ITBI (resultado de parse_itbi_sp/rj).
            bairro: Filtrar por bairro específico (opcional).

        Returns:
            DataFrame com ['bairro', 'preco_m2_medio', 'preco_m2_mediano',
                          'qtd_transacoes', 'valor_total'].
        """
        if "preco_m2" not in df.columns:
            raise ValueError("DataFrame não contém coluna 'preco_m2'. Use dados de SP.")

        if bairro:
            df = df[df["bairro"].str.contains(bairro, case=False, na=False)]

        # Remove outliers (preço/m² entre R$500 e R$100.000)
        df_filtrado = df[
            (df["preco_m2"] >= 500) & (df["preco_m2"] <= 100_000)
        ]

        stats = df_filtrado.groupby("bairro").agg(
            preco_m2_medio=("preco_m2", "mean"),
            preco_m2_mediano=("preco_m2", "median"),
            qtd_transacoes=("preco_m2", "count"),
            valor_total=("valor_transacao", "sum"),
        ).reset_index()

        return stats.sort_values("preco_m2_mediano", ascending=False).reset_index(
            drop=True
        )

    def get_evolucao_precos(
        self,
        df: pd.DataFrame,
        bairro: Optional[str] = None,
        freq: str = "ME",
    ) -> pd.DataFrame:
        """Calcula evolução de preço/m² ao longo do tempo.

        Args:
            df: DataFrame de transações ITBI.
            bairro: Filtrar por bairro (opcional).
            freq: Frequência de agrupamento ('ME'=mensal, 'QE'=trimestral, 'YE'=anual).

        Returns:
            DataFrame com ['periodo', 'preco_m2_mediano', 'qtd_transacoes'].
        """
        if "preco_m2" not in df.columns or "data_transacao" not in df.columns:
            raise ValueError("DataFrame precisa de 'preco_m2' e 'data_transacao'.")

        df_work = df.copy()
        if bairro:
            df_work = df_work[
                df_work["bairro"].str.contains(bairro, case=False, na=False)
            ]

        # Remove outliers
        df_work = df_work[
            (df_work["preco_m2"] >= 500) & (df_work["preco_m2"] <= 100_000)
        ]

        df_work = df_work.set_index("data_transacao")
        result = df_work.resample(freq).agg(
            preco_m2_mediano=("preco_m2", "median"),
            qtd_transacoes=("preco_m2", "count"),
        ).reset_index()

        result = result.rename(columns={"data_transacao": "periodo"})
        return result[result["qtd_transacoes"] > 0]
