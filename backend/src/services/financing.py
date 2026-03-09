"""Serviço de simulação de financiamento imobiliário.

Suporta tabelas SAC e PRICE, comparação entre sistemas,
e análise de compra à vista vs financiada.
"""


class FinancingService:
    """Calculadora de financiamento imobiliário."""

    @staticmethod
    def tabela_sac(
        valor_financiado: float,
        taxa_juros_anual: float,
        prazo_meses: int,
    ) -> dict:
        """Gera tabela de amortização pelo sistema SAC.

        SAC: amortização constante, juros decrescentes.
        """
        if valor_financiado <= 0 or prazo_meses <= 0:
            return {"tabela": [], "resumo": {}}

        taxa_mensal = (1 + taxa_juros_anual / 100) ** (1 / 12) - 1
        amortizacao = valor_financiado / prazo_meses
        saldo = valor_financiado
        tabela = []
        total_pago = 0

        for i in range(1, prazo_meses + 1):
            juros = saldo * taxa_mensal
            prestacao = amortizacao + juros
            saldo -= amortizacao
            total_pago += prestacao
            tabela.append({
                "parcela": i,
                "amortizacao": round(amortizacao, 2),
                "juros": round(juros, 2),
                "prestacao": round(prestacao, 2),
                "saldo_devedor": round(max(saldo, 0), 2),
            })

        return {
            "tabela": tabela,
            "resumo": {
                "primeira_parcela": tabela[0]["prestacao"],
                "ultima_parcela": tabela[-1]["prestacao"],
                "total_pago": round(total_pago, 2),
                "total_juros": round(total_pago - valor_financiado, 2),
                "sistema": "SAC",
            },
        }

    @staticmethod
    def tabela_price(
        valor_financiado: float,
        taxa_juros_anual: float,
        prazo_meses: int,
    ) -> dict:
        """Gera tabela de amortização pelo sistema PRICE.

        PRICE: parcela fixa, amortização crescente.
        """
        if valor_financiado <= 0 or prazo_meses <= 0:
            return {"tabela": [], "resumo": {}}

        taxa_mensal = (1 + taxa_juros_anual / 100) ** (1 / 12) - 1
        # PMT = PV × [i(1+i)^n / ((1+i)^n - 1)]
        fator = (1 + taxa_mensal) ** prazo_meses
        prestacao_fixa = valor_financiado * (taxa_mensal * fator) / (fator - 1)

        saldo = valor_financiado
        tabela = []
        total_pago = 0

        for i in range(1, prazo_meses + 1):
            juros = saldo * taxa_mensal
            amortizacao = prestacao_fixa - juros
            saldo -= amortizacao
            total_pago += prestacao_fixa
            tabela.append({
                "parcela": i,
                "amortizacao": round(amortizacao, 2),
                "juros": round(juros, 2),
                "prestacao": round(prestacao_fixa, 2),
                "saldo_devedor": round(max(saldo, 0), 2),
            })

        return {
            "tabela": tabela,
            "resumo": {
                "primeira_parcela": tabela[0]["prestacao"],
                "ultima_parcela": tabela[-1]["prestacao"],
                "total_pago": round(total_pago, 2),
                "total_juros": round(total_pago - valor_financiado, 2),
                "sistema": "PRICE",
            },
        }

    @staticmethod
    def comparar_sac_price(
        valor_financiado: float,
        taxa_juros_anual: float,
        prazo_meses: int,
    ) -> dict:
        """Compara SAC vs PRICE lado a lado."""
        sac = FinancingService.tabela_sac(valor_financiado, taxa_juros_anual, prazo_meses)
        price = FinancingService.tabela_price(valor_financiado, taxa_juros_anual, prazo_meses)

        economia_sac = price["resumo"].get("total_pago", 0) - sac["resumo"].get("total_pago", 0)

        return {
            "sac": sac["resumo"],
            "price": price["resumo"],
            "economia_sac": round(economia_sac, 2),
            "recomendacao": "SAC" if economia_sac > 0 else "PRICE",
        }

    @staticmethod
    def avista_vs_financiado(
        valor_imovel: float,
        valor_entrada: float,
        taxa_juros_anual: float,
        prazo_meses: int,
        taxa_rendimento_anual: float,
    ) -> dict:
        """Compara compra à vista vs financiada + investimento da diferença.

        Cenário A: compra à vista
        Cenário B: entrada + financia + investe o restante a taxa_rendimento
        """
        valor_financiado = valor_imovel - valor_entrada
        sac = FinancingService.tabela_sac(valor_financiado, taxa_juros_anual, prazo_meses)

        taxa_rend_mensal = (1 + taxa_rendimento_anual / 100) ** (1 / 12) - 1

        # Cenário A: à vista, patrimônio = valor_imovel (sem investimento)
        # Cenário B: entrada + financia, diferença investida
        diferenca_investida = valor_imovel - valor_entrada  # o que sobra investido
        patrimonio_investido = diferenca_investida

        projecao = []
        marcos = [12, 36, 60, 120, 180, 240, 360]

        for mes in range(1, prazo_meses + 1):
            # Desconta prestação do investimento
            if mes <= len(sac["tabela"]):
                prestacao = sac["tabela"][mes - 1]["prestacao"]
            else:
                prestacao = 0

            # Rendimento do mês
            patrimonio_investido = patrimonio_investido * (1 + taxa_rend_mensal) - prestacao

            if mes in marcos:
                # Patrimônio total cenário B = imóvel + saldo investido
                patrim_b = valor_imovel + max(patrimonio_investido, 0)
                projecao.append({
                    "meses": mes,
                    "anos": mes / 12,
                    "avista_patrimonio": round(valor_imovel, 2),
                    "financiado_patrimonio": round(patrim_b, 2),
                    "diferenca": round(patrim_b - valor_imovel, 2),
                    "melhor": "Financiado" if patrim_b > valor_imovel else "À vista",
                })

        return {
            "valor_imovel": valor_imovel,
            "valor_entrada": valor_entrada,
            "valor_financiado": valor_financiado,
            "projecao": projecao,
        }
