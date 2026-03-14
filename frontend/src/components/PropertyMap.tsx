import { useMemo, useEffect, useState, useRef, useCallback } from 'react';
import MapGL, { Marker, Popup, Source, Layer } from 'react-map-gl/maplibre';
import type { MapRef, MapLayerMouseEvent } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Imovel, DadosMercadoBairro, MapFilter } from '../types';
import { calcularValorizacao } from '../services/calculations';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtPct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;

const MAP_STYLE = {
  version: 8 as const,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    osm: {
      type: 'raster' as const,
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    },
  },
  layers: [{ id: 'osm', type: 'raster' as const, source: 'osm' }],
};

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

function applyFilter(dados: DadosMercadoBairro[], filtro: MapFilter): { bairro: string; cidade: string; centroLat: number; centroLng: number; precoM2: number; variacao: number; amostra: number }[] {
  return dados.map(d => {
    let filtered = d.porTipo;
    if (filtro.tipo !== 'todos') filtered = filtered.filter(p => p.tipo === filtro.tipo);
    if (filtro.condicao !== 'todos') filtered = filtered.filter(p => p.condicao === filtro.condicao);
    if (filtro.quartos !== 'todos') filtered = filtered.filter(p => p.quartos === filtro.quartos);
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
  const mapRef = useRef<MapRef>(null);
  const [popupImovel, setPopupImovel] = useState<ImovelWithCoords | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{
    longitude: number; latitude: number;
    bairro: string; cidade: string; precoM2: number; variacao: number; amostra: number;
  } | null>(null);
  const [cursor, setCursor] = useState('');
  const fitted = useRef(false);

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
      if (lat && lng) return { ...im, _lat: lat, _lng: lng };
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

  const marketGeoJson = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: mercadoFiltrado.map(d => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [d.centroLng, d.centroLat] },
      properties: { bairro: d.bairro, cidade: d.cidade, precoM2: d.precoM2, variacao: d.variacao, amostra: d.amostra },
    })),
  }), [mercadoFiltrado]);

  // Fit bounds once on load
  useEffect(() => {
    if (fitted.current || !mapRef.current) return;
    const pts = [
      ...mapped.map(m => [m._lng, m._lat] as [number, number]),
      ...mercadoFiltrado.map(d => [d.centroLng, d.centroLat] as [number, number]),
    ];
    if (pts.length === 0) return;
    const lngs = pts.map(p => p[0]);
    const lats = pts.map(p => p[1]);
    mapRef.current.fitBounds(
      [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
      { padding: 40, maxZoom: 14, duration: 0 },
    );
    fitted.current = true;
  }, [mapped, mercadoFiltrado]);

  const onMarketHover = useCallback((e: MapLayerMouseEvent) => {
    const feature = e.features?.[0];
    if (feature?.properties) {
      setCursor('pointer');
      setHoverInfo({
        longitude: e.lngLat.lng,
        latitude: e.lngLat.lat,
        bairro: feature.properties.bairro as string,
        cidade: feature.properties.cidade as string,
        precoM2: feature.properties.precoM2 as number,
        variacao: feature.properties.variacao as number,
        amostra: feature.properties.amostra as number,
      });
    }
  }, []);

  const onMarketLeave = useCallback(() => {
    setCursor('');
    setHoverInfo(null);
  }, []);

  if (mapped.length === 0 && mercadoFiltrado.length === 0) {
    return (
      <div className="map-empty">
        <p>Adicione imóveis para visualizar no mapa.</p>
      </div>
    );
  }

  const center = {
    longitude: mapped.reduce((s, m) => s + m._lng, 0) / Math.max(mapped.length, 1),
    latitude: mapped.reduce((s, m) => s + m._lat, 0) / Math.max(mapped.length, 1),
  };

  return (
    <div className="map-container">
      <MapGL
        ref={mapRef}
        initialViewState={{ ...center, zoom: 12 }}
        style={{ height: '100%', width: '100%', borderRadius: 12 }}
        mapStyle={MAP_STYLE}
        cursor={cursor}
        onMouseMove={onMarketHover}
        onMouseLeave={onMarketLeave}
        interactiveLayerIds={['market-circles']}
      >
        {/* Market data circles (GPU-rendered) */}
        <Source id="market-data" type="geojson" data={marketGeoJson}>
          <Layer
            id="market-circles"
            type="circle"
            paint={{
              'circle-radius': ['interpolate', ['linear'], ['get', 'precoM2'],
                3000, 8, 9000, 16, 15000, 25, 25000, 40],
              'circle-color': ['interpolate', ['linear'], ['get', 'variacao'],
                -5, '#ef4444', -2, '#f97316', 0, '#eab308', 3, '#84cc16', 6, '#22c55e'],
              'circle-opacity': 0.5,
              'circle-stroke-width': 2,
              'circle-stroke-color': ['interpolate', ['linear'], ['get', 'variacao'],
                -5, '#ef4444', -2, '#f97316', 0, '#eab308', 3, '#84cc16', 6, '#22c55e'],
              'circle-stroke-opacity': 0.8,
            }}
          />
        </Source>

        {/* Property markers (DOM — few items, rich interaction) */}
        {mapped.map(im => {
          const isSelected = im.id === selectedId;
          return (
            <Marker
              key={im.id}
              longitude={im._lng}
              latitude={im._lat}
              anchor="bottom"
              onClick={e => {
                e.originalEvent.stopPropagation();
                onSelectImovel?.(im.id);
                setPopupImovel(im);
              }}
            >
              <svg width={isSelected ? 30 : 25} height={isSelected ? 49 : 41} viewBox="0 0 25 41" style={{ cursor: 'pointer' }}>
                <path
                  d="M12.5 0C5.6 0 0 5.6 0 12.5S12.5 41 12.5 41 25 19.4 25 12.5 19.4 0 12.5 0z"
                  fill={isSelected ? '#10b981' : '#3b82f6'}
                  stroke="#fff"
                  strokeWidth="2"
                />
                <circle cx="12.5" cy="12.5" r="5" fill="#fff" />
              </svg>
            </Marker>
          );
        })}

        {/* Property popup */}
        {popupImovel && (
          <Popup
            longitude={popupImovel._lng}
            latitude={popupImovel._lat}
            anchor="bottom"
            offset={[0, -42] as [number, number]}
            onClose={() => setPopupImovel(null)}
          >
            <div style={{ minWidth: 160 }}>
              <strong>{popupImovel.nome}</strong>
              <br />
              <span style={{ fontSize: 12, color: '#64748b' }}>
                {popupImovel.endereco.bairro}, {popupImovel.endereco.cidade}
              </span>
              <br />
              <span style={{ fontSize: 13 }}>
                Valor: {fmt(calcularValorizacao(popupImovel).valorAtual)}
              </span>
              <br />
              <span style={{ fontSize: 12, color: '#64748b' }}>
                {popupImovel.areaUtil}m² | {fmt(calcularValorizacao(popupImovel).precoM2)}/m²
              </span>
              {popupImovel.financiamento?.saldoDevedor != null && (
                <>
                  <br />
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>
                    Dívida: {fmt(popupImovel.financiamento.saldoDevedor)}
                  </span>
                </>
              )}
            </div>
          </Popup>
        )}

        {/* Market hover popup */}
        {hoverInfo && (
          <Popup
            longitude={hoverInfo.longitude}
            latitude={hoverInfo.latitude}
            closeButton={false}
            closeOnClick={false}
            anchor="bottom"
            offset={[0, -10] as [number, number]}
          >
            <div style={{ minWidth: 140, fontSize: 12 }}>
              <strong>{hoverInfo.bairro}</strong> — {hoverInfo.cidade}
              <br />
              Preço/m²: {fmt(hoverInfo.precoM2)}
              <br />
              Variação 12m: <span style={{ color: hoverInfo.variacao >= 0 ? '#16a34a' : '#ef4444', fontWeight: 600 }}>{fmtPct(hoverInfo.variacao)}</span>
              {hoverInfo.amostra > 0 && <><br />Amostra: {hoverInfo.amostra} imóveis</>}
            </div>
          </Popup>
        )}
      </MapGL>

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
