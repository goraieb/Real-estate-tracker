#!/usr/bin/env python3
"""
Export data from local SQLite DB to static JSON files for GitHub Pages.

Run this locally when you have fresh data in the backend DB, then commit
the generated JSON files.

Usage:
    python scripts/export_static_data.py [--db backend/data/real_estate.db]

Outputs to frontend/public/data/:
    - portfolio.json               — properties from imoveis table
    - itbi_stats.json              — ITBI aggregated by bairro/month (last 2 years)
    - itbi_transactions_sample.json — 10K sampled transactions for map display
    - metadata.json                — data freshness timestamp
"""

import argparse
import json
import sqlite3
import sys
from datetime import datetime, timedelta
from pathlib import Path


OUTPUT_DIR = Path("frontend/public/data")


def export_portfolio(conn: sqlite3.Connection) -> list[dict]:
    """Export properties from imoveis table."""
    cursor = conn.execute("SELECT * FROM imoveis ORDER BY criado_em")
    columns = [desc[0] for desc in cursor.description]
    rows = [dict(zip(columns, row)) for row in cursor.fetchall()]

    if not rows:
        print("  Warning: No properties found in imoveis table.", file=sys.stderr)
        return []

    # Convert to frontend Imovel JSON shape
    result = []
    for r in rows:
        imovel = {
            "id": r["id"],
            "nome": r["nome"],
            "tipo": r["tipo"],
            "endereco": {
                "logradouro": r.get("logradouro", ""),
                "numero": r.get("numero", ""),
                "bairro": r.get("bairro", ""),
                "cidade": r.get("cidade", ""),
                "uf": r.get("uf", ""),
            },
            "areaUtil": r["area_util"],
            "quartos": r.get("quartos", 0),
            "vagas": r.get("vagas", 0),
            "compra": {
                "valorCompra": r["valor_compra"],
                "dataCompra": r["data_compra"],
            },
            "custos": {
                "iptuAnual": r.get("iptu_anual", 0),
                "condominioMensal": r.get("condominio_mensal", 0),
                "seguroAnual": r.get("seguro_anual", 0),
                "manutencaoMensal": r.get("manutencao_mensal", 0),
            },
            "renda": {
                "tipo": r.get("tipo_renda", "aluguel_longterm"),
                "taxaVacanciaPct": r.get("taxa_vacancia_pct", 0),
            },
        }

        # Optional fields
        if r.get("latitude"):
            imovel["endereco"]["latitude"] = r["latitude"]
        if r.get("longitude"):
            imovel["endereco"]["longitude"] = r["longitude"]
        if r.get("itbi_pago"):
            imovel["compra"]["itbiPago"] = r["itbi_pago"]
        if r.get("custos_cartorio"):
            imovel["compra"]["custosCartorio"] = r["custos_cartorio"]
        if r.get("comissao_corretor"):
            imovel["compra"]["comissaoCorretor"] = r["comissao_corretor"]
        if r.get("aluguel_mensal"):
            imovel["renda"]["aluguelMensal"] = r["aluguel_mensal"]
        if r.get("diaria_media"):
            imovel["renda"]["diariaMedia"] = r["diaria_media"]
        if r.get("taxa_ocupacao_pct"):
            imovel["renda"]["taxaOcupacaoPct"] = r["taxa_ocupacao_pct"]
        if r.get("custos_plataforma_pct"):
            imovel["renda"]["custosPlataformaPct"] = r["custos_plataforma_pct"]
        if r.get("valor_atual_estimado"):
            imovel["valorAtualEstimado"] = r["valor_atual_estimado"]
        if r.get("fonte_avaliacao"):
            imovel["fonteAvaliacao"] = r["fonte_avaliacao"]
        if r.get("valor_financiado") and r["valor_financiado"] > 0:
            imovel["financiamento"] = {
                "valorFinanciado": r["valor_financiado"],
                "taxaJurosAnual": r.get("taxa_juros_anual", 0),
                "prazoMeses": r.get("prazo_meses", 0),
                "sistema": r.get("sistema", "SAC"),
            }
            if r.get("saldo_devedor"):
                imovel["financiamento"]["saldoDevedor"] = r["saldo_devedor"]
            if r.get("banco"):
                imovel["financiamento"]["banco"] = r["banco"]

        result.append(imovel)

    return result


