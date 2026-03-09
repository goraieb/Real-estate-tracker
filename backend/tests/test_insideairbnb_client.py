"""Tests for InsideAirbnbClient."""

import io
import gzip

import pandas as pd
import pytest

from src.data_sources.insideairbnb import InsideAirbnbClient, LISTING_COLUMNS


@pytest.fixture
def client(tmp_path):
    return InsideAirbnbClient(data_dir=tmp_path, timeout=5)


@pytest.fixture
def sample_listings_gz(tmp_path):
    """Create a sample listings.csv.gz file."""
    csv_content = (
        "id,name,neighbourhood_cleansed,latitude,longitude,room_type,price,"
        "minimum_nights,number_of_reviews,reviews_per_month,availability_365,"
        "calculated_host_listings_count\n"
        '1,"Cozy Apt",Copacabana,-22.97,-43.18,Entire home/apt,"$250.00",'
        "2,45,3.5,120,1\n"
        '2,"Beach View",Copacabana,-22.96,-43.17,Entire home/apt,"$300.00",'
        "3,30,2.1,200,2\n"
        '3,"Centro Studio",Centro,-22.90,-43.17,Private room,"$100.00",'
        "1,100,5.0,300,3\n"
        '4,"Ipanema Lux",Ipanema,-22.98,-43.20,Entire home/apt,"$500.00",'
        "5,10,0.8,50,1\n"
    )
    filepath = tmp_path / "test_listings.csv.gz"
    with gzip.open(filepath, "wb") as f:
        f.write(csv_content.encode("utf-8"))
    return filepath


class TestParseListings:
    def test_columns(self, client, sample_listings_gz):
        df = client.parse_listings(sample_listings_gz)
        for col in ["id", "name", "neighbourhood_cleansed", "price"]:
            assert col in df.columns

    def test_price_numeric(self, client, sample_listings_gz):
        df = client.parse_listings(sample_listings_gz)
        assert pd.api.types.is_numeric_dtype(df["price"])
        assert df["price"].iloc[0] == 250.0
        assert df["price"].iloc[3] == 500.0


class TestEstatisticasBairro:
    def test_groupby(self, client, sample_listings_gz):
        df = client.parse_listings(sample_listings_gz)
        stats = client.get_estatisticas_bairro(df)
        assert "bairro" in stats.columns
        bairros = stats["bairro"].tolist()
        assert "Copacabana" in bairros

    def test_columns(self, client, sample_listings_gz):
        df = client.parse_listings(sample_listings_gz)
        stats = client.get_estatisticas_bairro(df)
        expected_cols = {"bairro", "preco_medio", "preco_mediano", "qtd_listings"}
        assert expected_cols.issubset(set(stats.columns))


class TestEstimarReceitaMensal:
    def test_typical(self, client):
        result = client.estimar_receita_mensal(200, 70)
        # 200 * 30 * 0.7 = 4200
        assert abs(result - 4200) < 1

    def test_zero_occupancy(self, client):
        result = client.estimar_receita_mensal(200, 0)
        assert result == 0

    def test_full_occupancy(self, client):
        result = client.estimar_receita_mensal(200, 100)
        # 200 * 30 = 6000
        assert abs(result - 6000) < 1


class TestCidadesDisponiveis:
    def test_returns_dict(self):
        cities = InsideAirbnbClient.cidades_disponiveis()
        assert isinstance(cities, dict)
        assert "sao-paulo" in cities
        assert "rio-de-janeiro" in cities
