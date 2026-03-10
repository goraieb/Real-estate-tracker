"""Seed the database with realistic sample data from all sources.

Populates every table with representative records structured exactly like
what the real APIs return. Useful for development, testing, and demo when
external APIs are unreachable.

Usage:
    python -m src.scripts.seed_sample_data
"""

import asyncio
import hashlib
import logging
import random
import sys
from datetime import date, timedelta
from pathlib import Path

import aiosqlite

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.database.db import DB_PATH, init_db
from src.services.geo_boundaries import SP_BAIRRO_CENTERS

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Realistic data generators
# ---------------------------------------------------------------------------

# São Paulo neighborhoods with typical price ranges (R$/m²)
SP_BAIRROS = {
    "Itaim Bibi": (18000, 28000), "Vila Olímpia": (16000, 24000),
    "Pinheiros": (14000, 22000), "Jardim Paulista": (16000, 25000),
    "Moema": (14000, 21000), "Vila Madalena": (12000, 18000),
    "Perdizes": (11000, 17000), "Vila Mariana": (11000, 16000),
    "Brooklin": (13000, 20000), "Campo Belo": (12000, 18000),
    "Consolação": (10000, 16000), "Bela Vista": (9000, 14000),
    "Santana": (8000, 13000), "Lapa": (9000, 14000),
    "Butantã": (7000, 11000), "Ipiranga": (7000, 11000),
    "Tucuruvi": (6500, 10000), "Jabaquara": (6000, 9500),
    "Casa Verde": (6000, 9000), "Santo Amaro": (8000, 12000),
    "Morumbi": (12000, 20000), "Saúde": (9000, 13000),
    "Liberdade": (9500, 14000), "República": (7000, 11000),
    "Tatuapé": (8500, 13000), "Penha": (5500, 8500),
    "Vila Prudente": (6000, 9000), "São Miguel Paulista": (3500, 5500),
    "Grajaú": (3000, 5000), "Campo Limpo": (4000, 6500),
    "Pirituba": (5000, 8000), "Tremembé": (5500, 8500),
    "Mandaqui": (7000, 10500), "Vila Guilherme": (7000, 10000),
}

TIPOS_IMOVEL = ["Apartamento", "Casa", "Sala Comercial", "Terreno", "Loja"]


def _det_offset(seed_str: str) -> tuple[float, float]:
    """Deterministic lat/lng offset from a seed string."""
    h = int(hashlib.md5(seed_str.encode()).hexdigest()[:8], 16)
    lat_off = ((h % 1000) / 1000 - 0.5) * 0.018
    lng_off = (((h >> 12) % 1000) / 1000 - 0.5) * 0.018
    return lat_off, lng_off


def generate_itbi_transactions(n_per_bairro: int = 80) -> list[dict]:
    """Generate realistic ITBI transactions for SP neighborhoods."""
    records = []
    random.seed(42)

    for bairro, (price_low, price_high) in SP_BAIRROS.items():
        center = SP_BAIRRO_CENTERS.get(bairro)
        if not center:
            continue

        for i in range(n_per_bairro):
            # Spread across 2019-2025
            days_back = random.randint(0, 6 * 365)
            tx_date = date.today() - timedelta(days=days_back)

            area = random.choice([35, 45, 55, 65, 75, 85, 100, 120, 150, 200, 250])
            preco_m2 = random.uniform(price_low, price_high)
            # Add yearly appreciation (~5%/yr from 2019)
            years_ago = days_back / 365
            preco_m2 *= (1 - 0.05 * years_ago) if years_ago <= 6 else 0.70
            preco_m2 = round(preco_m2, 2)
            valor = round(preco_m2 * area, 2)

            tipo = random.choices(TIPOS_IMOVEL, weights=[60, 20, 10, 5, 5])[0]

            seed = f"{bairro}:{i}:{tx_date}"
            lat_off, lng_off = _det_offset(seed)

            records.append({
                "cidade": "São Paulo",
                "bairro": bairro,
                "logradouro": f"Rua {bairro} {random.randint(1, 500)}",
                "numero": str(random.randint(1, 2000)),
                "sql_cadastral": f"{random.randint(10, 99)}.{random.randint(100, 999)}.{random.randint(1000, 9999)}",
                "tipo_imovel": tipo,
                "area_construida": area,
                "area_terreno": area * random.uniform(1.0, 1.5) if tipo != "Apartamento" else None,
                "valor_transacao": valor,
                "preco_m2": preco_m2,
                "data_transacao": str(tx_date),
                "latitude": round(center[0] + lat_off, 6),
                "longitude": round(center[1] + lng_off, 6),
                "geocoded": 1,
                "fonte": "prefeitura_sp",
            })

    return records


