"""Neighborhood boundary service using geobr package.

Downloads and caches GeoJSON boundaries for São Paulo neighborhoods
from IBGE via the geobr Python package.
"""

import json
import logging
import re
import unicodedata
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
    "Morumbi": (-23.6230, -46.7210),
    "Vila Andrade": (-23.6350, -46.7350),
    # South zone
    "Moema": (-23.6010, -46.6700),
    "Vila Mariana": (-23.5891, -46.6388),
    "Saúde": (-23.6200, -46.6350),
    "Ipiranga": (-23.5870, -46.6100),
    "Campo Belo": (-23.6200, -46.6670),
    "Santo Amaro": (-23.6500, -46.7100),
    "Cursino": (-23.6100, -46.6250),
    "Brooklin": (-23.6110, -46.6830),
    "Socorro": (-23.6700, -46.7000),
    # Far south
    "Jabaquara": (-23.6350, -46.6450),
    "Interlagos": (-23.6800, -46.6750),
    "Campo Limpo": (-23.6480, -46.7680),
    "Capão Redondo": (-23.6680, -46.7810),
    "Grajaú": (-23.7400, -46.6950),
    "Cidade Dutra": (-23.7100, -46.6700),
    "Cidade Ademar": (-23.6600, -46.6400),
    "Pedreira": (-23.6800, -46.6350),
    "Jardim Ângela": (-23.7100, -46.7800),
    "Jardim São Luís": (-23.6700, -46.7500),
    "Parelheiros": (-23.7800, -46.7300),
    "Campo Grande": (-23.6600, -46.7600),
    "Marsilac": (-23.8200, -46.6900),
    # Center
    "Consolação": (-23.5510, -46.6580),
    "Bela Vista": (-23.5560, -46.6430),
    "República": (-23.5440, -46.6430),
    "Liberdade": (-23.5600, -46.6330),
    "Brás": (-23.5420, -46.6180),
    "Cambuci": (-23.5650, -46.6200),
    "Pari": (-23.5280, -46.6150),
    "Sé": (-23.5507, -46.6334),
    "Santa Cecília": (-23.5350, -46.6520),
    "Bom Retiro": (-23.5280, -46.6380),
    "Campos Elíseos": (-23.5330, -46.6420),
    # West
    "Perdizes": (-23.5290, -46.6810),
    "Lapa": (-23.5190, -46.7010),
    "Butantã": (-23.5720, -46.7090),
    "Rio Pequeno": (-23.5650, -46.7450),
    "Raposo Tavares": (-23.5900, -46.7850),
    "Jaguaré": (-23.5450, -46.7450),
    "Vila Sônia": (-23.6050, -46.7350),
    "Jaguara": (-23.5150, -46.7350),
    "Vila dos Remédios": (-23.5100, -46.7200),
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
    "Vila Medeiros": (-23.4950, -46.5850),
    "Limão": (-23.5100, -46.6700),
    "Cachoeirinha": (-23.4750, -46.6600),
    # Far north
    "Tremembé": (-23.4600, -46.6280),
    "Jaçanã": (-23.4700, -46.6000),
    "Pirituba": (-23.4850, -46.7350),
    "Freguesia do Ó": (-23.5050, -46.6950),
    "Brasilândia": (-23.4700, -46.6800),
    "São Domingos": (-23.4800, -46.7500),
    "Jaraguá": (-23.4550, -46.7600),
    "Perus": (-23.4100, -46.7500),
    "Anhanguera": (-23.4000, -46.7800),
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
    "Vila Formosa": (-23.5600, -46.5400),
    "Vila Matilde": (-23.5350, -46.5300),
    "Artur Alvim": (-23.5450, -46.4800),
    "Cangaíba": (-23.5000, -46.5100),
    "Ponte Rasa": (-23.5100, -46.5000),
    "São Lucas": (-23.5850, -46.5500),
    "Cidade Líder": (-23.5700, -46.4900),
    # Far east
    "Itaquera": (-23.5400, -46.4550),
    "São Mateus": (-23.6100, -46.4750),
    "São Miguel Paulista": (-23.4950, -46.4400),
    "Ermelino Matarazzo": (-23.5100, -46.4800),
    "Guaianases": (-23.5400, -46.4100),
    "Cidade Tiradentes": (-23.5800, -46.4000),
    "José Bonifácio": (-23.5600, -46.4300),
    "Lajeado": (-23.5400, -46.3900),
    "Iguatemi": (-23.5900, -46.4400),
    "São Rafael": (-23.6200, -46.4600),
    "Vila Jacuí": (-23.4850, -46.4600),
    "Jardim Helena": (-23.4800, -46.4300),
    "Vila Curuçá": (-23.5000, -46.4300),
    # --- Added: neighborhoods missing from original list ---
    "Cerqueira César": (-23.5620, -46.6720),
    "Indianópolis": (-23.5950, -46.6550),
    "Paraíso": (-23.5750, -46.6420),
    "Aclimação": (-23.5700, -46.6300),
    "Planalto Paulista": (-23.6100, -46.6550),
    "Chácara Santo Antônio": (-23.6350, -46.6950),
    "Vila Clementino": (-23.5980, -46.6400),
    "Chácara Klabin": (-23.5850, -46.6350),
    "Jardim da Saúde": (-23.6250, -46.6200),
    "Jardim Marajoara": (-23.6550, -46.6850),
    "Jardim Prudência": (-23.6400, -46.6550),
    "Vila Alexandria": (-23.6450, -46.6850),
    "Vila Mascote": (-23.6350, -46.6700),
    "Sacomã": (-23.6050, -46.6100),
    "Vila Gumercindo": (-23.5950, -46.6200),
    "Jardim Vila Mariana": (-23.5950, -46.6350),
    "Vila Monumento": (-23.5800, -46.6150),
    "Jardim Aeroporto": (-23.6250, -46.6650),
    "Chácara Flora": (-23.6500, -46.6650),
    "Vila Cordeiro": (-23.6050, -46.6900),
    "Jardim Luzitânia": (-23.5900, -46.6500),
    "Jardim Europa": (-23.5750, -46.6800),
    "Cidade Vargas": (-23.6350, -46.6300),
    "Vila Santa Catarina": (-23.6550, -46.6500),
    "Jardim Colombo": (-23.5750, -46.7150),
    "Vila Hamburguesa": (-23.5250, -46.7100),
    "Sumaré": (-23.5400, -46.6750),
    "Sumarezinho": (-23.5350, -46.6850),
    "Jardim das Bandeiras": (-23.5600, -46.7000),
    "Vila Romana": (-23.5250, -46.6950),
    "Água Branca": (-23.5200, -46.6900),
    "Vila Anglo Brasileira": (-23.5200, -46.6800),
    "Belenzinho": (-23.5450, -46.6050),
    "Ibirapuera": (-23.5870, -46.6600),
    "Vila Ema": (-23.5750, -46.5300),
    "Vila Carmosina": (-23.5600, -46.4700),
    "Água Fria": (-23.4950, -46.6200),
    "Jardim América": (-23.5650, -46.6770),
    "Jardim Ubirajara": (-23.6700, -46.6450),
    "Vila Bertioga": (-23.5500, -46.5950),
    "Vila Regente Feijó": (-23.5600, -46.5700),
    "Vila Alpina": (-23.5700, -46.5500),
    "Vila Guarani": (-23.6350, -46.6350),
    "Jardim Bonfiglioli": (-23.5650, -46.7350),
    "Jardim Peri": (-23.4700, -46.6450),
    "Vila Nilo": (-23.4650, -46.6100),
    "Jardim Tremembé": (-23.4550, -46.6350),
    "Vila Nova Cachoeirinha": (-23.4800, -46.6550),
    "Jardim Miriam": (-23.6750, -46.6300),
    "Jardim Popular": (-23.5200, -46.4800),
    "Vila Rica": (-23.5100, -46.4600),
    "Parque do Carmo": (-23.5750, -46.4600),
    "Jardim Aricanduva": (-23.5550, -46.5050),
    "Vila Esperança": (-23.5200, -46.5350),
    "Jardim Peri Peri": (-23.5150, -46.7450),
    "Jardim Jussara": (-23.4800, -46.7550),
    "Vila Pirituba": (-23.4850, -46.7200),
    "Jardim Ester": (-23.5800, -46.7550),
    "Vila Progresso": (-23.5200, -46.4950),
    "Vila Califórnia": (-23.5850, -46.5300),
    "Jardim Celeste": (-23.6100, -46.5350),
    "Jardim Tietê": (-23.5100, -46.5650),
}