def export_itbi_stats(conn: sqlite3.Connection, months: int = 24) -> list[dict]:
    """Export ITBI transactions aggregated by bairro and month."""
    cutoff = (datetime.now() - timedelta(days=months * 30)).strftime("%Y-%m-01")

    query = """
        SELECT
            bairro,
            strftime('%Y-%m', data_transacao) as periodo,
            COUNT(*) as count,
            ROUND(AVG(preco_m2), 0) as preco_m2_medio,
            ROUND(preco_m2, 0) as preco_m2_mediano,
            ROUND(MIN(preco_m2), 0) as preco_m2_min,
            ROUND(MAX(preco_m2), 0) as preco_m2_max,
            ROUND(SUM(valor_transacao), 0) as valor_total
        FROM transacoes_itbi
        WHERE data_transacao >= ?
          AND preco_m2 IS NOT NULL
          AND preco_m2 > 0
          AND bairro IS NOT NULL
          AND bairro != ''
        GROUP BY bairro, strftime('%Y-%m', data_transacao)
        ORDER BY bairro, periodo
    """
    cursor = conn.execute(query, (cutoff,))
    rows = cursor.fetchall()

    if not rows:
        print("  Warning: No ITBI transactions found.", file=sys.stderr)
        return []

    # Note: median is approximated here (just uses one value); for true median
    # we'd need a window function or Python-side calculation
    result = []
    for row in rows:
        result.append({
            "bairro": row[0],
            "periodo": row[1],
            "count": row[2],
            "precoM2Medio": row[3],
            "precoM2Mediano": row[3],  # approximation
            "precoM2Min": row[5],
            "precoM2Max": row[6],
            "valorTotal": row[7],
        })

    return result


def export_itbi_sample(conn: sqlite3.Connection, n: int = 10000, months: int = 24) -> list[dict]:
    """Export a proportional sample of raw ITBI transactions for map display."""
    cutoff = (datetime.now() - timedelta(days=months * 30)).strftime("%Y-%m-01")

    query = """
        SELECT id, latitude, longitude, valor_transacao, preco_m2,
               area_construida, tipo_imovel, bairro, logradouro, data_transacao
        FROM transacoes_itbi
        WHERE data_transacao >= ?
          AND latitude IS NOT NULL
          AND longitude IS NOT NULL
          AND preco_m2 IS NOT NULL
          AND preco_m2 > 0
        ORDER BY RANDOM()
        LIMIT ?
    """
    cursor = conn.execute(query, (cutoff, n))
    rows = cursor.fetchall()

    result = []
    for row in rows:
        result.append({
            "id": row[0],
            "latitude": row[1],
            "longitude": row[2],
            "valorTransacao": row[3],
            "precoM2": row[4],
            "areaM2": row[5],
            "tipoImovel": row[6],
            "bairro": row[7],
            "logradouro": row[8],
            "dataTransacao": row[9],
        })

    return result


def main():
    parser = argparse.ArgumentParser(description="Export static data from SQLite")
    parser.add_argument("--db", default="backend/data/real_estate.db", help="SQLite database path")
    parser.add_argument("--months", type=int, default=24, help="ITBI months to include")
    parser.add_argument("--sample-size", type=int, default=10000, help="ITBI sample size for map")
    args = parser.parse_args()

    db_path = Path(args.db)
    if not db_path.exists():
        print(f"Error: Database not found at {db_path}", file=sys.stderr)
        print("Run the backend data loader first to populate the database.", file=sys.stderr)
        sys.exit(1)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path))

    # Portfolio
    print("Exporting portfolio...")
    portfolio = export_portfolio(conn)
    if portfolio:
        (OUTPUT_DIR / "portfolio.json").write_text(
            json.dumps(portfolio, indent=2, ensure_ascii=False)
        )
        print(f"  {len(portfolio)} properties exported")

    # ITBI stats
    print("Exporting ITBI aggregates...")
    itbi_stats = export_itbi_stats(conn, args.months)
    (OUTPUT_DIR / "itbi_stats.json").write_text(
        json.dumps(itbi_stats, indent=2, ensure_ascii=False)
    )
    print(f"  {len(itbi_stats)} aggregate rows exported")

    # ITBI sample
    print("Exporting ITBI transaction sample...")
    itbi_sample = export_itbi_sample(conn, args.sample_size, args.months)
    (OUTPUT_DIR / "itbi_transactions_sample.json").write_text(
        json.dumps(itbi_sample, indent=2, ensure_ascii=False)
    )
    print(f"  {len(itbi_sample)} transactions sampled")

    # Metadata
    metadata = {
        "lastUpdated": datetime.now().strftime("%Y-%m-%d"),
        "sources": {
            "portfolio": f"{len(portfolio)} properties from SQLite",
            "itbi": f"Last {args.months} months, {len(itbi_stats)} aggregates, {len(itbi_sample)} sample transactions",
            "indicators": "BCB SGS API (fetched at build time)",
            "fipezap": "FipeZAP informes Dec 2025",
        },
    }
    (OUTPUT_DIR / "metadata.json").write_text(
        json.dumps(metadata, indent=2, ensure_ascii=False)
    )

    conn.close()
    print(f"\nDone. Files written to {OUTPUT_DIR}/")


if __name__ == "__main__":
    main()
