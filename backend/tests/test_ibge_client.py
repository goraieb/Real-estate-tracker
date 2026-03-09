"""Tests for IBGEClient."""

from unittest.mock import patch, MagicMock

import pandas as pd
import pytest

from src.data_sources.ibge import IBGEClient


@pytest.fixture
def client():
    return IBGEClient(timeout=5)


class TestGetEstados:
    def test_returns_dataframe(self, client):
        mock_data = [
            {"id": 35, "sigla": "SP", "nome": "São Paulo"},
            {"id": 33, "sigla": "RJ", "nome": "Rio de Janeiro"},
        ]
        mock_resp = MagicMock()
        mock_resp.json.return_value = mock_data
        mock_resp.raise_for_status.return_value = None

        with patch.object(client.session, "get", return_value=mock_resp):
            df = client.get_estados()
            assert isinstance(df, pd.DataFrame)
            assert set(["id", "sigla", "nome"]).issubset(df.columns)
            assert len(df) == 2

    def test_columns(self, client):
        mock_data = [{"id": 35, "sigla": "SP", "nome": "São Paulo", "regiao": {}}]
        mock_resp = MagicMock()
        mock_resp.json.return_value = mock_data
        mock_resp.raise_for_status.return_value = None

        with patch.object(client.session, "get", return_value=mock_resp):
            df = client.get_estados()
            assert list(df.columns) == ["id", "sigla", "nome"]


class TestGetMunicipios:
    def test_sp(self, client):
        mock_data = [
            {
                "id": 3550308,
                "nome": "São Paulo",
                "microrregiao": {"mesorregiao": {"UF": {"sigla": "SP", "nome": "São Paulo"}}},
            },
            {
                "id": 3509502,
                "nome": "Campinas",
                "microrregiao": {"mesorregiao": {"UF": {"sigla": "SP", "nome": "São Paulo"}}},
            },
        ]
        mock_resp = MagicMock()
        mock_resp.json.return_value = mock_data
        mock_resp.raise_for_status.return_value = None

        with patch.object(client.session, "get", return_value=mock_resp) as mock_get:
            df = client.get_municipios("SP")
            assert len(df) == 2
            assert "São Paulo" in df["nome"].values
            # URL should include /estados/SP/
            url = mock_get.call_args[0][0]
            assert "SP" in url

    def test_all(self, client):
        mock_data = [
            {
                "id": 1,
                "nome": "Município1",
                "microrregiao": {"mesorregiao": {"UF": {"sigla": "XX", "nome": "Estado"}}},
            },
        ]
        mock_resp = MagicMock()
        mock_resp.json.return_value = mock_data
        mock_resp.raise_for_status.return_value = None

        with patch.object(client.session, "get", return_value=mock_resp) as mock_get:
            df = client.get_municipios()
            url = mock_get.call_args[0][0]
            assert "municipios" in url
            assert len(df) == 1


class TestGetPopulacao:
    def test_municipio(self, client):
        mock_data = [{
            "resultados": [{
                "series": [{
                    "localidade": {"id": "3550308", "nome": "São Paulo"},
                    "serie": {"2022": "11451245"},
                }]
            }]
        }]
        mock_resp = MagicMock()
        mock_resp.json.return_value = mock_data
        mock_resp.raise_for_status.return_value = None

        with patch.object(client.session, "get", return_value=mock_resp):
            df = client.get_populacao("3550308")
            assert len(df) == 1
            assert df["populacao"].iloc[0] == 11451245

    def test_empty(self, client):
        mock_resp = MagicMock()
        mock_resp.json.return_value = [{"resultados": []}]
        mock_resp.raise_for_status.return_value = None

        with patch.object(client.session, "get", return_value=mock_resp):
            df = client.get_populacao("9999999")
            assert len(df) == 0


class TestGetMalhaGeoJSON:
    def test_br(self, client):
        geojson = {"type": "FeatureCollection", "features": [{"type": "Feature"}]}
        mock_resp = MagicMock()
        mock_resp.json.return_value = geojson
        mock_resp.raise_for_status.return_value = None

        with patch.object(client.session, "get", return_value=mock_resp):
            result = client.get_malha_geojson()
            assert result["type"] == "FeatureCollection"
            assert len(result["features"]) == 1

    def test_estado(self, client):
        geojson = {"type": "FeatureCollection", "features": [{"type": "Feature"}, {"type": "Feature"}]}
        mock_resp = MagicMock()
        mock_resp.json.return_value = geojson
        mock_resp.raise_for_status.return_value = None

        with patch.object(client.session, "get", return_value=mock_resp):
            result = client.get_malha_estado(35)
            assert len(result["features"]) == 2

    def test_timeout(self, client):
        with patch.object(client.session, "get", side_effect=Exception("Timeout")):
            with pytest.raises(Exception, match="Timeout"):
                client.get_malha_geojson()
