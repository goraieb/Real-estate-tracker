"""Tests for IpeadataClient."""

from unittest.mock import patch, MagicMock

import pandas as pd
import pytest

from src.data_sources.ipeadata import IpeadataClient, SERIES


@pytest.fixture
def client():
    return IpeadataClient(timeout=5)


@pytest.fixture
def mock_response():
    data = {
        "value": [
            {"VALDATA": "2024-01-01T00:00:00-03:00", "VALVALOR": 0.52},
            {"VALDATA": "2024-02-01T00:00:00-03:00", "VALVALOR": 0.48},
            {"VALDATA": "2024-03-01T00:00:00-03:00", "VALVALOR": 0.33},
        ]
    }
    mock_resp = MagicMock()
    mock_resp.json.return_value = data
    mock_resp.raise_for_status.return_value = None
    return mock_resp


class TestGetSerie:
    def test_returns_dataframe(self, client, mock_response):
        with patch.object(client.session, "get", return_value=mock_response):
            df = client.get_serie("FGV12_INCCDI")
            assert isinstance(df, pd.DataFrame)
            assert "data" in df.columns
            assert "valor" in df.columns
            assert len(df) == 3

    def test_empty_response(self, client):
        mock_resp = MagicMock()
        mock_resp.json.return_value = {"value": []}
        mock_resp.raise_for_status.return_value = None
        with patch.object(client.session, "get", return_value=mock_resp):
            df = client.get_serie("FGV12_INCCDI")
            assert len(df) == 0


class TestGetSerieByName:
    def test_incc(self, client, mock_response):
        with patch.object(client.session, "get", return_value=mock_response) as mock_get:
            client.get_serie_by_name("incc")
            url = mock_get.call_args[0][0]
            assert SERIES["incc"] in url

    def test_igpm(self, client, mock_response):
        with patch.object(client.session, "get", return_value=mock_response) as mock_get:
            client.get_serie_by_name("igpm")
            url = mock_get.call_args[0][0]
            assert SERIES["igpm"] in url

    def test_invalid(self, client):
        with pytest.raises(ValueError, match="não encontrada"):
            client.get_serie_by_name("nonsense")


class TestGetMetadados:
    def test_fields(self, client):
        mock_resp = MagicMock()
        mock_resp.json.return_value = {
            "SERCODIGO": "FGV12_INCCDI",
            "SERNOME": "INCC-DI",
            "SERFONTE": "FGV",
        }
        mock_resp.raise_for_status.return_value = None
        with patch.object(client.session, "get", return_value=mock_resp):
            result = client.get_metadados("FGV12_INCCDI")
            assert "SERCODIGO" in result


class TestBuscarSeries:
    def test_term(self, client):
        mock_resp = MagicMock()
        mock_resp.json.return_value = {
            "value": [
                {"SERCODIGO": "A", "SERNOME": "Construção civil", "SERFONTE": "FGV", "SERPERI": "Mensal"},
            ]
        }
        mock_resp.raise_for_status.return_value = None
        with patch.object(client.session, "get", return_value=mock_resp):
            df = client.buscar_series("construção")
            assert len(df) >= 1


class TestShortcuts:
    def test_get_incc(self, client, mock_response):
        with patch.object(client.session, "get", return_value=mock_response) as mock_get:
            client.get_incc()
            url = mock_get.call_args[0][0]
            assert SERIES["incc_mensal"] in url

    def test_get_igpm(self, client, mock_response):
        with patch.object(client.session, "get", return_value=mock_response) as mock_get:
            client.get_igpm()
            url = mock_get.call_args[0][0]
            assert SERIES["igpm_mensal"] in url


class TestErrorHandling:
    def test_api_error(self, client):
        mock_resp = MagicMock()
        mock_resp.raise_for_status.side_effect = Exception("500 Server Error")
        with patch.object(client.session, "get", return_value=mock_resp):
            with pytest.raises(Exception):
                client.get_serie("INVALID_SERIES")
