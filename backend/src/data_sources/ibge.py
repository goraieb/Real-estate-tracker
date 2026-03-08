"""Cliente para as APIs do IBGE.

Acessa dados de localidades (municípios, estados), população (Censo 2022)
e malhas geográficas (GeoJSON) para mapas.
Docs: https://servicodados.ibge.gov.br/api/docs
"""

from typing import Optional

import pandas as pd
import requests

BASE_URL_LOCALIDADES = "https://servicodados.ibge.gov.br/api/v1/localidades"
BASE_URL_AGREGADOS = "https://servicodados.ibge.gov.br/api/v3/agregados"
BASE_URL_MALHAS = "https://servicodados.ibge.gov.br/api/v3/malhas"


class IBGEClient:
    """Cliente para APIs do IBGE (localidades, agregados, malhas)."""

    def __init__(self, timeout: int = 30):
        self.timeout = timeout
        self.session = requests.Session()

    # --- Localidades ---

    def get_estados(self) -> pd.DataFrame:
        """Lista todos os estados brasileiros."""
        url = f"{BASE_URL_LOCALIDADES}/estados"
        resp = self.session.get(url, timeout=self.timeout)
        resp.raise_for_status()
        data = resp.json()
        df = pd.DataFrame(data)
        return df[["id", "sigla", "nome"]].sort_values("sigla").reset_index(drop=True)

    def get_municipios(self, uf: Optional[str] = None) -> pd.DataFrame:
        """Lista municípios, opcionalmente filtrado por UF (sigla, ex: 'SP').

        Args:
            uf: Sigla do estado (ex: 'SP', 'RJ'). Se None, retorna todos.

        Returns:
            DataFrame com colunas ['id', 'nome', 'uf_sigla', 'uf_nome'].
        """
        if uf:
            url = f"{BASE_URL_LOCALIDADES}/estados/{uf}/municipios"
        else:
            url = f"{BASE_URL_LOCALIDADES}/municipios"

        resp = self.session.get(url, timeout=self.timeout)
        resp.raise_for_status()
        data = resp.json()

        rows = []
        for m in data:
            rows.append({
                "id": m["id"],
                "nome": m["nome"],
                "uf_sigla": m["microrregiao"]["mesorregiao"]["UF"]["sigla"],
                "uf_nome": m["microrregiao"]["mesorregiao"]["UF"]["nome"],
            })
        return pd.DataFrame(rows)

    # --- Dados do Censo / Agregados ---

    def get_populacao(
        self,
        cod_localidade: str = "all",
        nivel: str = "N6",
    ) -> pd.DataFrame:
        """Busca dados populacionais do Censo 2022.

        Usa a tabela 4714 (População residente) do Censo 2022.

        Args:
            cod_localidade: Código IBGE do município ou 'all' para todos.
            nivel: Nível geográfico - N6=município, N3=estado, N1=país.

        Returns:
            DataFrame com colunas ['localidade_id', 'localidade_nome', 'populacao'].
        """
        # Tabela 4714: População residente - Censo 2022
        tabela = 4714
        variavel = 93  # População residente
        url = (
            f"{BASE_URL_AGREGADOS}/{tabela}/periodos/2022"
            f"/variaveis/{variavel}"
            f"?localidades={nivel}[{cod_localidade}]"
        )

        resp = self.session.get(url, timeout=self.timeout)
        resp.raise_for_status()
        data = resp.json()

        rows = []
        if data and data[0].get("resultados"):
            for resultado in data[0]["resultados"]:
                for serie in resultado.get("series", []):
                    loc = serie["localidade"]
                    valor = serie["serie"].get("2022", "0")
                    rows.append({
                        "localidade_id": loc["id"],
                        "localidade_nome": loc["nome"],
                        "populacao": int(valor) if valor and valor != "-" else 0,
                    })

        return pd.DataFrame(rows)

    # --- Malhas geográficas (GeoJSON) ---

    def get_malha_geojson(
        self,
        localidade: str = "BR",
        resolucao: int = 2,
        qualidade: str = "minima",
    ) -> dict:
        """Baixa malha geográfica em formato GeoJSON.

        Args:
            localidade: Código IBGE ou 'BR' para Brasil inteiro.
            resolucao: 0=país, 1=estado, 2=município, 3=microrregião, 4=mesrorregião.
            qualidade: 'minima', 'intermediaria' ou 'maxima'.

        Returns:
            Dict com GeoJSON (FeatureCollection).
        """
        url = f"{BASE_URL_MALHAS}/{localidade}"
        params = {
            "resolucao": resolucao,
            "qualidade": qualidade,
            "formato": "application/vnd.geo+json",
        }
        resp = self.session.get(url, params=params, timeout=60)
        resp.raise_for_status()
        return resp.json()

    def get_malha_estado(self, uf_codigo: int, resolucao: int = 2) -> dict:
        """Atalho para baixar malha de um estado específico (resolução municipal)."""
        return self.get_malha_geojson(
            localidade=str(uf_codigo), resolucao=resolucao
        )


if __name__ == "__main__":
    client = IBGEClient()

    # Lista municípios de SP
    df_sp = client.get_municipios("SP")
    print(f"Municípios SP: {len(df_sp)}")
    print(df_sp.head())

    # População de São Paulo capital (código IBGE: 3550308)
    df_pop = client.get_populacao("3550308")
    print(f"\nPopulação SP capital:\n{df_pop}")
