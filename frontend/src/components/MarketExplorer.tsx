import { useEffect, useState, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Star } from 'lucide-react';
import type { TransacaoITBI, NeighborhoodStats, YieldBairro, MarketAlert, MarketFilters as FilterType, Imovel, MarketLayer } from '../types';
import { fetchTransactions, fetchNeighborhoods, fetchYieldMap, fetchMarketStats, fetchAlerts } from '../services/marketApi';
import { MarketFilters } from './MarketFilters';
import { PriceEvolutionChart } from './PriceEvolutionChart';
import { TimeLapseControls } from './TimeLapseControls';
import { MarketAlerts } from './MarketAlerts';
import { useTimeLapse } from '../hooks/useTimeLapse';
// useThemeColors used by child components

interface Props {
  userProperties: Imovel[];
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

// Price/m² → color gradient: blue (low) → yellow (mid) → red (high)
function priceToColor(precoM2: number): string {
  if (precoM2 <= 5000) return '#3b82f6';
  if (precoM2 <= 8000) return '#06b6d4';
  if (precoM2 <= 11000) return '#22c55e';
  if (precoM2 <= 14000) return '#eab308';
  if (precoM2 <= 18000) return '#f97316';
  return '#ef4444';
}

// Yield % → color: red (low) → yellow → green (high)
function yieldToColor(yieldPct: number): string {
  if (yieldPct <= 4.0) return '#ef4444';
  if (yieldPct <= 5.0) return '#f97316';
  if (yieldPct <= 5.5) return '#eab308';
  if (yieldPct <= 6.0) return '#84cc16';
  if (yieldPct <= 7.0) return '#22c55e';
  return '#16a34a';
}

// Fit map to transaction bounds
function FitTransactions({ transactions }: { transactions: TransacaoITBI[] }) {
  const map = useMap();
  useEffect(() => {
    if (transactions.length === 0) return;
    const bounds = L.latLngBounds(
      transactions.map(t => L.latLng(t.latitude, t.longitude))
    );
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
  }, [map, transactions]);
  return null;
}

const defaultFilters: FilterType = {
  dataInicio: '2023-01',
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

  const timeLapse = useTimeLapse(filters.dataInicio, filters.dataFim);

  // Load initial data
  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const [txns, nbhd, yld, alertsData, statsData] = await Promise.all([
        fetchTransactions({
          dataInicio: filters.dataInicio ? `${filters.dataInicio}-01` : undefined,
          dataFim: filters.dataFim ? `${filters.dataFim}-28` : undefined,
          precoM2Min: filters.precoM2Min || undefined,
          precoM2Max: filters.precoM2Max < 50000 ? filters.precoM2Max : undefined,
        }),
        fetchNeighborhoods(),
        fetchYieldMap(),
        fetchAlerts(),
        fetchMarketStats(),
      ]);
      setTransactions(txns);
      setNeighborhoods(nbhd.neighborhoods);
      setYieldData(yld);
      setAlerts(alertsData);
      setStats({ totalTransacoes: statsData.totalTransacoes, precoM2Medio: statsData.precoM2Medio });
      setIsLoading(false);
    }
    load();
  }, [filters.dataInicio, filters.dataFim, filters.precoM2Min, filters.precoM2Max]);

  // Filter transactions by tipo if set
  const filteredTransactions = useMemo(() => {
    let data = showTimeLapse ? timeLapse.currentTransactions : transactions;
    if (filters.tipoImovel.length > 0) {
      data = data.filter(t => t.tipoImovel && filters.tipoImovel.some(tipo => t.tipoImovel!.toLowerCase().includes(tipo)));
    }
    return data;
  }, [transactions, filters.tipoImovel, showTimeLapse, timeLapse.currentTransactions]);

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
            {filteredTransactions.length > 0 && <FitTransactions transactions={filteredTransactions} />}

            {/* Layer: Transaction clusters (as circle markers) */}
            {hasLayer('clusters') && filteredTransactions.map(t => (
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

            {/* Layer: Yield heatmap */}
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

            {/* Layer: Portfolio overlay */}
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
            {hasLayer('clusters') && (
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
