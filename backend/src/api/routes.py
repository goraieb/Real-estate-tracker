"""Endpoints FastAPI para o Real Estate Tracker.

API REST para consultar dados de mercado, calcular yield, benchmarks e CRUD de imóveis.
"""

import logging
from datetime import date
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from ..data_sources.bcb import BCBClient
from ..data_sources.ibge import IBGEClient
from ..data_sources.ipeadata import IpeadataClient
from ..database.db import init_db
from ..database.repository import ImovelRepository
from ..services.yield_calc import YieldService
from ..services.benchmark import BenchmarkService
from ..services.financing import FinancingService
from ..utils.sql_helpers import escape_like
from .market_routes import router as market_router
from .data_routes import router as data_router

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Real Estate Tracker API",
    description="API para análise de rentabilidade imobiliária no Brasil",
    version="0.2.0",
)

import os

cors_origins = os.environ.get(
    "CORS_ORIGINS", "http://localhost:5173,http://localhost:3000"
).split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instâncias dos serviços
bcb = BCBClient()
ibge = IBGEClient()
ipeadata = IpeadataClient()
yield_service = YieldService()
benchmark_service = BenchmarkService()
financing_service = FinancingService()
repo = ImovelRepository()


app.include_router(market_router)
app.include_router(data_router)


@app.on_event("startup")
async def startup():
    await init_db()


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


class ImovelCreate(BaseModel):
    nome: str
    tipo: str = "apartamento"
    logradouro: str = ""
    numero: str = ""
    bairro: str = ""
    cidade: str = "São Paulo"
    uf: str = "SP"
    cep: str = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    area_util: float
    quartos: int = 0
    vagas: int = 0
    andar: Optional[int] = None
    ano_construcao: Optional[int] = None
    valor_compra: float
    data_compra: str
    itbi_pago: float = 0
    custos_cartorio: float = 0
    comissao_corretor: float = 0
    valor_financiado: float = 0
    taxa_juros_anual: float = 0
    prazo_meses: int = 0
    banco: str = ""
    sistema: str = "SAC"
    saldo_devedor: float = 0
    iptu_anual: float = 0
    condominio_mensal: float = 0
    seguro_anual: float = 0
    manutencao_mensal: float = 0
    tipo_renda: str = "aluguel_longterm"
    aluguel_mensal: Optional[float] = None
    taxa_vacancia_pct: float = 0
    diaria_media: Optional[float] = None
    taxa_ocupacao_pct: Optional[float] = None
    custos_plataforma_pct: float = 3
    valor_atual_estimado: Optional[float] = None
    fonte_avaliacao: Optional[str] = None
    notas: str = ""


class ImovelUpdate(BaseModel):
    nome: Optional[str] = None
    tipo: Optional[str] = None
    logradouro: Optional[str] = None
    numero: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    uf: Optional[str] = None
    cep: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    area_util: Optional[float] = None
    quartos: Optional[int] = None
    vagas: Optional[int] = None
    andar: Optional[int] = None
    ano_construcao: Optional[int] = None
    valor_compra: Optional[float] = None
    data_compra: Optional[str] = None
    itbi_pago: Optional[float] = None
    custos_cartorio: Optional[float] = None
    comissao_corretor: Optional[float] = None
    valor_financiado: Optional[float] = None
    taxa_juros_anual: Optional[float] = None
    prazo_meses: Optional[int] = None
    banco: Optional[str] = None
    sistema: Optional[str] = None
    saldo_devedor: Optional[float] = None
    iptu_anual: Optional[float] = None
    condominio_mensal: Optional[float] = None
    seguro_anual: Optional[float] = None
    manutencao_mensal: Optional[float] = None
    tipo_renda: Optional[str] = None
    aluguel_mensal: Optional[float] = None
    taxa_vacancia_pct: Optional[float] = None
    diaria_media: Optional[float] = None
    taxa_ocupacao_pct: Optional[float] = None
    custos_plataforma_pct: Optional[float] = None
    valor_atual_estimado: Optional[float] = None
    fonte_avaliacao: Optional[str] = None
    notas: Optional[str] = None


# --- Endpoints: CRUD Imóveis ---


@app.post("/api/v1/imoveis", status_code=201)
async def criar_imovel(req: ImovelCreate):
    """Cria um novo imóvel."""
    data = req.model_dump(exclude_none=True)
    imovel = await repo.criar(data)
    return imovel


@app.get("/api/v1/imoveis")
async def listar_imoveis():
    """Lista todos os imóveis."""
    return await repo.listar()