# Common abbreviations found in ITBI bairro fields
_ABBREVIATIONS: dict[str, str] = {
    "VL": "VILA", "VL.": "VILA",
    "JD": "JARDIM", "JD.": "JARDIM",
    "STO": "SANTO", "STA": "SANTA",
    "PQ": "PARQUE", "PQ.": "PARQUE",
    "PCA": "PRACA", "PCA.": "PRACA",
    "CJ": "CONJUNTO",
    "CID": "CIDADE",
    "NV": "NOVA",
}

# Aliases: alternative names that map to canonical SP_BAIRRO_CENTERS keys
# Applied AFTER accent stripping and uppercasing
BAIRRO_ALIASES: dict[str, str] = {
    "CENTRO": "SE",
    "CENTRO HISTORICO": "SE",
    "V MARIANA": "VILA MARIANA",
    "V MADALENA": "VILA MADALENA",
    "V OLIMPIA": "VILA OLIMPIA",
    "CHAC SANTO ANTONIO": "CHACARA SANTO ANTONIO",
    "CHAC STO ANTONIO": "CHACARA SANTO ANTONIO",
    "CH SANTO ANTONIO": "CHACARA SANTO ANTONIO",
    "CH STO ANTONIO": "CHACARA SANTO ANTONIO",
    "CHAC KLABIN": "CHACARA KLABIN",
    "JD EUROPA": "JARDIM EUROPA",
    "JD PAULISTA": "JARDIM PAULISTA",
    "JD AMERICA": "JARDIM AMERICA",
    "JARDIM AMERICA": "JARDIM AMERICA",
    "JD ANGELICA": "HIGIENOPOLIS",
    "NOSSA SENHORA DO O": "FREGUESIA DO O",
    "N SRA DO O": "FREGUESIA DO O",
    "NS DO O": "FREGUESIA DO O",
    "ERM MATARAZZO": "ERMELINO MATARAZZO",
    "ERM. MATARAZZO": "ERMELINO MATARAZZO",
    "S MIGUEL PAULISTA": "SAO MIGUEL PAULISTA",
    "S MIGUEL": "SAO MIGUEL PAULISTA",
    "GUAIANAZES": "GUAIANASES",
    "VILA DAS BELEZAS": "CAMPO LIMPO",
    "V PROGREDIOR": "CAMPO BELO",
}