def generate_bcb_indicators() -> list[dict]:
    """Generate BCB economic indicator series (Selic, IPCA, IGP-M, CDI, TR, INCC)."""
    records = []

    # Monthly data for 5 years
    series_values = {
        "selic": (10.5, 14.25),       # Selic range 2020-2025
        "ipca": (0.2, 0.8),           # Monthly IPCA
        "igpm": (-0.3, 1.2),          # Monthly IGP-M
        "incc": (0.1, 0.9),           # Monthly INCC
        "cdi": (10.4, 14.15),         # CDI ~= Selic
        "tr": (0.0, 0.15),            # Monthly TR
        "poupanca": (6.17, 8.5),      # Annual savings rate
        "financiamento_imobiliario": (8.5, 12.5),  # Mortgage rate
    }

    # Selic historical trajectory (annual rate, monthly resolution)
    selic_path = [
        (2020, [4.50, 4.25, 3.75, 3.00, 3.00, 2.25, 2.00, 2.00, 2.00, 2.00, 2.00, 2.00]),
        (2021, [2.00, 2.00, 2.75, 2.75, 3.50, 4.25, 4.25, 5.25, 6.25, 7.75, 7.75, 9.25]),
        (2022, [9.25, 10.75, 11.75, 11.75, 12.75, 13.25, 13.25, 13.75, 13.75, 13.75, 13.75, 13.75]),
        (2023, [13.75, 13.75, 13.75, 13.75, 13.75, 13.75, 13.25, 13.25, 12.75, 12.25, 12.25, 11.75]),
        (2024, [11.75, 11.25, 11.25, 10.75, 10.50, 10.50, 10.50, 10.50, 10.75, 11.25, 11.25, 12.25]),
        (2025, [13.25, 13.25, 14.25, 14.25, 14.75, 14.75, 14.75, 14.75, 14.75, 14.25, 14.25, 14.25]),
    ]

    random.seed(123)

    for year, monthly_rates in selic_path:
        for month_idx, selic_rate in enumerate(monthly_rates):
            m = month_idx + 1
            d = date(year, m, 1)
            if d > date.today():
                break

            dt = str(d)
            records.append({"fonte": "bcb", "serie": "selic", "data": dt, "valor": selic_rate})
            records.append({"fonte": "bcb", "serie": "cdi", "data": dt, "valor": round(selic_rate - 0.1, 2)})

            # IPCA monthly (~0.3-0.8%)
            ipca_m = round(random.uniform(0.15, 0.85), 2)
            records.append({"fonte": "bcb", "serie": "ipca", "data": dt, "valor": ipca_m})

            # IGP-M monthly
            igpm_m = round(random.uniform(-0.4, 1.3), 2)
            records.append({"fonte": "bcb", "serie": "igpm", "data": dt, "valor": igpm_m})

            # INCC monthly
            incc_m = round(random.uniform(0.1, 0.9), 2)
            records.append({"fonte": "bcb", "serie": "incc", "data": dt, "valor": incc_m})

            # TR monthly
            tr_m = round(max(0, (selic_rate - 8.0) * 0.02), 4)
            records.append({"fonte": "bcb", "serie": "tr", "data": dt, "valor": tr_m})

            # Poupança (annual rate)
            poup = round(min(6.17, selic_rate * 0.7) + 3.5, 2) if selic_rate > 8.5 else round(selic_rate * 0.7, 2)
            records.append({"fonte": "bcb", "serie": "poupanca", "data": dt, "valor": poup})

            # Mortgage rate
            fin_rate = round(selic_rate + random.uniform(-1.5, 0.5), 2)
            records.append({"fonte": "bcb", "serie": "financiamento_imobiliario", "data": dt, "valor": fin_rate})

    return records


def generate_ipeadata() -> list[dict]:
    """Generate Ipeadata macro series."""
    records = []
    random.seed(456)

    for year in range(2020, 2026):
        for m in range(1, 13):
            d = date(year, m, 1)
            if d > date.today():
                break
            dt = str(d)

            records.append({"fonte": "ipeadata", "serie": "incc", "data": dt,
                            "valor": round(random.uniform(3.5, 12.0), 2)})
            records.append({"fonte": "ipeadata", "serie": "incc_mensal", "data": dt,
                            "valor": round(random.uniform(0.1, 0.9), 2)})
            records.append({"fonte": "ipeadata", "serie": "igpm", "data": dt,
                            "valor": round(random.uniform(-2.0, 16.0), 2)})
            records.append({"fonte": "ipeadata", "serie": "ipca", "data": dt,
                            "valor": round(random.uniform(3.0, 12.0), 2)})
            records.append({"fonte": "ipeadata", "serie": "selic_anual", "data": dt,
                            "valor": round(random.uniform(2.0, 14.75), 2)})
            records.append({"fonte": "ipeadata", "serie": "pib_real", "data": dt,
                            "valor": round(random.uniform(-3.0, 5.0), 2)})
            records.append({"fonte": "ipeadata", "serie": "renda_media", "data": dt,
                            "valor": round(random.uniform(2800, 3400), 0)})

    return records