@app.get("/api/v1/imoveis/{imovel_id}")
async def buscar_imovel(imovel_id: str):
    """Busca imóvel por ID."""
    imovel = await repo.buscar(imovel_id)
    if not imovel:
        raise HTTPException(status_code=404, detail="Imóvel não encontrado")
    return imovel


@app.put("/api/v1/imoveis/{imovel_id}")
async def atualizar_imovel(imovel_id: str, req: ImovelUpdate):
    """Atualiza um imóvel (PATCH-style: só campos presentes)."""
    existing = await repo.buscar(imovel_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Imóvel não encontrado")
    data = req.model_dump(exclude_none=True)
    imovel = await repo.atualizar(imovel_id, data)
    return imovel


@app.delete("/api/v1/imoveis/{imovel_id}")
async def deletar_imovel(imovel_id: str):
    """Deleta um imóvel."""
    deleted = await repo.deletar(imovel_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Imóvel não encontrado")
    return {"ok": True}


@app.get("/api/v1/imoveis/{imovel_id}/yield")
async def calcular_yield_imovel(imovel_id: str):
    """Calcula yield do imóvel a partir dos dados cadastrados."""
    imovel = await repo.buscar(imovel_id)
    if not imovel:
        raise HTTPException(status_code=404, detail="Imóvel não encontrado")

    valor = imovel.get("valor_atual_estimado") or imovel["valor_compra"]

    if imovel.get("tipo_renda") == "airbnb" and imovel.get("diaria_media"):
        return yield_service.yield_airbnb(
            valor_imovel=valor,
            diaria_media=imovel["diaria_media"],
            taxa_ocupacao_pct=imovel.get("taxa_ocupacao_pct", 50),
            custos_fixos_mensal=imovel.get("condominio_mensal", 0) + imovel.get("iptu_anual", 0) / 12,
            taxa_plataforma_pct=imovel.get("custos_plataforma_pct", 3),
        )

    if imovel.get("aluguel_mensal"):
        return yield_service.yield_liquido(
            valor_imovel=valor,
            aluguel_mensal=imovel["aluguel_mensal"],
            iptu_anual=imovel.get("iptu_anual", 0),
            condominio_mensal=imovel.get("condominio_mensal", 0),
            seguro_anual=imovel.get("seguro_anual", 0),
            manutencao_mensal=imovel.get("manutencao_mensal", 0),
            vacancia_pct=imovel.get("taxa_vacancia_pct", 0),
        )

    return {"yield_bruto": 0, "yield_liquido": 0, "message": "Dados de renda não cadastrados"}


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
    except (ValueError, IndexError):
        raise HTTPException(status_code=400, detail="Invalid date format. Use dd/mm/yyyy")
    except Exception as e:
        logger.error(f"BCB serie query failed: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


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


# --- Endpoints: Financiamento ---


class FinanciamentoRequest(BaseModel):
    valor_imovel: float
    valor_entrada: float
    taxa_juros_anual: float
    prazo_meses: int
    sistema: str = "SAC"


class OportunidadeRequest(BaseModel):
    valor_imovel: float
    valor_entrada: float
    taxa_juros_anual: float
    prazo_meses: int
    taxa_rendimento_anual: float


@app.post("/api/v1/financiamento/simular")
def simular_financiamento(req: FinanciamentoRequest):
    """Simula financiamento com tabela SAC ou PRICE."""
    valor_financiado = req.valor_imovel - req.valor_entrada
    if req.sistema.upper() == "PRICE":
        return financing_service.tabela_price(valor_financiado, req.taxa_juros_anual, req.prazo_meses)
    return financing_service.tabela_sac(valor_financiado, req.taxa_juros_anual, req.prazo_meses)


@app.post("/api/v1/financiamento/comparar")
def comparar_financiamento(req: FinanciamentoRequest):
    """Compara SAC vs PRICE."""
    valor_financiado = req.valor_imovel - req.valor_entrada
    return financing_service.comparar_sac_price(valor_financiado, req.taxa_juros_anual, req.prazo_meses)


@app.post("/api/v1/financiamento/oportunidade")
def oportunidade_financiamento(req: OportunidadeRequest):
    """Compara compra à vista vs financiada."""
    return financing_service.avista_vs_financiado(
        req.valor_imovel, req.valor_entrada,
        req.taxa_juros_anual, req.prazo_meses,
        req.taxa_rendimento_anual,
    )


# --- Health check ---


@app.get("/api/v1/imoveis/{imovel_id}/market-comparison")
async def market_comparison(imovel_id: str):
    """Compare a portfolio property against its neighborhood market data.

    Cross-joins: imoveis + transacoes_itbi (same bairro, last 6 months) + indicadores_economicos.
    Returns: user metrics vs bairro median, spread vs Selic.
    """
    import aiosqlite
    from ..database.db import DB_PATH
    from ..services.indicators_helper import get_latest_indicator

    imovel = await repo.buscar(imovel_id)
    if not imovel:
        raise HTTPException(status_code=404, detail="Imóvel não encontrado")

    bairro = imovel.get("bairro", "")
    if not bairro:
        raise HTTPException(status_code=400, detail="Imóvel sem bairro cadastrado")

    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        # Neighborhood stats from last 6 months
        cursor = await db.execute(
            """SELECT AVG(preco_m2) as preco_m2_medio,
                      COUNT(*) as qtd_transacoes,
                      MIN(preco_m2) as preco_m2_min,
                      MAX(preco_m2) as preco_m2_max
            FROM transacoes_itbi
            WHERE bairro LIKE ? ESCAPE '\\' AND preco_m2 BETWEEN 500 AND 150000
                  AND data_transacao >= date('now', '-6 months')""",
            (f"%{escape_like(bairro)}%",),
        )
        bairro_stats = await cursor.fetchone()

        # User's price/m2
        area = imovel.get("area_util", 0)
        valor = imovel.get("valor_atual_estimado") or imovel.get("valor_compra", 0)
        user_preco_m2 = valor / area if area > 0 else 0

        # User's yield
        user_yield = 0
        if imovel.get("tipo_renda") == "airbnb" and imovel.get("diaria_media") and imovel.get("taxa_ocupacao_pct"):
            receita_anual = imovel["diaria_media"] * 365 * (imovel["taxa_ocupacao_pct"] / 100)
            user_yield = (receita_anual / valor * 100) if valor > 0 else 0
        elif imovel.get("aluguel_mensal") and valor > 0:
            user_yield = (imovel["aluguel_mensal"] * 12 / valor) * 100

        # Selic for spread
        selic = await get_latest_indicator(db, "bcb", "selic") or 0

        bairro_preco = bairro_stats["preco_m2_medio"] if bairro_stats and bairro_stats["preco_m2_medio"] else 0

        return {
            "imovel": {
                "id": imovel_id,
                "nome": imovel.get("nome"),
                "bairro": bairro,
                "precoM2": round(user_preco_m2, 2),
                "yieldBrutoPct": round(user_yield, 2),
                "spreadVsSelicPp": round(user_yield - selic, 2),
            },
            "bairro": {
                "precoM2Medio": round(bairro_preco, 2) if bairro_preco else None,
                "precoM2Min": round(bairro_stats["preco_m2_min"], 2) if bairro_stats and bairro_stats["preco_m2_min"] else None,
                "precoM2Max": round(bairro_stats["preco_m2_max"], 2) if bairro_stats and bairro_stats["preco_m2_max"] else None,
                "qtdTransacoes": bairro_stats["qtd_transacoes"] if bairro_stats else 0,
            },
            "comparison": {
                "precoM2VsBairro": round(((user_preco_m2 / bairro_preco) - 1) * 100, 2) if bairro_preco and user_preco_m2 else None,
                "status": (
                    "above_market" if user_preco_m2 > bairro_preco * 1.1
                    else "below_market" if user_preco_m2 < bairro_preco * 0.9
                    else "at_market"
                ) if bairro_preco and user_preco_m2 else "unknown",
            },
            "benchmarks": {
                "selicAnual": selic,
            },
        }
    finally:
        await db.close()


@app.get("/api/v1/imoveis/{imovel_id}/opportunity-cost")
async def opportunity_cost(imovel_id: str):
    """Calculate opportunity cost: what if you'd invested in CDI/IFIX instead?

    Cross-joins: imoveis (data_compra, valor_compra) + indicadores_economicos (ifix, cdi).
    Returns counterfactual portfolio values.
    """
    import aiosqlite
    from ..database.db import DB_PATH
    from ..services.indicators_helper import get_indicator_series

    imovel = await repo.buscar(imovel_id)
    if not imovel:
        raise HTTPException(status_code=404, detail="Imóvel não encontrado")

    data_compra = imovel.get("data_compra")
    valor_compra = imovel.get("valor_compra", 0)
    valor_atual = imovel.get("valor_atual_estimado") or valor_compra

    if not data_compra or valor_compra <= 0:
        raise HTTPException(status_code=400, detail="Imóvel sem data de compra ou valor")

    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        # Get IFIX series from purchase date
        ifix_series = await get_indicator_series(db, "b3", "ifix", start_date=data_compra)

        # Get CDI/Selic series from purchase date
        selic_series = await get_indicator_series(db, "bcb", "selic", start_date=data_compra)

        # Calculate IFIX counterfactual
        ifix_result = None
        if len(ifix_series) >= 2:
            ifix_start = ifix_series[0]["valor"]
            ifix_end = ifix_series[-1]["valor"]
            if ifix_start > 0:
                ifix_return = (ifix_end / ifix_start - 1)
                ifix_counterfactual = valor_compra * (1 + ifix_return)
                ifix_result = {
                    "valorContrafactual": round(ifix_counterfactual, 2),
                    "retornoPct": round(ifix_return * 100, 2),
                    "ganho": round(ifix_counterfactual - valor_compra, 2),
                }

        # Calculate CDI counterfactual (compound monthly from Selic series)
        cdi_result = None
        if selic_series:
            from datetime import datetime
            try:
                dt_compra = datetime.strptime(data_compra[:10], "%Y-%m-%d")
                dt_now = datetime.now()
                years = (dt_now - dt_compra).days / 365.25
                if years > 0:
                    # Compound month-by-month using actual Selic rates
                    cdi_bruto = valor_compra
                    for entry in selic_series:
                        taxa_mensal = (1 + entry["valor"] / 100) ** (1 / 12) - 1
                        cdi_bruto *= (1 + taxa_mensal)

                    ir_rate = 0.15 if years > 2 else 0.175 if years > 1 else 0.20 if years > 0.5 else 0.225
                    ganho_bruto = cdi_bruto - valor_compra
                    ganho_liquido = ganho_bruto * (1 - ir_rate)
                    cdi_counterfactual = valor_compra + ganho_liquido
                    cdi_result = {
                        "valorContrafactual": round(cdi_counterfactual, 2),
                        "retornoBrutoPct": round(((cdi_bruto / valor_compra) - 1) * 100, 2),
                        "retornoLiquidoPct": round((ganho_liquido / valor_compra) * 100, 2),
                        "ganhoLiquido": round(ganho_liquido, 2),
                        "irPct": ir_rate * 100,
                    }
            except (ValueError, TypeError):
                pass

        # Real estate actual return
        re_return = ((valor_atual / valor_compra) - 1) * 100 if valor_compra > 0 else 0

        # Add rental income to RE return if available
        rental_income_total = 0
        rental_income_net = 0
        if imovel.get("aluguel_mensal") and data_compra:
            try:
                from datetime import datetime
                dt_compra = datetime.strptime(data_compra[:10], "%Y-%m-%d")
                months_held = max(1, (datetime.now() - dt_compra).days / 30.44)
                rental_income_total = imovel["aluguel_mensal"] * months_held
                # Apply simplified rental income tax (carnê-leão avg effective rate ~15%)
                RENTAL_IR_RATE = 0.15
                rental_income_net = rental_income_total * (1 - RENTAL_IR_RATE)
            except (ValueError, TypeError):
                pass

        re_total_pct = re_return + (rental_income_net / valor_compra * 100 if valor_compra else 0)

        return {
            "imovel": {
                "id": imovel_id,
                "nome": imovel.get("nome"),
                "dataCompra": data_compra,
                "valorCompra": valor_compra,
                "valorAtual": valor_atual,
                "retornoCapitalPct": round(re_return, 2),
                "rendaAluguelBruta": round(rental_income_total, 2),
                "rendaAluguelLiquida": round(rental_income_net, 2),
                "retornoTotalPct": round(re_total_pct, 2),
            },
            "counterfactuals": {
                "cdi": cdi_result,
                "ifix": ifix_result,
            },
            "verdict": {
                "melhorOpcao": (
                    "imovel" if (
                        re_total_pct > (cdi_result["retornoLiquidoPct"] if cdi_result else 0)
                    ) else "cdi"
                ),
            },
        }
    finally:
        await db.close()


@app.get("/health")
def health():
    return {"status": "ok", "version": "0.2.0"}


# --- Serve frontend static files ---

FRONTEND_DIST = Path(__file__).parent.parent.parent.parent / "frontend" / "dist"

if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="static")

    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        """Serve the React SPA for any non-API route."""
        file_path = FRONTEND_DIST / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(FRONTEND_DIST / "index.html")
