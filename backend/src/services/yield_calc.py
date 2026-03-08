"""Serviço de cálculo de yield (rentabilidade) de imóveis.

Calcula yield bruto, líquido e real para aluguel long-term e Airbnb.
"""

from typing import Optional


# Tabela progressiva de IR sobre aluguel (pessoa física)
IR_FAIXAS = [
    (2_259.20, 0, 0),
    (2_826.65, 7.5, 169.44),
    (3_751.05, 15.0, 381.44),
    (4_664.68, 22.5, 662.77),
    (float("inf"), 27.5, 896.00),
]


class YieldService:
    """Calculadora de yield para imóveis."""

    @staticmethod
    def yield_bruto(valor_imovel: float, receita_anual: float) -> float:
        """Calcula yield bruto anual.

        Args:
            valor_imovel: Valor de mercado do imóvel.
            receita_anual: Receita bruta anual (aluguel × 12 ou Airbnb).

        Returns:
            Yield bruto em % a.a.
        """
        if valor_imovel <= 0:
            return 0
        return (receita_anual / valor_imovel) * 100

    @staticmethod
    def yield_bruto_mensal(valor_imovel: float, aluguel_mensal: float) -> float:
        """Atalho: yield bruto a partir do aluguel mensal."""
        return YieldService.yield_bruto(valor_imovel, aluguel_mensal * 12)

    @staticmethod
    def yield_liquido(
        valor_imovel: float,
        aluguel_mensal: float,
        iptu_anual: float = 0,
        condominio_mensal: float = 0,
        seguro_anual: float = 0,
        manutencao_mensal: float = 0,
        taxa_administracao_pct: float = 0,
        vacancia_pct: float = 0,
        incluir_ir: bool = True,
    ) -> dict:
        """Calcula yield líquido considerando todos os custos.

        Args:
            valor_imovel: Valor de mercado.
            aluguel_mensal: Aluguel bruto mensal.
            iptu_anual: IPTU anual.
            condominio_mensal: Condomínio mensal (se pago pelo proprietário).
            seguro_anual: Seguro incêndio/residencial anual.
            manutencao_mensal: Reserva para manutenção.
            taxa_administracao_pct: % de administração da imobiliária (geralmente 8-10%).
            vacancia_pct: % estimada de vacância anual.
            incluir_ir: Se True, desconta IR sobre aluguel.

        Returns:
            Dict detalhado com yield bruto, líquido e breakdown.
        """
        if valor_imovel <= 0:
            return {"yield_bruto": 0, "yield_liquido": 0}

        # Receita bruta anual ajustada por vacância
        meses_ocupados = 12 * (1 - vacancia_pct / 100)
        receita_bruta = aluguel_mensal * meses_ocupados

        # Custos anuais
        custo_admin = receita_bruta * (taxa_administracao_pct / 100)
        custos_fixos = iptu_anual + seguro_anual
        custos_variaveis = (condominio_mensal + manutencao_mensal) * 12

        total_custos = custo_admin + custos_fixos + custos_variaveis

        receita_liquida_pre_ir = receita_bruta - total_custos

        # IR sobre aluguel (pessoa física)
        ir_anual = 0
        if incluir_ir and receita_liquida_pre_ir > 0:
            aluguel_liquido_mensal = receita_liquida_pre_ir / meses_ocupados
            ir_mensal = YieldService._calcular_ir_aluguel(aluguel_liquido_mensal)
            ir_anual = ir_mensal * meses_ocupados

        receita_liquida = receita_liquida_pre_ir - ir_anual

        return {
            "yield_bruto": round((receita_bruta / valor_imovel) * 100, 2),
            "yield_liquido": round((receita_liquida / valor_imovel) * 100, 2),
            "receita_bruta_anual": round(receita_bruta, 2),
            "receita_liquida_anual": round(receita_liquida, 2),
            "custos_totais_anual": round(total_custos, 2),
            "ir_anual": round(ir_anual, 2),
            "breakdown": {
                "administracao": round(custo_admin, 2),
                "iptu": iptu_anual,
                "seguro": seguro_anual,
                "condominio_anual": round(condominio_mensal * 12, 2),
                "manutencao_anual": round(manutencao_mensal * 12, 2),
            },
        }

    @staticmethod
    def yield_airbnb(
        valor_imovel: float,
        diaria_media: float,
        taxa_ocupacao_pct: float,
        custos_fixos_mensal: float = 0,
        taxa_plataforma_pct: float = 3,
        custos_limpeza_por_estadia: float = 0,
        media_noites_por_estadia: float = 3,
    ) -> dict:
        """Calcula yield para imóvel operado como Airbnb.

        Args:
            valor_imovel: Valor de mercado.
            diaria_media: Preço médio por noite (ADR).
            taxa_ocupacao_pct: Taxa de ocupação em %.
            custos_fixos_mensal: Condomínio + IPTU/12 + internet + etc.
            taxa_plataforma_pct: Taxa do Airbnb (tipicamente 3% host).
            custos_limpeza_por_estadia: Custo de limpeza por checkout.
            media_noites_por_estadia: Média de noites por reserva.

        Returns:
            Dict com yield e breakdown.
        """
        if valor_imovel <= 0:
            return {"yield_bruto": 0, "yield_liquido": 0}

        # Noites ocupadas por ano
        noites_ano = 365 * (taxa_ocupacao_pct / 100)
        receita_bruta = diaria_media * noites_ano

        # Custos
        taxa_plataforma = receita_bruta * (taxa_plataforma_pct / 100)
        num_estadias = noites_ano / media_noites_por_estadia if media_noites_por_estadia > 0 else 0
        custo_limpeza_total = custos_limpeza_por_estadia * num_estadias
        custos_fixos_anuais = custos_fixos_mensal * 12

        total_custos = taxa_plataforma + custo_limpeza_total + custos_fixos_anuais
        receita_liquida = receita_bruta - total_custos

        return {
            "yield_bruto": round((receita_bruta / valor_imovel) * 100, 2),
            "yield_liquido": round((receita_liquida / valor_imovel) * 100, 2),
            "receita_bruta_anual": round(receita_bruta, 2),
            "receita_liquida_anual": round(receita_liquida, 2),
            "receita_liquida_mensal": round(receita_liquida / 12, 2),
            "noites_ocupadas_ano": round(noites_ano, 0),
            "breakdown": {
                "taxa_plataforma": round(taxa_plataforma, 2),
                "limpeza_total": round(custo_limpeza_total, 2),
                "custos_fixos": round(custos_fixos_anuais, 2),
            },
        }

    @staticmethod
    def comparar_longterm_vs_airbnb(
        resultado_longterm: dict,
        resultado_airbnb: dict,
    ) -> dict:
        """Compara yield de aluguel long-term vs Airbnb."""
        return {
            "longterm_yield": resultado_longterm.get("yield_liquido", 0),
            "airbnb_yield": resultado_airbnb.get("yield_liquido", 0),
            "diferenca_pp": round(
                resultado_airbnb.get("yield_liquido", 0)
                - resultado_longterm.get("yield_liquido", 0),
                2,
            ),
            "recomendacao": (
                "Airbnb"
                if resultado_airbnb.get("yield_liquido", 0)
                > resultado_longterm.get("yield_liquido", 0)
                else "Aluguel long-term"
            ),
        }

    @staticmethod
    def calcular_payback(valor_imovel: float, receita_liquida_anual: float) -> Optional[float]:
        """Calcula payback simples em anos."""
        if receita_liquida_anual <= 0:
            return None
        return round(valor_imovel / receita_liquida_anual, 1)

    @staticmethod
    def _calcular_ir_aluguel(aluguel_liquido_mensal: float) -> float:
        """Calcula IR mensal sobre aluguel (tabela progressiva PF)."""
        for limite, aliquota, deducao in IR_FAIXAS:
            if aluguel_liquido_mensal <= limite:
                return max(0, aluguel_liquido_mensal * (aliquota / 100) - deducao)
        return 0