def generate_b3_ifix() -> list[dict]:
    """Generate B3 IFIX daily values."""
    records = []
    valor = 2800.0
    random.seed(789)

    d = date(2023, 1, 2)
    while d <= date.today():
        if d.weekday() < 5:  # Trading days only
            change = random.gauss(0.0002, 0.008)
            valor *= (1 + change)
            records.append({
                "fonte": "b3", "serie": "ifix",
                "data": str(d), "valor": round(valor, 2),
            })
        d += timedelta(days=1)

    # NTN-B current rate
    records.append({"fonte": "b3", "serie": "ntnb", "data": str(date.today()), "valor": 6.42})

    return records


def generate_abecip() -> list[dict]:
    """Generate ABECIP credit market indicators."""
    records = []
    random.seed(321)

    for year in range(2023, 2026):
        for m in range(1, 13):
            d = date(year, m, 1)
            if d > date.today():
                break
            dt = str(d)

            records.append({"fonte": "abecip", "serie": "taxa_media_imobiliario",
                            "data": dt, "valor": round(random.uniform(9.5, 12.5), 2)})
            records.append({"fonte": "abecip", "serie": "inadimplencia_imobiliario",
                            "data": dt, "valor": round(random.uniform(1.2, 2.1), 2)})
            records.append({"fonte": "abecip", "serie": "volume_financiamento",
                            "data": dt, "valor": round(random.uniform(12000, 22000), 0)})
            records.append({"fonte": "abecip", "serie": "saldo_credito",
                            "data": dt, "valor": round(random.uniform(800000, 950000), 0)})

    return records


def generate_cub() -> list[dict]:
    """Generate CUB/INCC construction cost data."""
    records = []
    random.seed(654)

    # INCC monthly
    for year in range(2021, 2026):
        for m in range(1, 13):
            d = date(year, m, 1)
            if d > date.today():
                break
            records.append({"fonte": "cub", "serie": "incc_mensal",
                            "data": str(d), "valor": round(random.uniform(0.1, 0.9), 2)})

    # CUB R-8N by state
    cub_base = {"sp": 2145, "rj": 2089, "mg": 1985, "pr": 2210}
    for uf, base in cub_base.items():
        for year in range(2024, 2026):
            for m in range(1, 13):
                d = date(year, m, 1)
                if d > date.today():
                    break
                months_from_base = (year - 2024) * 12 + m
                val = base * (1 + 0.005 * months_from_base)
                records.append({"fonte": "cub", "serie": f"cub_r8n_{uf}",
                                "data": str(d), "valor": round(val, 2)})

    return records


def generate_secovi() -> list[dict]:
    """Generate SECOVI VSO and rental data."""
    records = []
    from src.data_sources.secovi import SECOVI_VSO_HISTORICO, SECOVI_LOCACAO_SP

    for periodo, vso in SECOVI_VSO_HISTORICO.items():
        records.append({"fonte": "secovi", "serie": "vso",
                        "data": f"{periodo}-01", "valor": vso})

    for periodo, preco in SECOVI_LOCACAO_SP.items():
        records.append({"fonte": "secovi", "serie": "locacao_m2_sp",
                        "data": f"{periodo}-01", "valor": preco})

    return records


