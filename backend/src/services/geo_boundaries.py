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
    # Premium west/southwest
    "Pinheiros": (-23.5613, -46.6920),
    "Vila Madalena": (-23.5535, -46.6910),
    "Itaim Bibi": (-23.5868, -46.6803),
    "Jardim Paulista": (-23.5700, -46.6670),
    "Vila Olímpia": (-23.5960, -46.6870),
    "Alto de Pinheiros": (-23.5450, -46.7100),
    "Vila Nova Conceição": (-23.5870, -46.6700),
    "Higienópolis": (-23.5420, -46.6570),
    # South zone
    "Moema": (-23.6010, -46.6700),
    "Vila Mariana": (-23.5891, -46.6388),
    "Saúde": (-23.6200, -46.6350),
    "Ipiranga": (-23.5870, -46.6100),
    "Campo Belo": (-23.6200, -46.6670),
    "Santo Amaro": (-23.6500, -46.7100),
    "Cursino": (-23.6100, -46.6250),
    "Brooklin": (-23.6110, -46.6830),
    # Far south
    "Jabaquara": (-23.6350, -46.6450),
    "Interlagos": (-23.6800, -46.6750),
    "Campo Limpo": (-23.6480, -46.7680),
    "Capão Redondo": (-23.6680, -46.7810),
    "Grajaú": (-23.7400, -46.6950),
    "Cidade Dutra": (-23.7100, -46.6700),
    # Center
    "Consolação": (-23.5510, -46.6580),
    "Bela Vista": (-23.5560, -46.6430),
    "República": (-23.5440, -46.6430),
    "Liberdade": (-23.5600, -46.6330),
    "Brás": (-23.5420, -46.6180),
    "Cambuci": (-23.5650, -46.6200),
    "Pari": (-23.5280, -46.6150),
    "Sé": (-23.5507, -46.6334),
    "Campos Elíseos": (-23.5330, -46.6420),
    # West
    "Perdizes": (-23.5290, -46.6810),
    "Lapa": (-23.5190, -46.7010),
    "Butantã": (-23.5720, -46.7090),
    "Rio Pequeno": (-23.5650, -46.7450),
    "Raposo Tavares": (-23.5900, -46.7850),
    "Jaguaré": (-23.5450, -46.7450),
    "Vila Sônia": (-23.6050, -46.7350),
    "Pacaembu": (-23.5350, -46.6670),
    "Pompeia": (-23.5280, -46.6900),
    "Barra Funda": (-23.5230, -46.6700),
    "Vila Leopoldina": (-23.5260, -46.7270),
    # North
    "Santana": (-23.5050, -46.6270),
    "Tucuruvi": (-23.4810, -46.6100),
    "Casa Verde": (-23.5110, -46.6530),
    "Mandaqui": (-23.4900, -46.6300),
    "Vila Guilherme": (-23.5050, -46.6050),
    "Vila Maria": (-23.5150, -46.5950),
    # Far north
    "Tremembé": (-23.4600, -46.6280),
    "Jaçanã": (-23.4700, -46.6000),
    "Pirituba": (-23.4850, -46.7350),
    "Freguesia do Ó": (-23.5050, -46.6950),
    # East
    "Tatuapé": (-23.5380, -46.5770),
    "Mooca": (-23.5580, -46.6000),
    "Penha": (-23.5200, -46.5400),
    "Vila Prudente": (-23.5790, -46.5800),
    "Anália Franco": (-23.5540, -46.5610),
    "Belém": (-23.5400, -46.6100),
    "Carrão": (-23.5500, -46.5500),
    "Água Rasa": (-23.5600, -46.5750),
    "Aricanduva": (-23.5600, -46.5100),
    "Sapopemba": (-23.5950, -46.5200),
    # Far east
    "Itaquera": (-23.5400, -46.4550),
    "São Mateus": (-23.6100, -46.4750),
    "São Miguel Paulista": (-23.4950, -46.4400),
    "Ermelino Matarazzo": (-23.5100, -46.4800),
    "Guaianases": (-23.5400, -46.4100),
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
