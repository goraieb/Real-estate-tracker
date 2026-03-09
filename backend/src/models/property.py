"""Modelo de dados para imóveis no Real Estate Tracker.

Define as estruturas de dados (dataclasses) para representar imóveis,
transações e métricas de rentabilidade.
"""

from dataclasses import dataclass, field
from datetime import date, datetime
from enum import Enum
from typing import Optional


class TipoImovel(str, Enum):
    APARTAMENTO = "apartamento"
    CASA = "casa"
    COMERCIAL = "comercial"
    TERRENO = "terreno"
    SALA = "sala"
    LOJA = "loja"
    GALPAO = "galpao"


class TipoRenda(str, Enum):
    ALUGUEL_LONGTERM = "aluguel_longterm"
    AIRBNB = "airbnb"
    MISTO = "misto"


@dataclass
class Endereco:
    logradouro: str
    numero: str = ""
    complemento: str = ""
    bairro: str = ""
    cidade: str = ""
    uf: str = ""
    cep: str = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    @property
    def endereco_completo(self) -> str:
        parts = [self.logradouro]
        if self.numero:
            parts.append(self.numero)
        if self.bairro:
            parts.append(f"- {self.bairro}")
        parts.append(f"- {self.cidade}/{self.uf}")
        return ", ".join(parts)


@dataclass
class DadosCompra:
    valor_compra: float
    data_compra: date
    valor_escritura: Optional[float] = None  # Pode diferir do valor real pago
    itbi_pago: Optional[float] = None
    custos_cartorio: Optional[float] = None
    comissao_corretor: Optional[float] = None

    @property
    def custo_total_aquisicao(self) -> float:
        """Custo total de aquisição incluindo impostos e taxas."""
        extras = sum(
            v or 0
            for v in [self.itbi_pago, self.custos_cartorio, self.comissao_corretor]
        )
        return self.valor_compra + extras


@dataclass
class DadosFinanciamento:
    valor_financiado: float
    taxa_juros_anual: float  # % a.a.
    prazo_meses: int
    banco: str = ""
    sistema: str = "SAC"  # SAC ou PRICE
    saldo_devedor: Optional[float] = None

    @property
    def valor_entrada(self) -> float:
        return 0  # Calculado externamente com base no valor de compra


@dataclass
class CustosRecorrentes:
    iptu_anual: float = 0
    condominio_mensal: float = 0
    seguro_anual: float = 0
    manutencao_mensal: float = 0

    @property
    def custo_mensal_total(self) -> float:
        mensal = self.condominio_mensal + self.manutencao_mensal
        mensal += self.iptu_anual / 12
        mensal += self.seguro_anual / 12
        return mensal

    @property
    def custo_anual_total(self) -> float:
        return self.custo_mensal_total * 12


@dataclass
class DadosRenda:
    tipo: TipoRenda = TipoRenda.ALUGUEL_LONGTERM
    aluguel_mensal: Optional[float] = None  # Para long-term
    taxa_vacancia_pct: float = 0  # % do ano vago
    # Para Airbnb
    diaria_media: Optional[float] = None
    taxa_ocupacao_pct: Optional[float] = None  # % do mês ocupado
    custos_plataforma_pct: float = 3  # Taxa Airbnb host (3%)

    @property
    def receita_bruta_mensal(self) -> float:
        if self.tipo == TipoRenda.AIRBNB and self.diaria_media and self.taxa_ocupacao_pct:
            dias_ocupados = 30 * (self.taxa_ocupacao_pct / 100)
            receita = self.diaria_media * dias_ocupados
            receita *= (1 - self.custos_plataforma_pct / 100)
            return receita
        elif self.aluguel_mensal:
            fator_vacancia = 1 - (self.taxa_vacancia_pct / 100)
            return self.aluguel_mensal * fator_vacancia
        return 0

    @property
    def receita_bruta_anual(self) -> float:
        return self.receita_bruta_mensal * 12


@dataclass
class Imovel:
    """Modelo principal de um imóvel rastreado."""

    # Identificação
    nome: str  # Nome dado pelo usuário (ex: "Apto Pinheiros")
    tipo: TipoImovel
    endereco: Endereco

    # Características
    area_util: float  # m²
    area_total: Optional[float] = None  # m²
    quartos: int = 0
    vagas: int = 0
    andar: Optional[int] = None
    ano_construcao: Optional[int] = None

    # Financeiro
    compra: Optional[DadosCompra] = None
    financiamento: Optional[DadosFinanciamento] = None
    custos: CustosRecorrentes = field(default_factory=CustosRecorrentes)
    renda: DadosRenda = field(default_factory=DadosRenda)

    # Valores atualizados (calculados)
    valor_atual_estimado: Optional[float] = None
    data_ultima_avaliacao: Optional[datetime] = None
    fonte_avaliacao: Optional[str] = None  # Ex: "FipeZAP", "ITBI SP"

    # Metadados
    sql_cadastral: Optional[str] = None  # Setor-Quadra-Lote (SP)
    matricula: Optional[str] = None
    notas: str = ""
    criado_em: datetime = field(default_factory=datetime.now)

    @property
    def valor_compra(self) -> float:
        return self.compra.valor_compra if self.compra else 0

    @property
    def valorizacao_pct(self) -> Optional[float]:
        """Valorização desde a compra em %."""
        if self.valor_atual_estimado and self.valor_compra > 0:
            return ((self.valor_atual_estimado / self.valor_compra) - 1) * 100
        return None

    @property
    def preco_m2(self) -> Optional[float]:
        """Preço por m² baseado no valor atual estimado."""
        if self.valor_atual_estimado and self.area_util > 0:
            return self.valor_atual_estimado / self.area_util
        return None


@dataclass
class MetricasRentabilidade:
    """Métricas calculadas de rentabilidade de um imóvel."""

    imovel_nome: str

    # Yield
    yield_bruto_anual: float = 0  # % a.a.
    yield_liquido_anual: float = 0  # % a.a. (após custos)
    yield_real_anual: Optional[float] = None  # % a.a. (após inflação)

    # Valorização
    valorizacao_total_pct: Optional[float] = None
    valorizacao_anualizada_pct: Optional[float] = None

    # Retorno total
    retorno_total_anual: Optional[float] = None  # yield + valorização

    # Benchmarks
    spread_vs_selic: Optional[float] = None  # pp acima/abaixo da Selic
    spread_vs_cdi: Optional[float] = None
    spread_vs_poupanca: Optional[float] = None

    # Projeções
    receita_mensal_projetada: Optional[float] = None
    payback_anos: Optional[float] = None

    def to_dict(self) -> dict:
        """Converte para dicionário (para serialização JSON)."""
        return {
            "imovel": self.imovel_nome,
            "yield_bruto": f"{self.yield_bruto_anual:.2f}%",
            "yield_liquido": f"{self.yield_liquido_anual:.2f}%",
            "yield_real": f"{self.yield_real_anual:.2f}%" if self.yield_real_anual else "N/A",
            "valorizacao": f"{self.valorizacao_total_pct:.1f}%" if self.valorizacao_total_pct else "N/A",
            "retorno_total": f"{self.retorno_total_anual:.2f}%" if self.retorno_total_anual else "N/A",
            "spread_selic": f"{self.spread_vs_selic:+.2f}pp" if self.spread_vs_selic else "N/A",
            "payback": f"{self.payback_anos:.1f} anos" if self.payback_anos else "N/A",
        }
