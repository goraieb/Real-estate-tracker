import { useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Imovel, DadosMercadoBairro, MapFilter } from '../types';
import { calcularValorizacao } from '../services/calculations';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtPct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;

// Fix default marker icon issue with webpack/vite
const defaultIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const selectedIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [30, 49],
  iconAnchor: [15, 49],
  popupAnchor: [1, -40],
  shadowSize: [49, 49],
  className: 'marker-selected',
});

interface Props {
  imoveis: Imovel[];
  selectedId?: string | null;
  onSelectImovel?: (id: string) => void;
  dadosMercado?: DadosMercadoBairro[];
  filtro?: MapFilter;
}

interface ImovelWithCoords extends Imovel {
  _lat: number;
  _lng: number;
}

// Deterministic hash for stable offset when no lat/lng
function hashCode(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash) + s.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function deterministicOffset(id: string): [number, number] {
  const h1 = hashCode(id + '_lat');
  const h2 = hashCode(id + '_lng');
  return [
    ((h1 % 1000) / 1000) * 0.02 - 0.01,
    ((h2 % 1000) / 1000) * 0.02 - 0.01,
  ];
}

// Color scale: red (negative variation) → yellow (0) → green (positive)
function getVariacaoColor(variacao: number): string {
  if (variacao <= -5) return '#ef4444';
  if (variacao <= -2) return '#f97316';
  if (variacao <= 0) return '#eab308';
  if (variacao <= 3) return '#84cc16';
  if (variacao <= 6) return '#22c55e';
  return '#16a34a';
}

function getCircleRadius(precoM2: number): number {
  // Scale radius based on price/m²: 5k→10px, 15k→25px, 25k→40px
  return Math.max(8, Math.min(40, precoM2 / 600));
}

// Auto-fit bounds component
function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions.map(p => L.latLng(p[0], p[1])));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [map, positions]);
  return null;
}

function applyFilter(dados: DadosMercadoBairro[], filtro: MapFilter): { bairro: string; cidade: string; centroLat: number; centroLng: number; precoM2: number; variacao: number; amostra: number }[] {
  return dados.map(d => {
    let filtered = d.porTipo;
    if (filtro.tipo !== 'todos') {
      filtered = filtered.filter(p => p.tipo === filtro.tipo);
    }
    if (filtro.condicao !== 'todos') {
      filtered = filtered.filter(p => p.condicao === filtro.condicao);
    }
    if (filtro.quartos !== 'todos') {
      filtered = filtered.filter(p => p.quartos === filtro.quartos);
    }

    if (filtered.length === 0) {
      return { bairro: d.bairro, cidade: d.cidade, centroLat: d.centroLat, centroLng: d.centroLng, precoM2: d.precoM2Atual, variacao: d.variacaoPct12m, amostra: 0 };
    }

    const totalAmostra = filtered.reduce((s, p) => s + p.amostra, 0);
    const precoM2Pond = totalAmostra > 0
      ? filtered.reduce((s, p) => s + p.precoM2 * p.amostra, 0) / totalAmostra
      : filtered.reduce((s, p) => s + p.precoM2, 0) / filtered.length;
    const variacaoPond = totalAmostra > 0
      ? filtered.reduce((s, p) => s + p.variacaoPct12m * p.amostra, 0) / totalAmostra
      : filtered.reduce((s, p) => s + p.variacaoPct12m, 0) / filtered.length;

    return { bairro: d.bairro, cidade: d.cidade, centroLat: d.centroLat, centroLng: d.centroLng, precoM2: precoM2Pond, variacao: variacaoPond, amostra: totalAmostra };
  });
}

