"""Data source clients for Brazilian real estate market data."""

from .bcb import BCBClient
from .ibge import IBGEClient
from .ipeadata import IpeadataClient
from .fipezap import FipeZAPParser
from .insideairbnb import InsideAirbnbClient
from .itbi import ITBIParser
from .b3 import B3Client
from .secovi import SecoviClient
from .geosampa import GeoSampaClient
from .abecip import ABECIPClient
from .cub import CUBClient

__all__ = [
    "BCBClient",
    "IBGEClient",
    "IpeadataClient",
    "FipeZAPParser",
    "InsideAirbnbClient",
    "ITBIParser",
    "B3Client",
    "SecoviClient",
    "GeoSampaClient",
    "ABECIPClient",
    "CUBClient",
]
