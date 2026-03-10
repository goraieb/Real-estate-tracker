"""Cliente para dados do GeoSampa (portal geoespacial da Prefeitura de SP).

O GeoSampa disponibiliza camadas geoespaciais via WFS/WMS:
- Planta Genérica de Valores (PGV): valores venais de referência por m²
- Zoneamento: uso permitido do solo
- Áreas de risco: inundação, deslizamento
- Plano Diretor: coeficientes de aproveitamento

Fonte: http://geosampa.prefeitura.sp.gov.br
"""

import logging
from typing import Optional

import pandas as pd
import requests

logger = logging.getLogger(__name__)

GEOSAMPA_WFS = "http://wfs.geosampa.prefeitura.sp.gov.br/geoserver/wfs"


class GeoSampaClient:
    """Cliente para dados geoespaciais do GeoSampa via WFS."""

    def __init__(self, timeout: int = 60):
        self.timeout = timeout
        self.session = requests.Session()

    def _wfs_request(self, layer: str, bbox: Optional[str] = None,
                     max_features: int = 1000, output_format: str = "application/json") -> dict:
        """Generic WFS GetFeature request.

        Args:
            layer: WFS layer name (e.g., 'PGV_2024').
            bbox: Optional bounding box 'lat1,lng1,lat2,lng2'.
            max_features: Maximum features to return.
            output_format: Response format.

        Returns:
            GeoJSON dict.
        """
        params = {
            "service": "WFS",
            "version": "2.0.0",
            "request": "GetFeature",
            "typeName": layer,
            "outputFormat": output_format,
            "count": max_features,
        }
        if bbox:
            params["bbox"] = bbox
            params["srsName"] = "EPSG:4326"

        resp = self.session.get(GEOSAMPA_WFS, params=params, timeout=self.timeout)
        resp.raise_for_status()
        return resp.json()

    def get_available_layers(self) -> list[str]:
        """List available WFS layers from GeoSampa.

        Returns:
            List of layer names.
        """
        params = {
            "service": "WFS",
            "version": "2.0.0",
            "request": "GetCapabilities",
        }
        try:
            resp = self.session.get(GEOSAMPA_WFS, params=params, timeout=self.timeout)
            resp.raise_for_status()
            # Parse XML capabilities
            from xml.etree import ElementTree
            root = ElementTree.fromstring(resp.text)
            ns = {"wfs": "http://www.opengis.net/wfs/2.0"}
            layers = []
            for ft in root.findall(".//wfs:FeatureType", ns):
                name = ft.find("wfs:Name", ns)
                if name is not None and name.text:
                    layers.append(name.text)
            return layers
        except Exception as e:
            logger.warning(f"Failed to get GeoSampa capabilities: {e}")
            return []

    def get_pgv(self, bbox: Optional[str] = None, max_features: int = 500) -> pd.DataFrame:
        """Busca dados da Planta Genérica de Valores (valor venal de referência).

        The PGV provides official reference land values per m² used for
        IPTU and ITBI calculation. Layer names vary by year.

        Args:
            bbox: Bounding box filter.
            max_features: Max features.

        Returns:
            DataFrame with columns ['setor', 'quadra', 'valor_m2', 'geometry'].
        """
        # Try known PGV layer names
        pgv_layers = [
            "geoportal:PGV_2024", "geoportal:PGV_2023",
            "PGV_2024", "PGV_2023", "PGV",
            "geoportal:DEF_PLANTA_GENERICA_VALORES",
        ]

        for layer in pgv_layers:
            try:
                geojson = self._wfs_request(layer, bbox=bbox, max_features=max_features)
                features = geojson.get("features", [])
                if features:
                    rows = []
                    for f in features:
                        props = f.get("properties", {})
                        rows.append({
                            "setor": props.get("sq_setor") or props.get("SETOR"),
                            "quadra": props.get("sq_quadra") or props.get("QUADRA"),
                            "valor_m2": props.get("vl_m2") or props.get("VALOR_M2"),
                            "logradouro": props.get("nm_logradouro") or props.get("LOGRADOURO"),
                            "geometry": f.get("geometry"),
                        })
                    return pd.DataFrame(rows)
            except Exception as e:
                logger.debug(f"PGV layer {layer} failed: {e}")
                continue

        logger.warning("No PGV data found from GeoSampa")
        return pd.DataFrame()

    def get_zoneamento(self, lat: float, lng: float) -> Optional[dict]:
        """Consulta o zoneamento de um ponto específico.

        Args:
            lat: Latitude.
            lng: Longitude.

        Returns:
            Dict with zoning info or None.
        """
        bbox = f"{lng-0.001},{lat-0.001},{lng+0.001},{lat+0.001}"
        zone_layers = [
            "geoportal:DEF_ZONEAMENTO_2023",
            "geoportal:ZONEAMENTO",
            "DEF_ZONEAMENTO",
        ]

        for layer in zone_layers:
            try:
                geojson = self._wfs_request(layer, bbox=bbox, max_features=1)
                features = geojson.get("features", [])
                if features:
                    return features[0].get("properties", {})
            except Exception:
                continue
        return None

    def get_areas_risco_inundacao(self, bbox: Optional[str] = None) -> pd.DataFrame:
        """Busca áreas de risco de inundação.

        Returns:
            DataFrame with flood risk areas.
        """
        risk_layers = [
            "geoportal:DEF_AREAS_RISCO_INUNDACAO",
            "geoportal:AREAS_RISCO_ALAGAMENTO",
            "DEF_AREAS_RISCO",
        ]

        for layer in risk_layers:
            try:
                geojson = self._wfs_request(layer, bbox=bbox, max_features=500)
                features = geojson.get("features", [])
                if features:
                    rows = []
                    for f in features:
                        props = f.get("properties", {})
                        rows.append({
                            "tipo_risco": props.get("tp_risco") or props.get("TIPO"),
                            "grau": props.get("grau_risco") or props.get("GRAU"),
                            "bairro": props.get("nm_bairro") or props.get("BAIRRO"),
                            "geometry": f.get("geometry"),
                        })
                    return pd.DataFrame(rows)
            except Exception:
                continue

        return pd.DataFrame()


if __name__ == "__main__":
    client = GeoSampaClient()
    layers = client.get_available_layers()
    print(f"Available layers: {len(layers)}")
    for layer in layers[:20]:
        print(f"  {layer}")