export function PropertyMap({ imoveis, selectedId, onSelectImovel, dadosMercado, filtro }: Props) {
  const cityDefaults: Record<string, [number, number]> = {
    'São Paulo': [-23.5505, -46.6333],
    'Rio de Janeiro': [-22.9068, -43.1729],
    'Belo Horizonte': [-19.9167, -43.9345],
    'Curitiba': [-25.4284, -49.2733],
    'Porto Alegre': [-30.0346, -51.2177],
    'Florianópolis': [-27.5954, -48.5480],
  };

  const mapped: ImovelWithCoords[] = useMemo(() => {
    return imoveis.map(im => {
      const lat = im.endereco.latitude;
      const lng = im.endereco.longitude;
      if (lat && lng) {
        return { ...im, _lat: lat, _lng: lng };
      }
      const city = im.endereco.cidade;
      const [dlat, dlng] = cityDefaults[city] ?? [-23.5505, -46.6333];
      const [oLat, oLng] = deterministicOffset(im.id);
      return { ...im, _lat: dlat + oLat, _lng: dlng + oLng };
    });
  }, [imoveis]);

  const mercadoFiltrado = useMemo(() => {
    if (!dadosMercado) return [];
    const f = filtro ?? { tipo: 'todos', condicao: 'todos', quartos: 'todos' };
    return applyFilter(dadosMercado, f);
  }, [dadosMercado, filtro]);

  const allPositions = useMemo<[number, number][]>(() => {
    const pts: [number, number][] = mapped.map(m => [m._lat, m._lng]);
    mercadoFiltrado.forEach(d => pts.push([d.centroLat, d.centroLng]));
    return pts;
  }, [mapped, mercadoFiltrado]);

  if (mapped.length === 0 && mercadoFiltrado.length === 0) {
    return (
      <div className="map-empty">
        <p>Adicione imóveis para visualizar no mapa.</p>
      </div>
    );
  }

  const center: [number, number] = [
    mapped.reduce((s, m) => s + m._lat, 0) / Math.max(mapped.length, 1),
    mapped.reduce((s, m) => s + m._lng, 0) / Math.max(mapped.length, 1),
  ];

  return (
    <div className="map-container">
      <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%', borderRadius: 12 }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds positions={allPositions} />

        {/* Market data circles */}
        {mercadoFiltrado.map(d => (
          <CircleMarker
            key={`${d.bairro}-${d.cidade}`}
            center={[d.centroLat, d.centroLng]}
            radius={getCircleRadius(d.precoM2)}
            pathOptions={{
              fillColor: getVariacaoColor(d.variacao),
              fillOpacity: 0.5,
              color: getVariacaoColor(d.variacao),
              weight: 2,
              opacity: 0.8,
            }}
          >
            <Tooltip>
              <div style={{ minWidth: 140, fontSize: 12 }}>
                <strong>{d.bairro}</strong> — {d.cidade}
                <br />
                Preço/m²: {fmt(d.precoM2)}
                <br />
                Variação 12m: <span style={{ color: d.variacao >= 0 ? '#16a34a' : '#ef4444', fontWeight: 600 }}>{fmtPct(d.variacao)}</span>
                {d.amostra > 0 && <><br />Amostra: {d.amostra} imóveis</>}
              </div>
            </Tooltip>
          </CircleMarker>
        ))}

        {/* Property markers */}
        {mapped.map(im => {
          const val = calcularValorizacao(im);
          return (
            <Marker
              key={im.id}
              position={[im._lat, im._lng]}
              icon={im.id === selectedId ? selectedIcon : defaultIcon}
              eventHandlers={{
                click: () => onSelectImovel?.(im.id),
              }}
            >
              <Popup>
                <div style={{ minWidth: 160 }}>
                  <strong>{im.nome}</strong>
                  <br />
                  <span style={{ fontSize: 12, color: '#64748b' }}>
                    {im.endereco.bairro}, {im.endereco.cidade}
                  </span>
                  <br />
                  <span style={{ fontSize: 13 }}>
                    Valor: {fmt(val.valorAtual)}
                  </span>
                  <br />
                  <span style={{ fontSize: 12, color: '#64748b' }}>
                    {im.areaUtil}m² | {fmt(val.precoM2)}/m²
                  </span>
                  {im.financiamento?.saldoDevedor != null && (
                    <>
                      <br />
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>
                        Dívida: {fmt(im.financiamento.saldoDevedor)}
                      </span>
                    </>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Legend */}
      {mercadoFiltrado.length > 0 && (
        <div className="map-legend">
          <span className="map-legend-title">Variação 12m</span>
          <div className="map-legend-items">
            <span><span className="legend-dot" style={{ background: '#ef4444' }} /> &lt;-5%</span>
            <span><span className="legend-dot" style={{ background: '#eab308' }} /> ~0%</span>
            <span><span className="legend-dot" style={{ background: '#22c55e' }} /> &gt;3%</span>
          </div>
        </div>
      )}
    </div>
  );
}
