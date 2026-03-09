"""Tests for BCBClient (Banco Central do Brasil API client)."""

from datetime import date
from unittest.mock import patch, MagicMock

import pandas as pd
import pytest

from src.data_sources.bcb import BCBClient, SERIES


@pytest.fixture
def client():
    return BCBClient(timeout=5)


@pytest.fixture
def mock_response():
    """Mock requests.Session.get to return sample BCB data."""
    data = [
        {"data": "02/01/2024", "valor": "11.75"},
        {"data": "03/01/2024", "valor": "11.75"},
        {"data": "04/01/2024", "valor": "11.75"},
    ]
    mock_resp = MagicMock()
    mock_resp.json.return_value = data
    mock_resp.raise_for_status.return_value = None
    return mock_resp


class TestGetSerie:
    def test_returns_dataframe(self, client, mock_response):
        with patch.object(client.session, "get", return_value=mock_response):
            df = client.get_serie(11)
            assert isinstance(df, pd.DataFrame)
            assert "data" in df.columns
            assert "valor" in df.columns
            assert len(df) == 3

    def test_date_filter(self, client, mock_response):
        with patch.object(client.session, "get", return_value=mock_response) as mock_get:
            client.get_serie(11, data_inicio=date(2024, 1, 1), data_fim=date(2024, 6, 30))
            call_kwargs = mock_get.call_args
            params = call_kwargs.kwargs.get("params") or call_kwargs[1].get("params")
            assert "dataInicial" in params
            assert params["dataInicial"] == "01/01/2024"
            assert params["dataFinal"] == "30/06/2024"

    def test_empty_response(self, client):
        mock_resp = MagicMock()
        mock_resp.json.return_value = []
        mock_resp.raise_for_status.return_value = None
        with patch.object(client.session, "get", return_value=mock_resp):
            df = client.get_serie(11)
            assert isinstance(df, pd.DataFrame)
            assert len(df) == 0

    def test_api_timeout(self, client):
        with patch.object(client.session, "get", side_effect=Exception("Timeout")):
            with pytest.raises(Exception, match="Timeout"):
                client.get_serie(11)

    def test_api_500(self, client):
        mock_resp = MagicMock()
        mock_resp.raise_for_status.side_effect = Exception("500 Server Error")
        with patch.object(client.session, "get", return_value=mock_resp):
            with pytest.raises(Exception):
                client.get_serie(11)


class TestGetSerieByName:
    def test_selic(self, client, mock_response):
        with patch.object(client.session, "get", return_value=mock_response) as mock_get:
            client.get_serie_by_name("selic")
            url = mock_get.call_args[0][0]
            assert str(SERIES["selic"]) in url

    def test_ipca(self, client, mock_response):
        with patch.object(client.session, "get", return_value=mock_response) as mock_get:
            client.get_serie_by_name("ipca")
            url = mock_get.call_args[0][0]
            assert str(SERIES["ipca"]) in url

    def test_invalid_name(self, client):
        with pytest.raises(ValueError, match="não encontrada"):
            client.get_serie_by_name("invalid_series")


class TestShortcuts:
    def test_get_selic(self, client, mock_response):
        with patch.object(client.session, "get", return_value=mock_response) as mock_get:
            client.get_selic()
            url = mock_get.call_args[0][0]
            assert str(SERIES["selic"]) in url

    def test_get_ipca(self, client, mock_response):
        with patch.object(client.session, "get", return_value=mock_response) as mock_get:
            client.get_ipca()
            url = mock_get.call_args[0][0]
            assert str(SERIES["ipca"]) in url

    def test_get_igpm(self, client, mock_response):
        with patch.object(client.session, "get", return_value=mock_response) as mock_get:
            client.get_igpm()
            url = mock_get.call_args[0][0]
            assert str(SERIES["igpm"]) in url

    def test_get_taxa_financiamento(self, client, mock_response):
        with patch.object(client.session, "get", return_value=mock_response) as mock_get:
            client.get_taxa_financiamento()
            url = mock_get.call_args[0][0]
            assert str(SERIES["financiamento_imobiliario"]) in url


class TestCalcularAcumulado:
    def test_12_months(self, client):
        df = pd.DataFrame({
            "data": pd.date_range("2023-01-01", periods=12, freq="ME"),
            "valor": [0.5] * 12,
        })
        result = client.calcular_acumulado(df, 12)
        # (1.005)^12 - 1 ≈ 6.17%
        assert abs(result - 6.17) < 0.1

    def test_empty_df(self, client):
        df = pd.DataFrame({"data": [], "valor": []})
        result = client.calcular_acumulado(df, 12)
        assert result == 0.0  # prod of empty = 1, minus 1 = 0

    def test_single_row(self, client):
        df = pd.DataFrame({"data": [pd.Timestamp("2024-01-01")], "valor": [0.5]})
        result = client.calcular_acumulado(df, 12)
        assert abs(result - 0.5) < 0.01
