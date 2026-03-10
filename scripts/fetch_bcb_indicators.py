#!/usr/bin/env python3
"""
Fetch latest BCB economic indicators and write to JSON.
Runs in GitHub Actions at build time to keep indicators fresh.

Usage:
    python scripts/fetch_bcb_indicators.py --output frontend/public/data/indicators.json
"""

import argparse
import json
import sys
from datetime import datetime, timedelta
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.error import URLError


# BCB SGS series codes
SERIES = {
    "selic": 432,       # Selic target rate (% p.a.)
    "ipca": 433,        # IPCA monthly (% change)
    "igpm": 189,        # IGP-M monthly (% change)
    "cdi": 4389,        # CDI daily rate (% p.a.)
    "tr": 226,          # TR monthly (% change)
    "poupanca": 25,     # Poupança yield (% monthly)
}


def fetch_bcb_series(code: int, start: str, end: str) -> list[dict]:
    """Fetch a BCB SGS time series as JSON."""
    url = (
        f"https://api.bcb.gov.br/dados/serie/bcdata.sgs.{code}/dados"
        f"?formato=json&dataInicial={start}&dataFinal={end}"
    )
    req = Request(url, headers={"Accept": "application/json"})
    try:
        with urlopen(req, timeout=30) as resp:
            return json.loads(resp.read())
    except (URLError, TimeoutError) as e:
        print(f"  Warning: Failed to fetch series {code}: {e}", file=sys.stderr)
        return []


def compute_12m_accumulated(monthly_values: list[dict]) -> float | None:
    """Sum the last 12 monthly % changes."""
    if len(monthly_values) < 12:
        return None
    last12 = monthly_values[-12:]
    # Compound: (1 + r1/100) * (1 + r2/100) * ... - 1
    product = 1.0
    for entry in last12:
        val = float(entry["valor"].replace(",", "."))
        product *= (1 + val / 100)
    return round((product - 1) * 100, 2)


def get_latest_rate(values: list[dict]) -> float | None:
    """Get the most recent value from a series."""
    if not values:
        return None
    return float(values[-1]["valor"].replace(",", "."))


def main():
    parser = argparse.ArgumentParser(description="Fetch BCB indicators")
    parser.add_argument("--output", required=True, help="Output JSON path")
    args = parser.parse_args()

    end = datetime.now()
    start = end - timedelta(days=400)  # ~13 months for 12m accumulated
    start_str = start.strftime("%d/%m/%Y")
    end_str = end.strftime("%d/%m/%Y")

    print(f"Fetching BCB indicators ({start_str} to {end_str})...")

    # Fetch all series
    data = {}
    for name, code in SERIES.items():
        print(f"  Fetching {name} (series {code})...")
        data[name] = fetch_bcb_series(code, start_str, end_str)

    # Compute output
    selic_rate = get_latest_rate(data["selic"])
    ipca_12m = compute_12m_accumulated(data["ipca"])
    igpm_12m = compute_12m_accumulated(data["igpm"])

    # Poupança annual: latest monthly * 12 (simplified)
    poupanca_monthly = get_latest_rate(data["poupanca"])
    poupanca_anual = round(poupanca_monthly * 12, 2) if poupanca_monthly else None

    # Financing rate estimate: Selic + 3.5pp spread (typical market rate)
    financiamento_tx = round(selic_rate + 3.5, 2) if selic_rate else None

    result = {
        "selic_anual": selic_rate,
        "ipca_12m": ipca_12m,
        "igpm_12m": igpm_12m,
        "poupanca_anual": poupanca_anual,
        "financiamento_tx": financiamento_tx,
        "fetched_at": end.isoformat(),
    }

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(result, indent=2, ensure_ascii=False))

    print(f"\nWritten to {output_path}:")
    for k, v in result.items():
        print(f"  {k}: {v}")


if __name__ == "__main__":
    main()
