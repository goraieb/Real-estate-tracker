"""Tests for the imoveis CRUD operations."""

import pytest
import pytest_asyncio
import aiosqlite
from pathlib import Path

from src.database.db import SCHEMA_PATH
from src.database.repository import ImovelRepository


@pytest_asyncio.fixture
async def db():
    """Create an in-memory database with schema applied."""
    conn = await aiosqlite.connect(":memory:")
    conn.row_factory = aiosqlite.Row
    schema = SCHEMA_PATH.read_text()
    await conn.executescript(schema)
    yield conn
    await conn.close()


@pytest.fixture
def repo(db):
    return ImovelRepository(db=db)


SAMPLE_IMOVEL = {
    "nome": "Apto Vila Mariana",
    "tipo": "apartamento",
    "bairro": "Vila Mariana",
    "cidade": "São Paulo",
    "uf": "SP",
    "area_util": 65.0,
    "quartos": 2,
    "vagas": 1,
    "valor_compra": 550000.0,
    "data_compra": "2024-01-15",
    "iptu_anual": 2400.0,
    "condominio_mensal": 800.0,
    "aluguel_mensal": 3200.0,
    "tipo_renda": "aluguel_longterm",
    "taxa_vacancia_pct": 5.0,
}


@pytest.mark.asyncio
async def test_criar_imovel(repo):
    imovel = await repo.criar(SAMPLE_IMOVEL)
    assert imovel is not None
    assert imovel["id"] is not None
    assert imovel["nome"] == "Apto Vila Mariana"
    assert imovel["area_util"] == 65.0
    assert imovel["valor_compra"] == 550000.0
    assert imovel["criado_em"] is not None


@pytest.mark.asyncio
async def test_listar_imoveis(repo):
    await repo.criar(SAMPLE_IMOVEL)
    await repo.criar({**SAMPLE_IMOVEL, "nome": "Apto Moema", "bairro": "Moema"})

    imoveis = await repo.listar()
    assert len(imoveis) == 2
    nomes = {i["nome"] for i in imoveis}
    assert "Apto Vila Mariana" in nomes
    assert "Apto Moema" in nomes


@pytest.mark.asyncio
async def test_buscar_imovel(repo):
    criado = await repo.criar(SAMPLE_IMOVEL)
    encontrado = await repo.buscar(criado["id"])
    assert encontrado is not None
    assert encontrado["id"] == criado["id"]
    assert encontrado["nome"] == "Apto Vila Mariana"


@pytest.mark.asyncio
async def test_buscar_inexistente(repo):
    result = await repo.buscar("id-que-nao-existe")
    assert result is None


@pytest.mark.asyncio
async def test_atualizar_imovel(repo):
    criado = await repo.criar(SAMPLE_IMOVEL)

    atualizado = await repo.atualizar(criado["id"], {
        "aluguel_mensal": 3500.0,
        "nome": "Apto Vila Mariana Renovado",
    })

    assert atualizado["aluguel_mensal"] == 3500.0
    assert atualizado["nome"] == "Apto Vila Mariana Renovado"
    # Unchanged fields preserved
    assert atualizado["area_util"] == 65.0
    assert atualizado["valor_compra"] == 550000.0


@pytest.mark.asyncio
async def test_atualizar_vazio(repo):
    criado = await repo.criar(SAMPLE_IMOVEL)
    result = await repo.atualizar(criado["id"], {})
    assert result["nome"] == "Apto Vila Mariana"


@pytest.mark.asyncio
async def test_deletar_imovel(repo):
    criado = await repo.criar(SAMPLE_IMOVEL)
    deleted = await repo.deletar(criado["id"])
    assert deleted is True

    encontrado = await repo.buscar(criado["id"])
    assert encontrado is None


@pytest.mark.asyncio
async def test_deletar_inexistente(repo):
    deleted = await repo.deletar("id-que-nao-existe")
    assert deleted is False


@pytest.mark.asyncio
async def test_campos_opcionais(repo):
    """Minimal creation with only required fields."""
    minimal = {
        "nome": "Terreno",
        "area_util": 300.0,
        "valor_compra": 200000.0,
        "data_compra": "2024-06-01",
    }
    imovel = await repo.criar(minimal)
    assert imovel["nome"] == "Terreno"
    assert imovel["tipo"] == "apartamento"  # default
    assert imovel["iptu_anual"] == 0  # default
    assert imovel["aluguel_mensal"] is None  # nullable


@pytest.mark.asyncio
async def test_criar_airbnb(repo):
    airbnb_data = {
        **SAMPLE_IMOVEL,
        "nome": "Studio Airbnb",
        "tipo_renda": "airbnb",
        "aluguel_mensal": None,
        "diaria_media": 250.0,
        "taxa_ocupacao_pct": 65.0,
        "custos_plataforma_pct": 3.0,
    }
    imovel = await repo.criar(airbnb_data)
    assert imovel["tipo_renda"] == "airbnb"
    assert imovel["diaria_media"] == 250.0
    assert imovel["taxa_ocupacao_pct"] == 65.0
