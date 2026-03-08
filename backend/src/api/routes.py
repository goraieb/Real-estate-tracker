"""Endpoints FastAPI para o Real Estate Tracker.

API REST para consultar dados de mercado, calcular yield e benchmarks.
"""

from datetime import date
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel

from ..data_sources.bcb import BCBClient
from ..data_sources.ibge import IBGEClient
from ..data_sources.ipeadata import IpeadataClient
from ..services.yield_calc import YieldService
from ..services.benchmark import BenchmarkService

app = FastAPI(
    title="Real Estate Tracker API",
    description="API para análise de rentabilidade imobiliária no Brasil",
    version="0.1.0",
)

# Instâncias dos serviços
bcb = BCBClient()
ibge = IBGEClient()
ipeadata = IpeadataClient()
yield_service = YieldService()
benchmark_service = BenchmarkService()


# --- Schemas ---


class YieldRequest(BaseModel):
    valor_imovel: float
    aluguel_mensal: float
    iptu_anual: float = 0
    condominio_mensal: float = 0
    seguro_anual: float = 0
    manutencao_mensal: float = 0
    taxa_administracao_pct: float = 0
    vacancia_pct: float = 0


class AirbnbYieldRequest(BaseModel):
    valor_imovel: float
    diaria_media: float
    taxa_ocupacao_pct: float
    custos_fixos_mensal: float = 0
    taxa_plataforma_pct: float = 3
    custos_limpeza_por_estadia: float = 0
    media_noites_por_estadia: float = 3


# --- Endpoints: Dados de Mercado ---


@app.get("/api/v1/bcb/serie/{codigo}")
def get_bcb_serie(
    codigo: int,
    data_inicio: Optional[str] = Query(None, description="dd/mm/yyyy"),
    data_fim: Optional[str] = Query(None, description="dd/mm/yyyy"),
):
    """Busca série temporal do Banco Central."""
    try:
        inicio = (
            date(
                int(data_inicio.split("/")[2]),
                int(data_inicio.split("/")[1]),
                int(data_inicio.split("/")[0]),
            )
            if data_inicio
            else None
        )
        fim = (
            date(
                int(data_fim.split("/")[2]),
                int(data_fim.split("/")[1]),
                int(data_fim.split("/")[0]),
            )
            if data_fim
            else None
        )
        df = bcb.get_serie(codigo, inicio, fim)
        return df.to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/bcb/{nome}")
def get_bcb_serie_by_name(nome: str):
    """Busca série BCB por nome (selic, ipca, igpm, incc, cdi, financiamento_imobiliario)."""
    try:
        df = bcb.get_serie_by_name(nome)
        return {
            "serie": nome,
            "total_registros": len(df),
            "ultimo_valor": df["valor"].iloc[-1] if not df.empty else None,
            "ultima_data": str(df["data"].iloc[-1]) if not df.empty else None,
            "dados_recentes": df.tail(12).to_dict(orient="records"),
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/v1/ibge/municipios/{uf}")
def get_municipios(uf: str):
    """Lista municípios de um estado."""
    df = ibge.get_municipios(uf.upper())
    return {"uf": uf.upper(), "total": len(df), "municipios": df.to_dict(orient="records")}


@app.get("/api/v1/ibge/populacao/{cod_municipio}")
def get_populacao(cod_municipio: str):
    """Busca população de um município (Censo 2022)."""
    df = ibge.get_populacao(cod_municipio)
    if df.empty:
        raise HTTPException(status_code=404, detail="Município não encontrado")
    return df.to_dict(orient="records")[0]


# --- Endpoints: Cálculos ---


@app.post("/api/v1/yield/longterm")
def calcular_yield_longterm(req: YieldRequest):
    """Calcula yield de aluguel long-term."""
    return yield_service.yield_liquido(
        valor_imovel=req.valor_imovel,
        aluguel_mensal=req.aluguel_mensal,
        iptu_anual=req.iptu_anual,
        condominio_mensal=req.condominio_mensal,
        seguro_anual=req.seguro_anual,
        manutencao_mensal=req.manutencao_mensal,
        taxa_administracao_pct=req.taxa_administracao_pct,
        vacancia_pct=req.vacancia_pct,
    )


@app.post("/api/v1/yield/airbnb")
def calcular_yield_airbnb(req: AirbnbYieldRequest):
    """Calcula yield de Airbnb."""
    return yield_service.yield_airbnb(
        valor_imovel=req.valor_imovel,
        diaria_media=req.diaria_media,
        taxa_ocupacao_pct=req.taxa_ocupacao_pct,
        custos_fixos_mensal=req.custos_fixos_mensal,
        taxa_plataforma_pct=req.taxa_plataforma_pct,
        custos_limpeza_por_estadia=req.custos_limpeza_por_estadia,
        media_noites_por_estadia=req.media_noites_por_estadia,
    )


@app.get("/api/v1/benchmark")
def get_benchmarks():
    """Retorna benchmarks atuais (Selic, IPCA, IGP-M, poupança)."""
    return benchmark_service.get_benchmarks_atuais()


@app.get("/api/v1/benchmark/comparar")
def comparar_benchmark(
    yield_imovel: float = Query(..., description="Yield líquido do imóvel em % a.a."),
):
    """Compara yield do imóvel com renda fixa."""
    return benchmark_service.comparar_com_renda_fixa(yield_imovel)


# --- Health check ---


@app.get("/health")
def health():
    return {"status": "ok", "version": "0.1.0"}
