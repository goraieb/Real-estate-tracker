"""API integration tests for all FastAPI endpoints."""

import pytest
import pytest_asyncio
import aiosqlite
from pathlib import Path
from unittest.mock import patch, MagicMock, AsyncMock

import pandas as pd
from httpx import AsyncClient, ASGITransport

from src.api.routes import app, repo
from src.database.db import SCHEMA_PATH


# --- Fixtures ---

@pytest_asyncio.fixture
async def test_db():
    """Create in-memory DB and patch get_db to use it."""
    conn = await aiosqlite.connect(":memory:")
    conn.row_factory = aiosqlite.Row
    schema = SCHEMA_PATH.read_text()
    await conn.executescript(schema)
    yield conn
    await conn.close()


@pytest_asyncio.fixture
async def client(test_db):
    """AsyncClient with injected DB into global repo."""
    # Inject DB directly so repo won't close it after each operation
    old_db = repo._db
    repo._db = test_db

    with patch("src.api.routes.init_db", new_callable=AsyncMock):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            yield c

    repo._db = old_db


SAMPLE_CREATE = {
    "nome": "Apto Teste",
    "tipo": "apartamento",
    "area_util": 65.0,
    "valor_compra": 500000.0,
    "data_compra": "2024-01-15",
    "aluguel_mensal": 2500.0,
    "bairro": "Vila Mariana",
    "cidade": "São Paulo",
    "uf": "SP",
    "iptu_anual": 2400.0,
    "condominio_mensal": 800.0,
}


# --- Health ---

class TestHealth:
    @pytest.mark.asyncio
    async def test_health_endpoint(self, client):
        resp = await client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"


# --- CRUD ---

class TestCRUD:
    @pytest.mark.asyncio
    async def test_create_imovel(self, client):
        resp = await client.post("/api/v1/imoveis", json=SAMPLE_CREATE)
        assert resp.status_code == 201
        data = resp.json()
        assert data["id"] is not None
        assert data["nome"] == "Apto Teste"

    @pytest.mark.asyncio
    async def test_create_minimal(self, client):
        minimal = {
            "nome": "Terreno",
            "area_util": 300.0,
            "valor_compra": 200000.0,
            "data_compra": "2024-06-01",
        }
        resp = await client.post("/api/v1/imoveis", json=minimal)
        assert resp.status_code == 201

    @pytest.mark.asyncio
    async def test_create_validation_error(self, client):
        resp = await client.post("/api/v1/imoveis", json={"tipo": "apartamento"})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_list_empty(self, client):
        resp = await client.get("/api/v1/imoveis")
        assert resp.status_code == 200
        assert resp.json() == []

    @pytest.mark.asyncio
    async def test_list_multiple(self, client):
        for i in range(3):
            await client.post("/api/v1/imoveis", json={**SAMPLE_CREATE, "nome": f"Apto {i}"})
        resp = await client.get("/api/v1/imoveis")
        assert resp.status_code == 200
        assert len(resp.json()) == 3

    @pytest.mark.asyncio
    async def test_get_by_id(self, client):
        create_resp = await client.post("/api/v1/imoveis", json=SAMPLE_CREATE)
        imovel_id = create_resp.json()["id"]
        resp = await client.get(f"/api/v1/imoveis/{imovel_id}")
        assert resp.status_code == 200
        assert resp.json()["nome"] == "Apto Teste"

    @pytest.mark.asyncio
    async def test_get_not_found(self, client):
        resp = await client.get("/api/v1/imoveis/nonexistent-id")
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_update(self, client):
        create_resp = await client.post("/api/v1/imoveis", json=SAMPLE_CREATE)
        imovel_id = create_resp.json()["id"]

        resp = await client.put(
            f"/api/v1/imoveis/{imovel_id}",
            json={"nome": "Apto Renovado", "aluguel_mensal": 3000.0},
        )
        assert resp.status_code == 200
        assert resp.json()["nome"] == "Apto Renovado"
        assert resp.json()["aluguel_mensal"] == 3000.0

    @pytest.mark.asyncio
    async def test_update_partial(self, client):
        create_resp = await client.post("/api/v1/imoveis", json=SAMPLE_CREATE)
        imovel_id = create_resp.json()["id"]

        resp = await client.put(
            f"/api/v1/imoveis/{imovel_id}",
            json={"notas": "Boa localização"},
        )
        assert resp.status_code == 200
        assert resp.json()["notas"] == "Boa localização"
        assert resp.json()["nome"] == "Apto Teste"  # unchanged

    @pytest.mark.asyncio
    async def test_update_not_found(self, client):
        resp = await client.put("/api/v1/imoveis/bad-id", json={"nome": "X"})
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_delete(self, client):
        create_resp = await client.post("/api/v1/imoveis", json=SAMPLE_CREATE)
        imovel_id = create_resp.json()["id"]

        del_resp = await client.delete(f"/api/v1/imoveis/{imovel_id}")
        assert del_resp.status_code == 200

        get_resp = await client.get(f"/api/v1/imoveis/{imovel_id}")
        assert get_resp.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_not_found(self, client):
        resp = await client.delete("/api/v1/imoveis/bad-id")
        assert resp.status_code == 404


