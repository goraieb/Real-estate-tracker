"""Neighborhood boundary service using geobr package.

Downloads and caches GeoJSON boundaries for São Paulo neighborhoods
from IBGE via the geobr Python package.
"""

import json
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

CACHE_DIR = Path(__file__).parent.parent.parent / "data" / "geo"

# São Paulo municipality IBGE code
SP_IBGE_CODE = 3550308

# Fallback: approximate bairro centers for SP neighborhoods
# Used when geobr is not available or boundaries haven't been downloaded
SP_BAIRRO_CENTERS: dict[str, tuple[float, float]] = {
    "Pinheiros": (-23.5613, -46.6920),
    "Vila Madalena": (-23.5535, -46.6910),
    "Itaim Bibi": (-23.5868, -46.6803),
    "Moema": (-23.6010, -46.6700),
    "Vila Mariana": (-23.5891, -46.6388),
    "Perdizes": (-23.5290, -46.6810),
    "Consolação": (-23.5510, -46.6580),
    "Bela Vista": (-23.5560, -46.6430),
    "Jardim Paulista": (-23.5700, -46.6670),
    "Butantã": (-23.5720, -46.7090),
    "Lapa": (-23.5190, -46.7010),
    "Santana": (-23.5050, -46.6270),
    "Tatuapé": (-23.5380, -46.5770),
    "Mooca": (-23.5580, -46.6000),
    "Liberdade": (-23.5600, -46.6330),
    "Ipiranga": (-23.5870, -46.6100),
    "Saúde": (-23.6120, -46.6370),
    "Campo Belo": (-23.6180, -46.6650),
    "Brooklin": (-23.6110, -46.6830),
    "Santo Amaro": (-23.6510, -46.7090),
    "Vila Olímpia": (-23.5960, -46.6870),
    "Vila Nova Conceição": (-23.5870, -46.6700),
    "Higienópolis": (-23.5420, -46.6570),
    "Pacaembu": (-23.5350, -46.6670),
    "Pompeia": (-23.5280, -46.6900),
    "Barra Funda": (-23.5230, -46.6700),
    "República": (-23.5430, -46.6380),
    "Sé": (-23.5507, -46.6334),
    "Campos Elíseos": (-23.5330, -46.6420),
    "Vila Leopoldina": (-23.5260, -46.7270),
}


def get_sp_neighborhoods_geojson() -> dict | None:
    """Get São Paulo neighborhood boundaries as GeoJSON.

    Tries to load from cache first, then downloads via geobr.

    Returns:
        GeoJSON FeatureCollection dict, or None if unavailable.
    """
    cache_path = CACHE_DIR / "sp_bairros.geojson"

    # Try cache first
    if cache_path.exists():
        try:
            with open(cache_path) as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"Failed to read cached boundaries: {e}")

    # Try downloading via geobr
    try:
        return _download_sp_boundaries(cache_path)
    except ImportError:
        logger.warning("geobr not installed. Install with: pip install geobr")
        return None
    except Exception as e:
        logger.warning(f"Failed to download boundaries: {e}")
        return None


def _download_sp_boundaries(cache_path: Path) -> dict | None:
    """Download SP neighborhood boundaries using geobr."""
    import geobr

    logger.info("Downloading SP neighborhood boundaries via geobr...")
    gdf = geobr.read_neighborhood(year=2010)

    # Filter to São Paulo municipality
    sp_gdf = gdf[gdf["code_muni"] == SP_IBGE_CODE].copy()

    if sp_gdf.empty:
        logger.warning("No neighborhood data found for São Paulo")
        return None

    # Convert to GeoJSON
    geojson = json.loads(sp_gdf.to_json())

    # Cache it
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    with open(cache_path, "w") as f:
        json.dump(geojson, f)
    logger.info(f"Cached {len(sp_gdf)} neighborhoods to {cache_path}")

    return geojson


def get_bairro_center(bairro: str) -> tuple[float, float] | None:
    """Get approximate center coordinates for a São Paulo bairro.

    Args:
        bairro: Neighborhood name.

    Returns:
        (latitude, longitude) tuple, or None if unknown.
    """
    # Try exact match first
    if bairro in SP_BAIRRO_CENTERS:
        return SP_BAIRRO_CENTERS[bairro]

    # Try case-insensitive match
    bairro_lower = bairro.lower()
    for name, coords in SP_BAIRRO_CENTERS.items():
        if name.lower() == bairro_lower:
            return coords

    # Try partial match
    for name, coords in SP_BAIRRO_CENTERS.items():
        if bairro_lower in name.lower() or name.lower() in bairro_lower:
            return coords

    return None
