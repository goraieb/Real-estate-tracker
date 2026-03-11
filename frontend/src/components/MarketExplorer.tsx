import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Star } from 'lucide-react';
import type { TransacaoITBI, NeighborhoodStats, YieldBairro, MarketAlert, MarketFilters as FilterType, Imovel, MarketLayer } from '../types';
import { fetchTransactions, fetchNeighborhoods, fetchYieldMap, fetchMarketStats, fetchAlerts, fetchTransactionCount, type DataSourceInfo } from '../services/marketApi';
import { MarketFilters } from './MarketFilters';
import { PriceEvolutionChart } from './PriceEvolutionChart';
import { TimeLapseControls } from './TimeLapseControls';
import { MarketAlerts } from './MarketAlerts';
import { useTimeLapse } from '../hooks/useTimeLapse';
import { MapViewportTracker, getZoomTier, type MapViewport } from './MapViewportTracker';
import { useCluster } from '../hooks/useCluster';
import { ClusterLayer } from './ClusterLayer';
import { priceToColor, yieldToColor } from '../utils/colors';

interface Props {
  userProperties: Imovel[];
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

/** Compute last day of a YYYY-MM string (e.g. "2024-02" → "2024-02-29") */
function lastDayOfMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${yearMonth}-${String(last).padStart(2, '0')}`;
}

// Fit map to neighborhood bounds (once on initial load, uses lightweight neighborhood centers)
function FitNeighborhoods({ neighborhoods, hasFitted }: { neighborhoods: NeighborhoodStats[]; hasFitted: React.MutableRefObject<boolean> }) {
  const map = useMap();
  useEffect(() => {
    if (hasFitted.current) return;
    const points = neighborhoods.filter(n => n.centroLat && n.centroLng);
    if (points.length === 0) return;
    const bounds = L.latLngBounds(
      points.map(n => L.latLng(n.centroLat!, n.centroLng!))
    );
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
    hasFitted.current = true;
  }, [map, neighborhoods, hasFitted]);
  return null;
}

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

  // Viewport tracking for LOD
  const [viewport, setViewport] = useState<MapViewport>({ zoom: 12, bounds: null, bboxString: null });
  const zoomTier = useMemo(() => getZoomTier(viewport.zoom), [viewport.zoom]);
  const hasFitted = useRef(false);

  const timeLapse = useTimeLapse(filters.dataInicio, filters.dataFim);

  // Load initial reference data (neighborhoods, yield, alerts, stats)
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

  // Viewport-driven transaction loading (only when zoom > city tier)
  useEffect(() => {
    if (zoomTier === 'city' || !viewport.bboxString) return;
    if (showTimeLapse) return; // time-lapse manages its own transactions

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const txns = await fetchTransactions({
        bbox: viewport.bboxString!,
        dataInicio: filters.dataInicio ? `${filters.dataInicio}-01` : undefined,
        dataFim: filters.dataFim ? lastDayOfMonth(filters.dataFim) : undefined,
        precoM2Min: filters.precoM2Min || undefined,
        precoM2Max: filters.precoM2Max < 50000 ? filters.precoM2Max : undefined,
        // Street bbox is small → ~500-5K results naturally. Region is wider → cap at 50K.
        // Supercluster handles 50K points with no lag.
        limit: zoomTier === 'street' ? 10000 : 50000,
      });
      if (!controller.signal.aborted) setTransactions(txns);
    }, 300);

    return () => { controller.abort(); clearTimeout(timer); };
  }, [viewport.bboxString, zoomTier, showTimeLapse, filters.dataInicio, filters.dataFim, filters.precoM2Min, filters.precoM2Max]);

  // Clear transactions when zooming to city tier (neighborhood stats handle it)
  useEffect(() => {
    if (zoomTier === 'city') setTransactions([]);
  }, [zoomTier]);

  // Filter transactions by tipo if set
  const filteredTransactions = useMemo(() => {
    let data = showTimeLapse ? timeLapse.currentTransactions : transactions;
    if (filters.tipoImovel.length > 0) {
      data = data.filter(t => t.tipoImovel && filters.tipoImovel.some(tipo => t.tipoImovel!.toLowerCase().includes(tipo)));
    }
    return data;
  }, [transactions, filters.tipoImovel, showTimeLapse, timeLapse.currentTransactions]);

  // Cluster data for region tier
  const clusterData = useCluster(filteredTransactions, viewport.zoom, viewport.bounds);

  // Max transaction count for heatmap scaling
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

  // Portfolio properties with lat/lng
  const portfolioMarkers = useMemo(() => {
    return userProperties.filter(p => p.endereco.latitude && p.endereco.longitude).map(p => ({
      id: p.id,
      lat: p.endereco.latitude!,
      lng: p.endereco.longitude!,
      nome: p.nome,
      bairro: p.endereco.bairro,
      valorCompra: p.compra.valorCompra,
      valorAtual: p.valorAtualEstimado || p.compra.valorCompra,
      precoM2Compra: p.compra.valorCompra / p.areaUtil,
      areaUtil: p.areaUtil,
    }));
  }, [userProperties]);

  // Appreciation calculation for portfolio markers
  const getAppreciation = useCallback((bairro: string, purchasePriceM2: number) => {
    const nbhd = neighborhoods.find(n => n.bairro?.toLowerCase().includes(bairro.toLowerCase()));
    if (!nbhd?.precoM2Medio) return null;
    const pct = ((nbhd.precoM2Medio - purchasePriceM2) / purchasePriceM2) * 100;
    return { pct, currentMarketM2: nbhd.precoM2Medio };
  }, [neighborhoods]);

  const center: [number, number] = [-23.5505, -46.6333]; // São Paulo center

  const tierLabel = zoomTier === 'city' ? 'Visão Geral' : zoomTier === 'region' ? 'Região' : 'Rua';

  return (
    <div className="market-explorer">
      <div className="me-sidebar">
        <MarketFilters
          filters={filters}
          onChange={setFilters}
          stats={stats}
        />

        {/* Time-lapse toggle */}
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
          <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapViewportTracker onViewportChange={setViewport} />
            {neighborhoods.length > 0 && <FitNeighborhoods neighborhoods={neighborhoods} hasFitted={hasFitted} />}

            {/* Layer: Transactions — tier-dependent rendering */}

            {/* Region tier: clustered circles */}
            {hasLayer('clusters') && zoomTier === 'region' && (
              <ClusterLayer clusters={clusterData} />
            )}

            {/* Street tier: individual markers */}
            {hasLayer('clusters') && zoomTier === 'street' && filteredTransactions.map(t => (
              <CircleMarker
                key={t.id}
                center={[t.latitude, t.longitude]}
                radius={5}
                pathOptions={{
                  fillColor: priceToColor(t.precoM2 || 0),
                  fillOpacity: 0.75,
                  color: priceToColor(t.precoM2 || 0),
                  weight: 1,
                  opacity: 0.9,
                }}
              >
                <Tooltip>
                  <div style={{ minWidth: 160, fontSize: 12 }}>
                    <strong>{t.logradouro || 'Endereço não disponível'}</strong>
                    <br />
                    <span style={{ color: 'var(--text-muted)' }}>{t.bairro}</span>
                    <br />
                    {t.precoM2 && <>R$/m²: <strong>{fmt(t.precoM2)}</strong><br /></>}
                    Valor: {fmt(t.valorTransacao)}
                    {t.areaM2 && <><br />{t.areaM2}m² — {t.tipoImovel}</>}
                    <br />
                    <span style={{ color: 'var(--text-faint)' }}>{t.dataTransacao}</span>
                  </div>
                </Tooltip>
              </CircleMarker>
            ))}

            {/* Layer: Heatmap (city tier — transaction density) */}
            {hasLayer('heatmap') && zoomTier === 'city' && neighborhoods.map(n => {
              if (!n.centroLat || !n.centroLng) return null;
              return (
                <CircleMarker
                  key={`heat-${n.bairro}`}
                  center={[n.centroLat, n.centroLng]}
                  radius={10 + Math.log2(Math.max(1, n.qtdTransacoes)) * 3}
                  pathOptions={{
                    fillColor: '#ef4444',
                    fillOpacity: Math.min(0.7, n.qtdTransacoes / maxTransactions * 0.8),
                    stroke: false,
                  }}
                >
                  <Tooltip>
                    <div style={{ fontSize: 12 }}>
                      <strong>{n.bairro}</strong>: {n.qtdTransacoes} transações
                    </div>
                  </Tooltip>
                </CircleMarker>
              );
            })}

            {/* Layer: Choropleth (price by neighborhood) */}
            {hasLayer('choropleth') && neighborhoods.map(n => {
              if (!n.centroLat || !n.centroLng || !n.precoM2Medio) return null;
              const isWatched = watchedBairros.includes(n.bairro);
              return (
                <CircleMarker
                  key={`nbhd-${n.bairro}`}
                  center={[n.centroLat, n.centroLng]}
                  radius={Math.max(12, Math.min(35, n.precoM2Medio / 500))}
                  pathOptions={{
                    fillColor: priceToColor(n.precoM2Medio),
                    fillOpacity: 0.4,
                    color: isWatched ? '#f1fa8c' : priceToColor(n.precoM2Medio),
                    weight: isWatched ? 3 : 2,
                    opacity: 0.7,
                  }}
                  eventHandlers={{
                    click: () => setSelectedBairro(n.bairro),
                  }}
                >
                  <Tooltip>
                    <div style={{ minWidth: 150, fontSize: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <strong>{n.bairro}</strong>
                        <button
                          style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                          onClick={e => { e.stopPropagation(); toggleWatchBairro(n.bairro); }}
                        >
                          <Star size={12} fill={isWatched ? '#eab308' : 'none'} color={isWatched ? '#eab308' : '#94a3b8'} />
                        </button>
                      </div>
                      Mediana: {fmt(n.precoM2Medio)}/m²
                      <br />
                      {n.qtdTransacoes} transações
                    </div>
                  </Tooltip>
                </CircleMarker>
              );
            })}

            {/* Layer: Yield */}
            {hasLayer('yield') && yieldData.map(y => {
              if (!y.centroLat || !y.centroLng) return null;
              return (
                <CircleMarker
                  key={`yield-${y.bairro}`}
                  center={[y.centroLat, y.centroLng]}
                  radius={Math.max(15, Math.min(35, y.yieldAnualPct * 5))}
                  pathOptions={{
                    fillColor: yieldToColor(y.yieldAnualPct),
                    fillOpacity: 0.5,
                    color: yieldToColor(y.yieldAnualPct),
                    weight: 2,
                    opacity: 0.8,
                  }}
                  eventHandlers={{
                    click: () => setSelectedBairro(y.bairro),
                  }}
                >
                  <Tooltip>
                    <div style={{ minWidth: 150, fontSize: 12 }}>
                      <strong>{y.bairro}</strong>
                      <br />
                      Yield: <strong style={{ color: yieldToColor(y.yieldAnualPct) }}>
                        {y.yieldAnualPct.toFixed(1)}% a.a.
                      </strong>
                      <br />
                      Aluguel est.: {fmt(y.aluguelM2Estimado)}/m²/mês
                      <br />
                      Compra: {fmt(y.precoM2Compra)}/m²
                    </div>
                  </Tooltip>
                </CircleMarker>
              );
            })}

            {/* Layer: Portfolio overlay (always visible) */}
            {hasLayer('portfolio') && portfolioMarkers.map(p => {
              const appreciation = getAppreciation(p.bairro, p.precoM2Compra);
              return (
                <CircleMarker
                  key={`portfolio-${p.id}`}
                  center={[p.lat, p.lng]}
                  radius={10}
                  pathOptions={{
                    fillColor: '#f1fa8c',
                    fillOpacity: 0.9,
                    color: '#282a36',
                    weight: 3,
                    opacity: 1,
                  }}
                >
                  <Tooltip>
                    <div style={{ minWidth: 170, fontSize: 12 }}>
                      <strong>★ {p.nome}</strong>
                      <br />
                      <span style={{ color: 'var(--text-muted)' }}>{p.bairro}</span>
                      <br />
                      Compra: {fmt(p.precoM2Compra)}/m² ({p.areaUtil}m²)
                      <br />
                      {appreciation && (
                        <span style={{
                          fontWeight: 700,
                          color: appreciation.pct >= 0 ? '#22c55e' : '#ef4444',
                        }}>
                          {appreciation.pct >= 0 ? '+' : ''}{appreciation.pct.toFixed(1)}% vs mercado
                          <br />
                          Mercado: {fmt(appreciation.currentMarketM2)}/m²
                        </span>
                      )}
                    </div>
                  </Tooltip>
                </CircleMarker>
              );
            })}
          </MapContainer>

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

        {/* Price evolution chart (when bairro selected) */}
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
