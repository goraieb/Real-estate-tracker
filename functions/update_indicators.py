"""
Cloud Function: Daily economic indicator update.

Fetches BCB (Selic, IPCA, IGP-M) and IBGE data,
writes updated indicators.json to Firebase Hosting.

Deploy:
  gcloud functions deploy update-indicators \
    --runtime python311 \
    --trigger-topic daily-indicators \
    --region us-central1

Schedule (Cloud Scheduler):
  gcloud scheduler jobs create pubsub daily-indicators-job \
    --schedule="0 8 * * *" \
    --topic=daily-indicators \
    --time-zone="America/Sao_Paulo"
"""

import json
import requests
from datetime import datetime, timedelta


BCB_BASE = "https://api.bcb.gov.br/dados/serie/bcdata.sgs"

SERIES = {
    "selic_meta": 432,       # Selic meta
    "ipca_12m": 13522,       # IPCA accumulated 12 months
    "igpm_12m": 189,         # IGP-M monthly
    "poupanca": 195,         # Savings yield
    "cdi": 4389,             # CDI daily
}


def fetch_bcb_latest(series_id: int) -> float | None:
    """Fetch latest value from BCB time series API."""
    end = datetime.now().strftime("%d/%m/%Y")
    start = (datetime.now() - timedelta(days=90)).strftime("%d/%m/%Y")
    url = f"{BCB_BASE}.{series_id}/dados?formato=json&dataInicial={start}&dataFinal={end}"
    try:
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        if data:
            return float(data[-1]["valor"])
    except Exception as e:
        print(f"Error fetching series {series_id}: {e}")
    return None


def update_indicators(event=None, context=None):
    """Main Cloud Function entry point."""
    indicators = {}

    for name, series_id in SERIES.items():
        value = fetch_bcb_latest(series_id)
        if value is not None:
            indicators[name] = value

    indicators["updated_at"] = datetime.now().isoformat()
    indicators["source"] = "BCB SGS API"

    # Write to local file (in production, upload to Firebase Hosting or Firestore)
    output = json.dumps(indicators, indent=2, ensure_ascii=False)
    print(f"Updated indicators: {output}")

    # TODO: Upload to Firebase Hosting via Admin SDK
    # from firebase_admin import storage
    # bucket = storage.bucket()
    # blob = bucket.blob('data/indicators.json')
    # blob.upload_from_string(output, content_type='application/json')

    return indicators


if __name__ == "__main__":
    result = update_indicators()
    print(json.dumps(result, indent=2))