# Regex to detect non-neighborhood values (building/tower names)
_BUILDING_PATTERN = re.compile(
    r"^(TORRE|BLOCO|EDIF|EDIFICIO|COND|CONDOMINIO|RES|RESIDENCIAL|APT|APTO|SALA|LOJA|GARAGEM|VAGA)\b",
    re.IGNORECASE,
)


def _strip_accents(text: str) -> str:
    """Remove diacritics/accents from a string."""
    nfkd = unicodedata.normalize("NFKD", text)
    return nfkd.encode("ascii", errors="ignore").decode("ascii")


def normalize_bairro(raw: str) -> str | None:
    """Normalize a bairro name for matching.

    Returns None if the value looks like a building name, not a neighborhood.
    """
    if not raw or not isinstance(raw, str):
        return None

    text = raw.strip().upper()

    # Filter out building/tower names
    if _BUILDING_PATTERN.match(text):
        return None

    # Filter out numeric-only or very short values
    if len(text) < 2 or text.isdigit():
        return None

    # Strip accents
    text = _strip_accents(text)

    # Expand abbreviations (word-by-word)
    words = text.split()
    expanded = []
    for w in words:
        expanded.append(_ABBREVIATIONS.get(w, w))
    text = " ".join(expanded)

    # Remove punctuation artifacts
    text = text.replace(".", "").replace(",", "").strip()

    return text if text else None


# Pre-build normalized lookup index at module load time
_NORMALIZED_INDEX: dict[str, tuple[float, float]] = {}
for _name, _coords in SP_BAIRRO_CENTERS.items():
    _key = _strip_accents(_name).upper()
    _NORMALIZED_INDEX[_key] = _coords


