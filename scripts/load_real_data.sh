#!/bin/bash
# Load ALL real ITBI transaction data from Prefeitura de São Paulo.
#
# This script downloads XLSX files for all available years (2006-2025),
# parses them, and inserts into the SQLite database with automatic
# bairro-center geocoding.
#
# Expected result: 2-3M+ real transactions visible on the map.
#
# If auto-download fails for some years, download manually from:
#   https://prefeitura.sp.gov.br/web/fazenda/w/acesso_a_informacao/31501
# Save XLSX files to: backend/data/itbi/raw/itbi_YYYY.xlsx
#
# Usage:
#   ./scripts/load_real_data.sh              # Full pipeline (all years)
#   ./scripts/load_real_data.sh 2023 2024    # Specific years only

set -euo pipefail

cd "$(dirname "$0")/.."

YEARS="${@}"

echo "=== ITBI Data Loader — São Paulo 2006-2025 ==="
echo ""

if [ -n "$YEARS" ]; then
    echo "Downloading years: $YEARS"
    cd backend
    python -m src.data_sources.itbi_downloader --download-all --years $YEARS --parse --insert --stats
else
    echo "Downloading ALL available years (2006-2025)..."
    cd backend
    python -m src.data_sources.itbi_downloader --download-all --parse --insert --stats
fi

echo ""
echo "=== Done! Start the backend to serve real data ==="
echo "  cd backend && python -m src.api.main"