def generate_fipezap() -> list[dict]:
    """Generate FipeZAP sale and rental price data for major cities."""
    records = []
    random.seed(111)

    cities_venda = {
        "São Paulo": 10800, "Rio de Janeiro": 9500, "Belo Horizonte": 7200,
        "Curitiba": 8900, "Porto Alegre": 7600, "Florianópolis": 9800,
        "Brasília": 8400, "Salvador": 5800, "Recife": 6100, "Fortaleza": 7000,
    }

    for city, base_price in cities_venda.items():
        for year in range(2020, 2026):
            for m in range(1, 13):
                d = date(year, m, 1)
                if d > date.today():
                    break
                months = (year - 2020) * 12 + m
                growth = 1 + 0.004 * months + random.uniform(-0.01, 0.01)
                preco = round(base_price * growth, 2)
                variacao = round(random.uniform(-0.5, 1.2), 2)

                records.append({
                    "tipo": "venda", "cidade": city, "data": str(d),
                    "preco_m2": preco, "variacao_mensal": variacao,
                })

    cities_locacao = {
        "São Paulo": 55.0, "Rio de Janeiro": 48.0, "Belo Horizonte": 35.0,
        "Curitiba": 40.0, "Porto Alegre": 32.0, "Florianópolis": 45.0,
    }

    for city, base_rent in cities_locacao.items():
        for year in range(2020, 2026):
            for m in range(1, 13):
                d = date(year, m, 1)
                if d > date.today():
                    break
                months = (year - 2020) * 12 + m
                growth = 1 + 0.005 * months + random.uniform(-0.01, 0.01)
                preco = round(base_rent * growth, 2)

                records.append({
                    "tipo": "locacao", "cidade": city, "data": str(d),
                    "preco_m2": preco, "variacao_mensal": None,
                })

    return records


def generate_airbnb_listings() -> list[dict]:
    """Generate Inside Airbnb listing data for São Paulo."""
    records = []
    random.seed(222)

    # Airbnb neighborhood pricing (nightly R$, occupancy %)
    airbnb_bairros = {
        "Pinheiros": (350, 72), "Vila Madalena": (280, 68), "Itaim Bibi": (420, 75),
        "Jardim Paulista": (380, 70), "Moema": (320, 65), "Vila Mariana": (250, 60),
        "Consolação": (220, 62), "Bela Vista": (200, 58), "República": (180, 55),
        "Brooklin": (340, 68), "Vila Olímpia": (400, 73), "Perdizes": (260, 60),
        "Santana": (200, 55), "Liberdade": (230, 63), "Butantã": (180, 50),
        "Lapa": (220, 58), "Tatuapé": (200, 55), "Campo Belo": (300, 65),
        "Morumbi": (350, 60), "Santo Amaro": (220, 52),
    }

    room_types = ["Entire home/apt", "Private room", "Shared room"]
    room_weights = [70, 25, 5]
    listing_id = 100000

    for bairro, (avg_price, avg_occ) in airbnb_bairros.items():
        center = SP_BAIRRO_CENTERS.get(bairro, (-23.55, -46.63))
        n_listings = random.randint(40, 120)

        for _ in range(n_listings):
            listing_id += 1
            room_type = random.choices(room_types, weights=room_weights)[0]

            # Price varies by room type
            if room_type == "Entire home/apt":
                price = round(random.gauss(avg_price, avg_price * 0.3), 0)
            elif room_type == "Private room":
                price = round(random.gauss(avg_price * 0.5, avg_price * 0.15), 0)
            else:
                price = round(random.gauss(avg_price * 0.25, avg_price * 0.08), 0)
            price = max(50, price)

            avail = max(0, min(365, round(random.gauss(365 * (1 - avg_occ / 100), 60))))
            reviews = max(0, round(random.gauss(2.5, 1.5), 1))

            lat_off, lng_off = _det_offset(f"airbnb:{listing_id}")

            records.append({
                "id": listing_id,
                "cidade": "São Paulo",
                "bairro": bairro,
                "latitude": round(center[0] + lat_off, 6),
                "longitude": round(center[1] + lng_off, 6),
                "tipo_quarto": room_type,
                "preco_noite": price,
                "minimo_noites": random.choice([1, 2, 3, 5, 7, 30]),
                "qtd_reviews": random.randint(0, 200),
                "reviews_por_mes": reviews,
                "disponibilidade_365": avail,
                "snapshot_data": "seed_2025",
            })

    return records


# ---------------------------------------------------------------------------
# Database insertion
# ---------------------------------------------------------------------------