# ---------------------------------------------------------------------------
# SQL Cadastral setor-to-bairro mapping
# Derived empirically: first 3 digits of sql_cadastral (setor fiscal) →
# most common bairro name in existing geocoded records.
# Used to rescue NULL-bairro records that have a valid sql_cadastral.
# ---------------------------------------------------------------------------
SETOR_TO_BAIRRO: dict[str, str] = {
    "100": "CERQUEIRA CESAR",
    "101": "BUTANTA",
    "102": "VILA EMA",
    "103": "SANTO AMARO",
    "104": "FREGUESIA DO O",
    "105": "PIRITUBA",
    "106": "JD SAO JOSE",
    "107": "FREGUESIA DO O",
    "108": "CENTRO",
    "109": "TREMEMBE",
    "110": "PERDIZES",
    "111": "HIGIENOPOLIS",
    "112": "SAO MIGUEL PAULISTA",
    "113": "VILA RE",
    "114": "ITAQUERA",
    "115": "GUAIANAZES",
    "116": "VL FORMOSA",
    "117": "VILA EMA",
    "118": "VL PRUDENTE",
    "119": "JD SECKLER",
    "120": "PERDIZES",
    "121": "PERDIZES",
    "122": "VL ANDRADE",
    "123": "MORUMBI",
    "124": "VL JARAGUA",
    "125": "PIRITUBA",
    "126": "JD PIRITUBA",
    "127": "TREMEMBE",
    "130": "PINHEIROS",
    "131": "ERM. MATARAZZO",
    "132": "AIA",
    "134": "S MIGUEL PAULISTA",
    "135": "RE",
    "136": "GUAIANAZES",
    "138": "ITAQUERA",
    "139": "SAO MIGUEL PAULISTA",
    "140": "JARDIM PAULISTA",
    "141": "JARDIM PAULISTANO",
    "142": "JD BRASIL",
    "143": "ITAQUERA",
    "144": "VILA CARMOSINA",
    "145": "CIDADE LIDER",
    "146": "JD BRASILIA",
    "147": "VILA CARRAO",
    "148": "SAPOPEMBA",
    "149": "SAO MATEUS",
    "150": "PINHEIROS",
    "151": "ITAQUERA",
    "152": "RAFAEL",
    "153": "SAPOPEMBA",
    "154": "JD SAPOPEMBA",
    "155": "SAPOPEMBA",
    "156": "VILA PRUDENTE",
    "157": "JD CELESTE",
    "159": "BUTANTA",
    "160": "ITAIM BIBI",
    "161": "ITAIM BIBI",
    "162": "INTERLAGOS",
    "163": "INTERLAGOS",
    "165": "STO AMARO",
    "166": "CAPAO REDONDO",
    "167": "CAPAO REDONDO",
    "168": "CAMPO LIMPO",
    "169": "VILA ANDRADE",
    "170": "MORUMBI",
    "171": "VILA ANDRADE",
    "172": "JD MIRIAM",
    "173": "JD UBIRAJARA",
    "174": "ILA",
    "175": "PRQ GRAJAU",
    "176": "CAPELA DO SOCORRO",
    "178": "VILA SAO JOSE",
    "180": "BOM RETIRO",
    "181": "STO AMARO",
    "182": "O JOSE",
    "183": "CAPAO REDONDO",
    "184": "STO AMARO CPO LIMPO",
    "185": "E DP ED PAU-BRASIL",
    "186": "VL JAGUARE",
    "187": "PERUS",
    "188": "JARAGUA",
    "189": "JARAGUA",
    "190": "BARRA FUNDA",
    "191": "BARRA FUNDA",
    "193": "GUAIANAZES",
    "194": "PQE IGUATEMI",
    "196": "BELENZINHO",
    "197": "BARRA FUNDA",
    "198": "TUCURUVI",
    "199": "VILA JAGUARA",
    "200": "SANTA CECILIA",
    "201": "JD JOAO XXIII BUTANTA",
    "202": "PQ ANHANGUERA",
    "203": "PERUS",
    "204": "BRAS",
    "205": "BRAS",
    "206": "CH JARAGUA",
    "207": "SE",
    "208": "BRAS",
    "209": "JARAGUA",
    "210": "PERDIZES",
    "211": "PERDIZES",
    "214": "JARAGUA",
    "216": "CDHU BRASILANDIA C",
    "220": "PERDIZES",
    "222": "JD TREMEMBE",
    "228": "TUCURUVI",
    "229": "JD JOSE LUIZ",
    "230": "CJ HAB JOSE BONIFACIO",
    "231": "VILA ROMANA",
    "232": "ITAQUERA",
    "236": "GUAIANAZES",
    "237": "GUAIANAZES",
    "239": "GUAIANAZES",
    "240": "LAPA",
    "241": "ITAQUERA",
    "242": "VILA CARMOSINA",
    "243": "CJ HAB JOSE BONIFAC C",
    "244": "GUAIANAZES",
    "245": "GUAIANASES",
    "248": "GUAIANAZES",
    "250": "BRAS",
    "252": "ITAQUERA",
    "259": "SANTO AMARO",
    "260": "BELENZINHO",
    "261": "PARELHEIROS",
    "262": "LOT SAO JOSE",
    "265": "REC CAMPO BELO",
    "270": "MOOCA",
    "273": "STO AMARO",
    "274": "PARELHEIROS",
    "280": "MOOCA",
    "281": "JD NOVO PARELHEIROS",
    "283": "PARELHEIROS",
    "285": "PRQ SUMARE",
    "290": "BELENZINHO",
    "299": "VILA OLIMPIA",
    "300": "TATUAPE",
    "301": "TATUAPE",
    "302": "BRAS",
    "303": "VILA FORMOSA",
    "304": "VILA GUILHERME",
    "305": "SANTANA",
    "306": "MOOCA",
    "307": "FREGUESIA DO O",
    "308": "BRASILANDIA",
    "309": "SAUDE",
    "310": "VILA GUARANI",
    "311": "MOOCA",
    "320": "MOOCA",
    "321": "MOOCA",
    "330": "ACLIMACAO",
    "340": "CAMBUCI",
    "350": "VILA MONUMENTO",
    "351": "VILA MONUMENTO",
    "360": "PARAISO",
    "361": "VL NOVA CONCEICAO",
    "370": "VILA MARIANA",
    "371": "VILA MARIANA",
    "380": "ACLIMACAO",
    "381": "VL MARIANA",
    "390": "VILA MARIANA",
    "391": "VILA MARIANA",
    "400": "IPIRANGA",
    "401": "IPIRANGA",
    "403": "LIBERDADE",
    "404": "LIBERDADE",
    "405": "CAMBUCI",
    "406": "CAMBUCI",
    "410": "INDIANOPOLIS",
    "411": "MOEMA",
    "412": "INDIANOPOLIS",
    "420": "VILA CLEMENTINO",
    "421": "VL CLEMENTINO",
    "422": "VL MARIANA",
    "430": "IPIRANGA",
    "431": "IPIRANGA",
    "432": "IPIRANGA",
    "440": "VILA PRUDENTE",
    "441": "VILA PRUDENTE",
    "450": "INDIANOPOLIS",
    "451": "INDIANOPOLIS",
    "452": "PLANALTO PAULISTA",
    "453": "PLANALTO PAULISTA",
    "460": "SAUDE",
    "461": "SAUDE",
    "462": "SAUDE",
    "470": "SAUDE",
    "471": "JABAQUARA",
    "472": "PLANALTO PAULISTA",
    "480": "SAUDE",
    "481": "VILA BRASILINA",
    "482": "VL BRASILINA",
    "483": "VL DA SAUDE",
    "484": "SAUDE",
    "490": "SAUDE",
    "491": "SAUDE",
    "492": "SAUDE",
    "494": "SAUDE",
    "500": "IPIRANGA",
    "501": "SACOMA",
    "502": "IPIRANGA",
    "503": "LIBERDADE",
    "504": "IS LIBERDADE",
    "505": "LIBERDADE",
    "506": "LIBERDADE",
    "507": "LIBERDADE",
    "508": "LIBERDADE",
    "510": "VILA PRUDENTE",
    "511": "VILA CALIFORNIA",
    "512": "VL PRUDENTE",
    "513": "VL PRUDENTE",
    "520": "ALTO DA MOOCA",
    "521": "VL PRUDENTE",
    "522": "VL PRUDENTE",
    "523": "BOSQUES ANALIA FRANCO",
    "530": "VILA FORMOSA",
    "531": "SAPOPEMBA",
    "532": "TATUAPE",
    "533": "VL FORMOSA",
    "536": "JD ANALIA FRANCO",
    "540": "TATUAPE",
    "541": "TATUAPE",
    "542": "TATUAPE",
    "550": "VILA CARRAO",
    "551": "VL FORMOSA",
    "552": "VL FORMOSA",
    "553": "VILA CARRAO",
    "554": "VILA FORMOSA",
    "560": "TATUAPE",
    "561": "TATUAPE",
    "562": "TATUAPE",
    "570": "VILA ARICANDUVA",
    "571": "VL MATILDE",
    "572": "VILA MATILDE",
    "580": "VL. MATILDE",
    "581": "VILA MATILDE",
    "582": "VL MATILDE",
    "590": "VILA ESPERANCA",
    "591": "VILA RE",
    "592": "PENHA",
    "593": "PENHA",
    "600": "CENTRO",
    "601": "PENHA",
    "602": "CENTRO",
    "603": "CENTRO",
    "604": "BELA VISTA",
    "605": "BELA VISTA",
    "606": "BELA VISTA",
    "607": "BELA VISTA",
    "610": "PENHA",
    "611": "PENHA",
    "620": "TATUAPE",
    "621": "TATUAPE",
    "622": "TATUAPE",
    "631": "CD ATUA VL MARIA",
    "632": "VL MARIA",
    "640": "VILA MARIA",
    "641": "VILA MARIA",
    "642": "VILA GUILHERME",
    "650": "VILA MARIA",
    "651": "ALTA VISTA VL MARIA",
    "660": "PLENO JACANA LOTE A",
    "661": "JACANA",
    "662": "JD BRASIL",
    "663": "SANTANA",
    "664": "JD BRASIL",
    "670": "JACANA",
    "671": "TUCURUVI",
    "672": "TUCURUVI",
    "673": "JACANA",
    "674": "JACANA",
    "675": "JACANA",
    "680": "TUCURUVI",
    "681": "TUCURUVI",
    "682": "TUCURUVI",
    "683": "TUCURUVI",
    "684": "VL GUILHERME",
    "685": "TUCURUVI",
    "690": "TUCURUVI",
    "691": "SANTANA",
    "692": "SANTANA",
    "700": "STA CECILIA",
    "701": "AGUA FRIA",
    "702": "STA CECILIA",
    "703": "SANTA CECILIA",
    "704": "TUCURUVI",
    "705": "CONSOLACAO",
    "706": "CONSOLACAO",
    "707": "CONSOLACAO",
    "708": "CENTRO",
    "709": "REPUBLICA",
    "710": "MANDAQUI",
    "711": "PARQUE DO MANDAQUI",
    "712": "MANDAQUI",
    "713": "SANTANA",
    "714": "MANDAQUI",
    "715": "MANDAQUI",
    "720": "SANTANA",
    "721": "SANTANA",
    "722": "SANTANA",
    "730": "SANTANA",
    "731": "SANTANA",
    "732": "SANTANA",
    "740": "LIMAO",
    "741": "LIMAO",
    "742": "NOSSA SENHORA DO O",
    "743": "N SRA DO O",
    "750": "CASA VERDE",
    "751": "CASA VERDE",
    "752": "LIMAO",
    "753": "LIMAO",
    "760": "FREGUESIA DO O",
    "761": "LIMAO",
    "763": "LIMAO",
    "764": "LIMAO",
    "765": "LIMAO",
    "767": "FREGUESIA DO O",
    "770": "PIRITUBA",
    "771": "PIRITUBA",
    "772": "PIRITUBA",
    "773": "PIRITUBA",
    "780": "PIRITUBA",
    "781": "PIRITUBA",
    "782": "PQ SAO DOMINGOS",
    "783": "PIRITUBA",
    "784": "PQ SAO DOMINGOS",
    "785": "PIRITUBA",
    "791": "JAGUARE",
    "796": "BUTANTA",
    "797": "BUTANTA",
    "800": "VL LEOPOLDINA",
    "801": "LAPA",
    "802": "CAMPOS ELISEOS",
    "803": "CAMPOS ELISEOS",
    "804": "CAMPOS ELISEOS",
    "806": "LUZ",
    "807": "CENTRO",
    "808": "CENTRO",
    "809": "CENTRO",
    "810": "VILA MADALENA",
    "811": "VILA MADALENA",
    "812": "PINHEIROS",
    "813": "VL MADALENA",
    "821": "JAGUARE",
    "822": "JAGUARE",
    "823": "BUTANTA",
    "824": "BUTANTA",
    "825": "BUTANTA",
    "826": "BUTANTA",
    "830": "PINHEIROS",
    "831": "PINHEIROS",
    "832": "PINHEIROS",
    "842": "BUTANTA",
    "850": "BROOKLIN",
    "851": "BROOKLIN",
    "852": "BROOKLIN",
    "853": "BROOKLIN PAULISTA",
    "854": "BROOKLIN PAULISTA",
    "855": "BROOKLIN",
    "856": "BROOKLIN",
    "860": "CAMPO BELO",
    "861": "CAMPO BELO",
    "862": "CAMPO BELO",
    "863": "CAMPO BELO",
    "864": "CAMPO BELO",
    "870": "SANTO AMARO",
    "871": "SANTO AMARO",
    "872": "SANTO AMARO",
    "873": "RESERVA GRANJA JULIETA",
    "874": "STO AMARO",
    "880": "SANTO AMARO",
    "881": "STO AMARO",
    "882": "STO AMARO",
    "890": "BROOKLIN PAULISTA",
    "891": "JABAQUARA",
    "892": "VL STA CATARINA",
    "893": "JABAQUARA",
    "894": "PRQ JABAQUARA",
    "895": "VILA MASCOTE",
    "900": "JARDIM PRUDENCIA",
    "901": "BELA VISTA",
    "902": "JD CAMPO GRANDE",
    "903": "BELA VISTA",
    "904": "BELA VISTA",
    "905": "BELA VISTA",
    "906": "BELA VISTA",
    "907": "JD PAULISTA",
    "908": "JARDIM PAULISTA",
    "909": "JD PAULISTA",
    "910": "JABAQUARA",
    "912": "JABAQUARA",
    "913": "JABAQUARA",
    "914": "JABAQUARA",
    "915": "VILA MASCOTE",
    "930": "SOCORRO",
    "931": "VL SOCORRO",
    "941": "UROPA",
    "942": "CAPELA DO SOCORRO",
    "950": "CIDADE DUTRA",
    "951": "INTERLAGOS",
    "952": "INTERLAGOS",
    "953": "SOCORRO",
    "954": "CIDADE DUTRA",
    "960": "ALTO DE PINHEIROS",
    "961": "ALTO DE PINHEIROS",
    "970": "VL LEOPOLDINA",
    "971": "VILA LEOPOLDINA",
    "980": "LAPA",
    "990": "LAPA",
}


