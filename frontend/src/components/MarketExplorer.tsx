import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import MapGL, { Popup, Source, Layer } from 'react-map-gl/maplibre';
import type { MapRef, MapLayerMouseEvent } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Star } from 'lucide-react';
import type { TransacaoITBI, NeighborhoodStats, YieldBairro, MarketAlert, MarketFilters as FilterType, Imovel, MarketLayer } from '../types';
import { fetchTransactions, fetchNeighborhoods, fetchYieldMap, fetchMarketStats, fetchAlerts, fetchTransactionCount, type DataSourceInfo } from '../services/marketApi';
import { MarketFilters } from './MarketFilters';
import { PriceEvolutionChart } from './PriceEvolutionChart';
import { TimeLapseControls } from './TimeLapseControls';
import { MarketAlerts } from './MarketAlerts';
import { useTimeLapse } from '../hooks/useTimeLapse';
import { priceToColor, yieldToColor } from '../utils/colors';

interface Props {
  userProperties: Imovel[];
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

function lastDayOfMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${yearMonth}-${String(last).padStart(2, '0')}`;
}

type ZoomTier = 'city' | 'region' | 'street';
function getZoomTier(zoom: number): ZoomTier {
  if (zoom <= 11) return 'city';
  if (zoom <= 13) return 'region';
  return 'street';
}

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

const defaultFilters: FilterType = {
  dataInicio: '2019-01',
  dataFim: '2025-12',
  tipoImovel: [],
  precoM2Min: 0,
  precoM2Max: 50000,
  areaMin: 0,
  areaMax: 500,
  activeLayers: ['clusters', 'choropleth'],
};

export function MarketExplorer({ userProperties }: Props) {
  const mapRef = useRef<MapRef>(null);
  const [transactions, setTransactions] = useState<TransacaoITBI[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<NeighborhoodStats[]>([]);
  const [yieldData, setYieldData] = useState<YieldBairro[]>([]);
  const [alerts, setAlerts] = useState<MarketAlert[]>([]);
  const [watchedBairros, setWatchedBairros] = useState<string[]>([]);
  const [selectedBairro, setSelectedBairro] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterType>(defaultFilters);
  const [stats, setStats] = useState<{ totalTransacoes: number; precoM2Medio: number | null }>({
    totalTransacoes: 0, precoM2Medio: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showTimeLapse, setShowTimeLapse] = useState(false);
  const [dataSource, setDataSource] = useState<DataSourceInfo>({ source: 'mock', total: 0 });

  // Viewport tracking
  const [zoom, setZoom] = useState(12);
  const [bboxString, setBboxString] = useState<string | null>(null);
  const zoomTier = useMemo(() => getZoomTier(zoom), [zoom]);
  const hasFitted = useRef(false);
  const [cursor, setCursor] = useState('');

  // Hover popup
  const [hoverInfo, setHoverInfo] = useState<{
    longitude: number; latitude: number;
    layerId: string; properties: Record<string, unknown>;
  } | null>(null);

  const timeLapse = useTimeLapse(filters.dataInicio, filters.dataFim);

  // Load reference data
  useEffect(() => {
    async function loadReference() {
      setIsLoading(true);
      const [nbhd, yld, alertsData, statsData, countData] = await Promise.all([
        fetchNeighborhoods(),
        fetchYieldMap(),
        fetchAlerts(),
        fetchMarketStats(),
        fetchTransactionCount({
          dataInicio: filters.dataInicio ? `${filters.dataInicio}-01` : undefined,
          dataFim: filters.dataFim ? lastDayOfMonth(filters.dataFim) : undefined,
        }),
      ]);
      setNeighborhoods(nbhd.neighborhoods);
      setYieldData(yld);
      setAlerts(alertsData);
      setStats({ totalTransacoes: statsData.totalTransacoes, precoM2Medio: statsData.precoM2Medio });
      setDataSource(countData);
      setIsLoading(false);
    }
    loadReference();
  }, [filters.dataInicio, filters.dataFim]);

  // Fit bounds on neighborhood load
  useEffect(() => {
    if (hasFitted.current || !mapRef.current || neighborhoods.length === 0) return;
    const points = neighborhoods.filter(n => n.centroLat && n.centroLng);
    if (points.length === 0) return;
    const lngs = points.map(n => n.centroLng!);
    const lats = points.map(n => n.centroLat!);
    mapRef.current.fitBounds(
      [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
      { padding: 30, maxZoom: 14 },
    );
    hasFitted.current = true;
  }, [neighborhoods]);

  // Viewport change handler
  const handleViewportChange = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    const bounds = map.getBounds();
    const z = map.getZoom();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    setZoom(z);
    setBboxString(`${sw.lat},${sw.lng},${ne.lat},${ne.lng}`);
  }, []);

  // Viewport-driven transaction loading
  useEffect(() => {
    if (getZoomTier(zoom) === 'city' || !bboxString) return;
    if (showTimeLapse) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const txns = await fetchTransactions({
        bbox: bboxString,
        dataInicio: filters.dataInicio ? `${filters.dataInicio}-01` : undefined,
        dataFim: filters.dataFim ? lastDayOfMonth(filters.dataFim) : undefined,
        precoM2Min: filters.precoM2Min || undefined,
        precoM2Max: filters.precoM2Max < 50000 ? filters.precoM2Max : undefined,
        limit: getZoomTier(zoom) === 'street' ? 10000 : 50000,
      });
      if (!controller.signal.aborted) setTransactions(txns);
    }, 300);

    return () => { controller.abort(); clearTimeout(timer); };
  }, [bboxString, zoom, showTimeLapse, filters.dataInicio, filters.dataFim, filters.precoM2Min, filters.precoM2Max]);

  // Clear transactions at city tier
  useEffect(() => {
    if (zoomTier === 'city') setTransactions([]);
  }, [zoomTier]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    let data = showTimeLapse ? timeLapse.currentTransactions : transactions;
    if (filters.tipoImovel.length > 0) {
      data = data.filter(t => t.tipoImovel && filters.tipoImovel.some(tipo => t.tipoImovel!.toLowerCase().includes(tipo)));
    }
    return data;
  }, [transactions, filters.tipoImovel, showTimeLapse, timeLapse.currentTransactions]);

  const maxTransactions = useMemo(
    () => Math.max(1, ...neighborhoods.map(n => n.qtdTransacoes)),
    [neighborhoods],
  );

  const activeLayers = filters.activeLayers;
  const hasLayer = useCallback((l: MarketLayer) => activeLayers.includes(l), [activeLayers]);

  const toggleWatchBairro = useCallback((bairro: string) => {
    setWatchedBairros(prev =>
      prev.includes(bairro) ? prev.filter(b => b !== bairro) : [...prev, bairro]
    );
  }, []);

  // GeoJSON sources
  const transactionsGeoJson = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: filteredTransactions.map(t => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [t.longitude, t.latitude] },
      properties: {
        id: t.id, precoM2: t.precoM2 || 0, valorTransacao: t.valorTransacao,
        bairro: t.bairro || '', logradouro: t.logradouro || '',
        tipoImovel: t.tipoImovel || '', areaM2: t.areaM2 || 0,
        dataTransacao: t.dataTransacao,
      },
    })),
  }), [filteredTransactions]);

  const neighborhoodsGeoJson = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: neighborhoods.filter(n => n.centroLat && n.centroLng).map(n => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [n.centroLng!, n.centroLat!] },
      properties: {
        bairro: n.bairro, precoM2Medio: n.precoM2Medio || 0,
        qtdTransacoes: n.qtdTransacoes,
        isWatched: watchedBairros.includes(n.bairro) ? 1 : 0,
        heatRadius: 10 + Math.log2(Math.max(1, n.qtdTransacoes)) * 3,
        heatOpacity: Math.min(0.7, n.qtdTransacoes / maxTransactions * 0.8),
        chorRadius: Math.max(12, Math.min(35, (n.precoM2Medio || 0) / 500)),
        chorColor: priceToColor(n.precoM2Medio || 0),
      },
    })),
  }), [neighborhoods, watchedBairros, maxTransactions]);

  const yieldGeoJson = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: yieldData.filter(y => y.centroLat && y.centroLng).map(y => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [y.centroLng!, y.centroLat!] },
      properties: {
        bairro: y.bairro, yieldAnualPct: y.yieldAnualPct,
        aluguelM2Estimado: y.aluguelM2Estimado, precoM2Compra: y.precoM2Compra,
        yieldRadius: Math.max(15, Math.min(35, y.yieldAnualPct * 5)),
        yieldColor: yieldToColor(y.yieldAnualPct),
      },
    })),
  }), [yieldData]);

  const portfolioMarkers = useMemo(() => {
    return userProperties.filter(p => p.endereco.latitude && p.endereco.longitude).map(p => ({
      id: p.id, lat: p.endereco.latitude!, lng: p.endereco.longitude!,
      nome: p.nome, bairro: p.endereco.bairro,
      valorCompra: p.compra.valorCompra,
      precoM2Compra: p.compra.valorCompra / p.areaUtil,
      areaUtil: p.areaUtil,
    }));
  }, [userProperties]);

  const portfolioGeoJson = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: portfolioMarkers.map(p => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
      properties: {
        id: p.id, nome: p.nome, bairro: p.bairro,
        valorCompra: p.valorCompra, precoM2Compra: p.precoM2Compra, areaUtil: p.areaUtil,
      },
    })),
  }), [portfolioMarkers]);

  const getAppreciation = useCallback((bairro: string, purchasePriceM2: number) => {
    const nbhd = neighborhoods.find(n => n.bairro?.toLowerCase().includes(bairro.toLowerCase()));
    if (!nbhd?.precoM2Medio) return null;
    const pct = ((nbhd.precoM2Medio - purchasePriceM2) / purchasePriceM2) * 100;
    return { pct, currentMarketM2: nbhd.precoM2Medio };
  }, [neighborhoods]);

  // Interactive layer IDs (only currently visible)
  const interactiveLayerIds = useMemo(() => {
    const ids: string[] = [];
    if (hasLayer('clusters') && zoomTier !== 'city') {
      ids.push('cluster-circles', 'unclustered-points');
    }
    if (hasLayer('heatmap') && zoomTier === 'city') ids.push('heatmap-circles');
    if (hasLayer('choropleth')) ids.push('choropleth-circles');
    if (hasLayer('yield')) ids.push('yield-circles');
    if (hasLayer('portfolio') && portfolioMarkers.length > 0) ids.push('portfolio-circles');
    return ids;
  }, [hasLayer, zoomTier, portfolioMarkers.length]);

  // Hover handler
  const onHover = useCallback((e: MapLayerMouseEvent) => {
    const feature = e.features?.[0];
    if (feature?.properties) {
      setCursor('pointer');
      setHoverInfo({
        longitude: e.lngLat.lng,
        latitude: e.lngLat.lat,
        layerId: feature.layer?.id ?? '',
        properties: feature.properties as Record<string, unknown>,
      });
    }
  }, []);

  const onHoverLeave = useCallback(() => {
    setCursor('');
    setHoverInfo(null);
  }, []);

  // Click handler (select bairro)
  const onClick = useCallback((e: MapLayerMouseEvent) => {
    const feature = e.features?.[0];
    if (!feature?.properties) return;
    const lid = feature.layer?.id;
    if (lid === 'choropleth-circles' || lid === 'yield-circles') {
      setSelectedBairro(feature.properties.bairro as string);
    }
  }, []);

  const tierLabel = zoomTier === 'city' ? 'Visão Geral' : zoomTier === 'region' ? 'Região' : 'Rua';

  // Render popup content based on layer
  function renderPopupContent() {
    if (!hoverInfo) return null;
    const p = hoverInfo.properties;
    const lid = hoverInfo.layerId;

    if (lid === 'cluster-circles') {
      const count = p.point_count as number;
      const avgPrice = (p.priceCount as number) > 0
        ? (p.sumPrecoM2 as number) / (p.priceCount as number) : 0;
      return (
        <div style={{ minWidth: 130, fontSize: 12 }}>
          <strong>{count} transações</strong>
          {avgPrice > 0 && <><br />Média: {fmt(avgPrice)}/m²</>}
        </div>
      );
    }
    if (lid === 'unclustered-points') {
      return (
        <div style={{ minWidth: 160, fontSize: 12 }}>
          <strong>{(p.logradouro as string) || 'Endereço não disponível'}</strong>
          <br /><span style={{ color: 'var(--text-muted)' }}>{p.bairro as string}</span>
          <br />
          {(p.precoM2 as number) > 0 && <>R$/m²: <strong>{fmt(p.precoM2 as number)}</strong><br /></>}
          Valor: {fmt(p.valorTransacao as number)}
          {(p.areaM2 as number) > 0 && <><br />{p.areaM2 as number}m² — {p.tipoImovel as string}</>}
          <br /><span style={{ color: 'var(--text-faint)' }}>{p.dataTransacao as string}</span>
        </div>
      );
    }
    if (lid === 'heatmap-circles') {
      return (
        <div style={{ fontSize: 12 }}>
          <strong>{p.bairro as string}</strong>: {p.qtdTransacoes as number} transações
        </div>
      );
    }
    if (lid === 'choropleth-circles') {
      const isWatched = watchedBairros.includes(p.bairro as string);
      return (
        <div style={{ minWidth: 150, fontSize: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <strong>{p.bairro as string}</strong>
            <button
              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
              onClick={e => { e.stopPropagation(); toggleWatchBairro(p.bairro as string); }}
            >
              <Star size={12} fill={isWatched ? '#eab308' : 'none'} color={isWatched ? '#eab308' : '#94a3b8'} />
            </button>
          </div>
          Mediana: {fmt(p.precoM2Medio as number)}/m²
          <br />{p.qtdTransacoes as number} transações
        </div>
      );
    }
    if (lid === 'yield-circles') {
      return (
        <div style={{ minWidth: 150, fontSize: 12 }}>
          <strong>{p.bairro as string}</strong>
          <br />Yield: <strong style={{ color: yieldToColor(p.yieldAnualPct as number) }}>
            {(p.yieldAnualPct as number).toFixed(1)}% a.a.
          </strong>
          <br />Aluguel est.: {fmt(p.aluguelM2Estimado as number)}/m²/mês
          <br />Compra: {fmt(p.precoM2Compra as number)}/m²
        </div>
      );
    }
    if (lid === 'portfolio-circles') {
      const appreciation = getAppreciation(p.bairro as string, p.precoM2Compra as number);
      return (
        <div style={{ minWidth: 170, fontSize: 12 }}>
          <strong>★ {p.nome as string}</strong>
          <br /><span style={{ color: 'var(--text-muted)' }}>{p.bairro as string}</span>
          <br />Compra: {fmt(p.precoM2Compra as number)}/m² ({p.areaUtil as number}m²)
          {appreciation && (
            <>
              <br />
              <span style={{ fontWeight: 700, color: appreciation.pct >= 0 ? '#22c55e' : '#ef4444' }}>
                {appreciation.pct >= 0 ? '+' : ''}{appreciation.pct.toFixed(1)}% vs mercado
                <br />Mercado: {fmt(appreciation.currentMarketM2)}/m²
              </span>
            </>
          )}
        </div>
      );
    }
    return null;
  }

  return (
    <div className="market-explorer">
      <div className="me-sidebar">
        <MarketFilters filters={filters} onChange={setFilters} stats={stats} />

        <button
          className={`mf-chip ${showTimeLapse ? 'active' : ''}`}
          style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
          onClick={() => setShowTimeLapse(!showTimeLapse)}
        >
          {showTimeLapse ? '⏹ Parar Time-Lapse' : '▶ Time-Lapse'}
        </button>

        {showTimeLapse && (
          <TimeLapseControls
            isPlaying={timeLapse.isPlaying}
            currentPeriodo={timeLapse.currentPeriodo}
            currentIndex={timeLapse.currentIndex}
            totalPeriodos={timeLapse.allPeriodos.length}
            speed={timeLapse.speed}
            transactionCount={timeLapse.currentTransactions.length}
            onPlay={timeLapse.play}
            onPause={timeLapse.pause}
            onSetSpeed={timeLapse.setSpeed}
            onSeek={timeLapse.seekTo}
          />
        )}

        <MarketAlerts
          alerts={alerts}
          onAlertsChange={setAlerts}
          watchedBairros={watchedBairros}
          onToggleWatchBairro={toggleWatchBairro}
        />
      </div>

      <div className="me-main">
        {/* Data source indicator */}
        <div className="me-data-source">
          <span className={`me-source-badge ${dataSource.source === 'database' ? 'me-source-real' : 'me-source-demo'}`}>
            {dataSource.source === 'database' ? 'Dados Reais' : 'Demo'}
          </span>
          <span className="me-source-count">
            {dataSource.total.toLocaleString('pt-BR')} transações
            {dataSource.source === 'database' && dataSource.minDate && dataSource.maxDate && (
              <> ({dataSource.minDate.slice(0, 4)}–{dataSource.maxDate.slice(0, 4)})</>
            )}
            {dataSource.source === 'mock' && <> (2019–2025)</>}
          </span>
          <span className="me-source-badge me-source-demo" style={{ marginLeft: 4, fontSize: 10 }}>
            {tierLabel}
          </span>
        </div>

        {/* Map */}
        <div className="me-map-container">
          {isLoading && (
            <div className="me-loading-overlay">Carregando dados de mercado...</div>
          )}
          <MapGL
            ref={mapRef}
            initialViewState={{ longitude: -46.6333, latitude: -23.5505, zoom: 12 }}
            style={{ height: '100%', width: '100%' }}
            mapStyle={MAP_STYLE}
            cursor={cursor}
            onMoveEnd={handleViewportChange}
            onLoad={handleViewportChange}
            onMouseMove={onHover}
            onMouseLeave={onHoverLeave}
            onClick={onClick}
            interactiveLayerIds={interactiveLayerIds}
          >
            {/* Transactions with native clustering */}
            {hasLayer('clusters') && zoomTier !== 'city' && (
              <Source
                id="transactions"
                type="geojson"
                data={transactionsGeoJson}
                cluster={true}
                clusterMaxZoom={13}
                clusterRadius={60}
                clusterProperties={{
                  sumPrecoM2: ['+', ['coalesce', ['get', 'precoM2'], 0]],
                  priceCount: ['+', ['case', ['>', ['get', 'precoM2'], 0], 1, 0]],
                }}
              >
                {/* Cluster circles */}
                <Layer
                  id="cluster-circles"
                  type="circle"
                  filter={['has', 'point_count']}
                  paint={{
                    'circle-radius': ['step', ['get', 'point_count'],
                      15, 10, 20, 100, 28, 500, 38],
                    'circle-color': ['case',
                      ['>', ['get', 'priceCount'], 0],
                      ['interpolate', ['linear'],
                        ['/', ['get', 'sumPrecoM2'], ['max', ['get', 'priceCount'], 1]],
                        5000, '#3b82f6', 8000, '#22c55e', 11000, '#eab308', 14000, '#f97316', 18000, '#ef4444'],
                      '#94a3b8'],
                    'circle-opacity': 0.65,
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#ffffff',
                    'circle-stroke-opacity': 0.5,
                  }}
                />
                {/* Cluster count labels */}
                <Layer
                  id="cluster-count"
                  type="symbol"
                  filter={['has', 'point_count']}
                  layout={{
                    'text-field': '{point_count_abbreviated}',
                    'text-size': 11,
                    'text-font': ['Open Sans Regular'],
                  }}
                  paint={{ 'text-color': '#ffffff' }}
                />
                {/* Unclustered individual points */}
                <Layer
                  id="unclustered-points"
                  type="circle"
                  filter={['!', ['has', 'point_count']]}
                  paint={{
                    'circle-radius': 5,
                    'circle-color': ['interpolate', ['linear'], ['get', 'precoM2'],
                      5000, '#3b82f6', 8000, '#22c55e', 11000, '#eab308', 14000, '#f97316', 18000, '#ef4444'],
                    'circle-opacity': 0.75,
                    'circle-stroke-width': 1,
                    'circle-stroke-color': '#ffffff',
                    'circle-stroke-opacity': 0.5,
                  }}
                />
              </Source>
            )}

            {/* Neighborhood data (heatmap + choropleth) */}
            <Source id="neighborhoods" type="geojson" data={neighborhoodsGeoJson}>
              {/* Heatmap density (city tier only) */}
              {hasLayer('heatmap') && zoomTier === 'city' && (
                <Layer
                  id="heatmap-circles"
                  type="circle"
                  paint={{
                    'circle-radius': ['get', 'heatRadius'],
                    'circle-color': '#ef4444',
                    'circle-opacity': ['get', 'heatOpacity'],
                    'circle-stroke-width': 0,
                  }}
                />
              )}

              {/* Choropleth price circles */}
              {hasLayer('choropleth') && (
                <Layer
                  id="choropleth-circles"
                  type="circle"
                  paint={{
                    'circle-radius': ['get', 'chorRadius'],
                    'circle-color': ['interpolate', ['linear'], ['get', 'precoM2Medio'],
                      5000, '#3b82f6', 8000, '#06b6d4', 11000, '#22c55e', 14000, '#eab308', 18000, '#f97316', 22000, '#ef4444'],
                    'circle-opacity': 0.4,
                    'circle-stroke-width': ['case', ['==', ['get', 'isWatched'], 1], 3, 2],
                    'circle-stroke-color': ['case',
                      ['==', ['get', 'isWatched'], 1], '#f1fa8c',
                      ['interpolate', ['linear'], ['get', 'precoM2Medio'],
                        5000, '#3b82f6', 8000, '#06b6d4', 11000, '#22c55e', 14000, '#eab308', 18000, '#f97316', 22000, '#ef4444']],
                    'circle-stroke-opacity': 0.7,
                  }}
                />
              )}
            </Source>

            {/* Yield layer */}
            {hasLayer('yield') && (
              <Source id="yield-data" type="geojson" data={yieldGeoJson}>
                <Layer
                  id="yield-circles"
                  type="circle"
                  paint={{
                    'circle-radius': ['get', 'yieldRadius'],
                    'circle-color': ['interpolate', ['linear'], ['get', 'yieldAnualPct'],
                      4.0, '#ef4444', 5.0, '#f97316', 5.5, '#eab308', 6.0, '#84cc16', 7.0, '#22c55e', 8.0, '#16a34a'],
                    'circle-opacity': 0.5,
                    'circle-stroke-width': 2,
                    'circle-stroke-color': ['interpolate', ['linear'], ['get', 'yieldAnualPct'],
                      4.0, '#ef4444', 5.0, '#f97316', 5.5, '#eab308', 6.0, '#84cc16', 7.0, '#22c55e', 8.0, '#16a34a'],
                    'circle-stroke-opacity': 0.8,
                  }}
                />
              </Source>
            )}

            {/* Portfolio overlay */}
            {hasLayer('portfolio') && portfolioMarkers.length > 0 && (
              <Source id="portfolio" type="geojson" data={portfolioGeoJson}>
                <Layer
                  id="portfolio-circles"
                  type="circle"
                  paint={{
                    'circle-radius': 10,
                    'circle-color': '#f1fa8c',
                    'circle-opacity': 0.9,
                    'circle-stroke-width': 3,
                    'circle-stroke-color': '#282a36',
                    'circle-stroke-opacity': 1,
                  }}
                />
              </Source>
            )}

            {/* Hover popup */}
            {hoverInfo && (
              <Popup
                longitude={hoverInfo.longitude}
                latitude={hoverInfo.latitude}
                closeButton={false}
                closeOnClick={false}
                anchor="bottom"
                offset={[0, -10] as [number, number]}
              >
                {renderPopupContent()}
              </Popup>
            )}
          </MapGL>

          {/* Legend */}
          <div className="me-legend">
            {hasLayer('clusters') && zoomTier === 'region' && (
              <div className="me-legend-section">
                <span className="me-legend-title">Clusters</span>
                <div className="me-legend-gradient">
                  <span>Tamanho = qtd. transações</span>
                </div>
              </div>
            )}
            {(hasLayer('clusters') || hasLayer('choropleth')) && (
              <div className="me-legend-section">
                <span className="me-legend-title">R$/m²</span>
                <div className="me-legend-gradient">
                  <span><span className="legend-dot" style={{ background: '#3b82f6' }} /> ≤5K</span>
                  <span><span className="legend-dot" style={{ background: '#22c55e' }} /> 8-11K</span>
                  <span><span className="legend-dot" style={{ background: '#eab308' }} /> 11-14K</span>
                  <span><span className="legend-dot" style={{ background: '#ef4444' }} /> ≥18K</span>
                </div>
              </div>
            )}
            {hasLayer('heatmap') && (
              <div className="me-legend-section">
                <span className="me-legend-title">Densidade</span>
                <div className="me-legend-gradient">
                  <span><span className="legend-dot" style={{ background: '#ef4444', opacity: 0.3 }} /> Baixa</span>
                  <span><span className="legend-dot" style={{ background: '#ef4444', opacity: 0.7 }} /> Alta</span>
                </div>
              </div>
            )}
            {hasLayer('yield') && (
              <div className="me-legend-section">
                <span className="me-legend-title">Yield</span>
                <div className="me-legend-gradient">
                  <span><span className="legend-dot" style={{ background: '#ef4444' }} /> ≤4%</span>
                  <span><span className="legend-dot" style={{ background: '#eab308' }} /> 5%</span>
                  <span><span className="legend-dot" style={{ background: '#22c55e' }} /> ≥6%</span>
                </div>
              </div>
            )}
            {hasLayer('portfolio') && portfolioMarkers.length > 0 && (
              <div className="me-legend-section">
                <span className="me-legend-title">★ Meu portfólio</span>
              </div>
            )}
          </div>
        </div>

        {/* Price evolution chart */}
        {selectedBairro && (
          <PriceEvolutionChart
            bairro={selectedBairro}
            onClose={() => setSelectedBairro(null)}
            userProperties={userProperties}
          />
        )}
      </div>
    </div>
  );
}
