"""Data source clients for Brazilian real estate market data."""

from .bcb import BCBClient
from .ibge import IBGEClient
from .ipeadata import IpeadataClient
from .fipezap import FipeZAPParser
from .insideairbnb import InsideAirbnbClient
from .itbi import ITBIParser

__all__ = [
    "BCBClient",
    "IBGEClient",
    "IpeadataClient",
    "FipeZAPParser",
    "InsideAirbnbClient",
    "ITBIParser",
]