def get_bairro_from_setor(sql_cadastral: str) -> str | None:
    """Infer bairro name from SQL cadastral setor fiscal (first 3 digits).

    Falls back to None if sql_cadastral is too short or setor is unknown.
    The returned name still needs to go through get_bairro_center() for coords.
    """
    if not sql_cadastral or len(sql_cadastral) < 3:
        return None
    setor = sql_cadastral[:3]
    return SETOR_TO_BAIRRO.get(setor)


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

    Uses accent-stripped, abbreviation-expanded normalization for robust
    matching against SP_BAIRRO_CENTERS. Filters out building names.

    Args:
        bairro: Neighborhood name (any casing, with or without accents).

    Returns:
        (latitude, longitude) tuple, or None if unknown.
    """
    normalized = normalize_bairro(bairro)
    if not normalized:
        return None

    # Check aliases first (maps alternative names to canonical ones)
    if normalized in BAIRRO_ALIASES:
        canonical = BAIRRO_ALIASES[normalized]
        # The alias value is already normalized (uppercase, no accents)
        if canonical in _NORMALIZED_INDEX:
            return _NORMALIZED_INDEX[canonical]

    # Exact match on normalized index (O(1))
    if normalized in _NORMALIZED_INDEX:
        return _NORMALIZED_INDEX[normalized]

    # Substring fallback: try matching if input contains or is contained
    # in a known neighborhood name (handles "VL MARIANA AP 3" -> "VILA MARIANA")
    assert isinstance(normalized, str)
    for name, coords in _NORMALIZED_INDEX.items():
        if name in normalized or normalized in name:
            return coords

    return None
