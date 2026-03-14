#!/usr/bin/env python3
"""Export ITBI transactions from SQLite to GeoJSON for tippecanoe."""

import json
import sqlite3
import sys
from pathlib import Path

DB_PATH = Path("backend/data/imoveis.db")
OUTPUT_PATH = Path("/tmp/itbi_transactions.geojson")


def main():
    if not DB_PATH.exists():
        print(f"Database not found at {DB_PATH}", file=sys.stderr)
        sys.exit(1)

    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row

    rows = conn.execute("""
        SELECT id, latitude, longitude, bairro, logradouro,
               valor_transacao, preco_m2, area_m2, tipo_imovel, data_transacao
        FROM transacoes_itbi
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
    """).fetchall()

    features = []
    for row in rows:
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [row["longitude"], row["latitude"]],
            },
            "properties": {
                "id": row["id"],
                "bairro": row["bairro"],
                "logradouro": row["logradouro"],
                "valorTransacao": row["valor_transacao"],
                "precoM2": row["preco_m2"],
                "areaM2": row["area_m2"],
                "tipoImovel": row["tipo_imovel"],
                "dataTransacao": row["data_transacao"],
            },
        })

    geojson = {"type": "FeatureCollection", "features": features}

    OUTPUT_PATH.write_text(json.dumps(geojson))
    print(f"Exported {len(features)} features to {OUTPUT_PATH}")

    conn.close()


if __name__ == "__main__":
    main()