# --- Yield ---

class TestYieldEndpoints:
    @pytest.mark.asyncio
    async def test_yield_longterm(self, client):
        resp = await client.post("/api/v1/yield/longterm", json={
            "valor_imovel": 500000,
            "aluguel_mensal": 2500,
            "iptu_anual": 2400,
            "condominio_mensal": 800,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "yield_bruto" in data
        assert "yield_liquido" in data

    @pytest.mark.asyncio
    async def test_yield_airbnb(self, client):
        resp = await client.post("/api/v1/yield/airbnb", json={
            "valor_imovel": 500000,
            "diaria_media": 300,
            "taxa_ocupacao_pct": 70,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["yield_bruto"] > 0

    @pytest.mark.asyncio
    async def test_yield_stored_imovel(self, client):
        create_resp = await client.post("/api/v1/imoveis", json=SAMPLE_CREATE)
        imovel_id = create_resp.json()["id"]

        resp = await client.get(f"/api/v1/imoveis/{imovel_id}/yield")
        assert resp.status_code == 200
        data = resp.json()
        assert "yield_bruto" in data

    @pytest.mark.asyncio
    async def test_yield_imovel_not_found(self, client):
        resp = await client.get("/api/v1/imoveis/bad-id/yield")
        assert resp.status_code == 404


# --- Financing ---

class TestFinancingEndpoints:
    @pytest.mark.asyncio
    async def test_simular_sac(self, client):
        resp = await client.post("/api/v1/financiamento/simular", json={
            "valor_imovel": 500000,
            "valor_entrada": 100000,
            "taxa_juros_anual": 10.0,
            "prazo_meses": 360,
            "sistema": "SAC",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "tabela" in data
        assert data["resumo"]["sistema"] == "SAC"

    @pytest.mark.asyncio
    async def test_simular_price(self, client):
        resp = await client.post("/api/v1/financiamento/simular", json={
            "valor_imovel": 500000,
            "valor_entrada": 100000,
            "taxa_juros_anual": 10.0,
            "prazo_meses": 360,
            "sistema": "PRICE",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["resumo"]["sistema"] == "PRICE"

    @pytest.mark.asyncio
    async def test_comparar(self, client):
        resp = await client.post("/api/v1/financiamento/comparar", json={
            "valor_imovel": 500000,
            "valor_entrada": 100000,
            "taxa_juros_anual": 10.0,
            "prazo_meses": 360,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "economia_sac" in data
        assert "recomendacao" in data

    @pytest.mark.asyncio
    async def test_oportunidade(self, client):
        resp = await client.post("/api/v1/financiamento/oportunidade", json={
            "valor_imovel": 500000,
            "valor_entrada": 100000,
            "taxa_juros_anual": 10.0,
            "prazo_meses": 360,
            "taxa_rendimento_anual": 13.0,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "projecao" in data
        assert len(data["projecao"]) > 0


# --- CORS ---

class TestCORS:
    @pytest.mark.asyncio
    async def test_allowed_origin(self, client):
        resp = await client.options(
            "/health",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET",
            },
        )
        assert "access-control-allow-origin" in resp.headers

    @pytest.mark.asyncio
    async def test_disallowed_origin(self, client):
        resp = await client.options(
            "/health",
            headers={
                "Origin": "http://evil.com",
                "Access-Control-Request-Method": "GET",
            },
        )
        # FastAPI CORS middleware won't add the header for disallowed origins
        allow_origin = resp.headers.get("access-control-allow-origin", "")
        assert "evil.com" not in allow_origin