async def seed_all():
    """Insert sample data into all tables."""
    await init_db()

    db = await aiosqlite.connect(DB_PATH)
    try:
        # 1. ITBI Transactions
        print("Generating ITBI transactions...")
        itbi = generate_itbi_transactions(n_per_bairro=80)
        for rec in itbi:
            await db.execute(
                """INSERT OR IGNORE INTO transacoes_itbi
                (cidade, bairro, logradouro, numero, sql_cadastral,
                 tipo_imovel, area_construida, area_terreno,
                 valor_transacao, preco_m2, data_transacao,
                 latitude, longitude, geocoded, fonte)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (rec["cidade"], rec["bairro"], rec["logradouro"], rec["numero"],
                 rec["sql_cadastral"], rec["tipo_imovel"], rec["area_construida"],
                 rec["area_terreno"], rec["valor_transacao"], rec["preco_m2"],
                 rec["data_transacao"], rec["latitude"], rec["longitude"],
                 rec["geocoded"], rec["fonte"]),
            )
        await db.commit()
        print(f"  ITBI: {len(itbi):,} transactions inserted")

        # 2. Economic Indicators (BCB + Ipeadata + B3 + ABECIP + CUB + SECOVI)
        all_indicators = []
        for name, gen_fn in [
            ("BCB", generate_bcb_indicators),
            ("Ipeadata", generate_ipeadata),
            ("B3/IFIX", generate_b3_ifix),
            ("ABECIP", generate_abecip),
            ("CUB/INCC", generate_cub),
            ("SECOVI", generate_secovi),
        ]:
            recs = gen_fn()
            all_indicators.extend(recs)
            print(f"  {name}: {len(recs)} records")

        for rec in all_indicators:
            await db.execute(
                """INSERT OR REPLACE INTO indicadores_economicos
                (fonte, serie, data, valor) VALUES (?,?,?,?)""",
                (rec["fonte"], rec["serie"], rec["data"], rec["valor"]),
            )
        await db.commit()
        print(f"  Indicators total: {len(all_indicators):,} records inserted")

        # 3. FipeZAP
        print("Generating FipeZAP data...")
        fipezap = generate_fipezap()
        for rec in fipezap:
            await db.execute(
                """INSERT OR REPLACE INTO fipezap_precos
                (tipo, cidade, data, preco_m2, variacao_mensal) VALUES (?,?,?,?,?)""",
                (rec["tipo"], rec["cidade"], rec["data"], rec["preco_m2"],
                 rec.get("variacao_mensal")),
            )
        await db.commit()
        print(f"  FipeZAP: {len(fipezap):,} records inserted")

        # 4. Airbnb
        print("Generating Airbnb listings...")
        airbnb = generate_airbnb_listings()
        for rec in airbnb:
            await db.execute(
                """INSERT OR REPLACE INTO airbnb_listings
                (id, cidade, bairro, latitude, longitude, tipo_quarto,
                 preco_noite, minimo_noites, qtd_reviews, reviews_por_mes,
                 disponibilidade_365, snapshot_data)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
                (rec["id"], rec["cidade"], rec["bairro"], rec["latitude"],
                 rec["longitude"], rec["tipo_quarto"], rec["preco_noite"],
                 rec["minimo_noites"], rec["qtd_reviews"], rec["reviews_por_mes"],
                 rec["disponibilidade_365"], rec["snapshot_data"]),
            )
        await db.commit()
        print(f"  Airbnb: {len(airbnb):,} listings inserted")

        # 5. Data load status
        sources = ["itbi", "bcb", "ipeadata", "b3", "abecip", "cub", "secovi", "fipezap", "airbnb"]
        for src in sources:
            await db.execute(
                """INSERT INTO data_load_status
                (source, status, records_loaded, completed_at)
                VALUES (?, 'completed', ?, datetime('now'))""",
                (src, len([r for r in all_indicators if r.get("fonte") == src])
                 if src not in ("itbi", "fipezap", "airbnb")
                 else {"itbi": len(itbi), "fipezap": len(fipezap), "airbnb": len(airbnb)}[src]),
            )
        await db.commit()

        # --- Summary ---
        print("\n=== SEED COMPLETE ===")

        cursor = await db.execute("SELECT COUNT(*) as c FROM transacoes_itbi")
        row = await cursor.fetchone()
        print(f"  transacoes_itbi:        {row[0]:>8,} rows")

        cursor = await db.execute(
            "SELECT fonte, COUNT(*) as c FROM indicadores_economicos GROUP BY fonte ORDER BY fonte"
        )
        rows = await cursor.fetchall()
        total_ind = 0
        for r in rows:
            print(f"  indicadores ({r[0]:>10}): {r[1]:>8,} rows")
            total_ind += r[1]
        print(f"  indicadores total:      {total_ind:>8,} rows")

        cursor = await db.execute("SELECT tipo, COUNT(*) as c FROM fipezap_precos GROUP BY tipo")
        rows = await cursor.fetchall()
        for r in rows:
            print(f"  fipezap ({r[0]:>7}):     {r[1]:>8,} rows")

        cursor = await db.execute("SELECT COUNT(*) as c FROM airbnb_listings")
        row = await cursor.fetchone()
        print(f"  airbnb_listings:        {row[0]:>8,} rows")

        cursor = await db.execute("SELECT COUNT(*) as c FROM data_load_status")
        row = await cursor.fetchone()
        print(f"  data_load_status:       {row[0]:>8,} rows")

    finally:
        await db.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    asyncio.run(seed_all())
