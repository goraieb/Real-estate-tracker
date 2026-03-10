import { useEffect, useState } from 'react';
import { LayoutDashboard, Plus, Loader2, List, Map, Calculator, TrendingUp, Info, Sun, Moon, Search } from 'lucide-react';
import { PropertyCard } from './components/PropertyCard';
import { PropertyMap } from './components/PropertyMap';
import { MapFilters } from './components/MapFilters';
import { YieldBreakdown } from './components/YieldBreakdown';
import { BenchmarkChart } from './components/BenchmarkChart';
import { PortfolioSummary } from './components/PortfolioSummary';
import { PortfolioEvolution } from './components/PortfolioEvolution';
import { EquityDebtChart } from './components/EquityDebtChart';
import { PropertyForm } from './components/PropertyForm';
import { ConfirmDialog } from './components/ConfirmDialog';
import { FinancingSimulator } from './components/FinancingSimulator';
import { MarketExplorer } from './components/MarketExplorer';
import { EconomicIndicators } from './components/EconomicIndicators';
import { FipeZapChart } from './components/FipeZapChart';
import { NeighborhoodScorecard } from './components/NeighborhoodScorecard';
import { MarketTimingDashboard } from './components/MarketTimingDashboard';
import { useStore } from './store/useStore';
import { calcularValorizacao, calcularValorizacaoDetalhada, calcularYieldLongterm, calcularYieldAirbnb } from './services/calculations';
import { FIPEZAP_MARKET_DATA } from './services/fipezapData';
import { TAXA_ADMINISTRACAO_PCT } from './config';
import type { Imovel, MapFilter } from './types';
import './App.css';

function getYields(imovel: Imovel): { yieldBruto: number; yieldLiquido: number } {
  const val = calcularValorizacao(imovel);
  if (imovel.renda.tipo === 'airbnb' && imovel.renda.diariaMedia && imovel.renda.taxaOcupacaoPct) {
    const custoFixo = imovel.custos.condominioMensal + imovel.custos.iptuAnual / 12;
    const res = calcularYieldAirbnb(val.valorAtual, imovel.renda.diariaMedia, imovel.renda.taxaOcupacaoPct, custoFixo);
    return { yieldBruto: res.yieldBruto, yieldLiquido: res.yieldLiquido };
  }
  if (imovel.renda.aluguelMensal) {
    const res = calcularYieldLongterm(
      val.valorAtual, imovel.renda.aluguelMensal, imovel.custos.iptuAnual,
      imovel.custos.condominioMensal, imovel.custos.seguroAnual, imovel.custos.manutencaoMensal,
      TAXA_ADMINISTRACAO_PCT, imovel.renda.taxaVacanciaPct,
    );
    return { yieldBruto: res.yieldBruto, yieldLiquido: res.yieldLiquido };
  }
  return { yieldBruto: 0, yieldLiquido: 0 };
}

type AppTab = 'dashboard' | 'evolution' | 'simulator' | 'market';

function App() {
  const {
    imoveis, selectedId, benchmarks, isLoading, error, isDemo, theme,
    fetchImoveis, fetchBenchmarks, selectImovel,
    criarImovel, atualizarImovel, deletarImovel, toggleTheme,
  } = useStore();

  const [showForm, setShowForm] = useState(false);
  const [editingImovel, setEditingImovel] = useState<Imovel | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Imovel | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [mapFilter, setMapFilter] = useState<MapFilter>({ tipo: 'todos', condicao: 'todos', quartos: 'todos' });

  useEffect(() => {
    fetchImoveis();
    fetchBenchmarks();
  }, [fetchImoveis, fetchBenchmarks]);

  const selected = imoveis.find(i => i.id === selectedId) ?? null;
  const selectedYields = selected ? getYields(selected) : { yieldBruto: 0, yieldLiquido: 0 };
  const selectedVd = selected ? calcularValorizacaoDetalhada(selected, benchmarks) : null;

  function handleAdd() {
    setEditingImovel(null);
    setShowForm(true);
  }

  function handleEdit(imovel: Imovel) {
    setEditingImovel(imovel);
    setShowForm(true);
  }

  async function handleSave(data: Record<string, unknown>) {
    if (editingImovel) {
      await atualizarImovel(editingImovel.id, data);
    } else {
      await criarImovel(data);
    }
  }

  async function handleDeleteConfirm() {
    if (deleteTarget) {
      await deletarImovel(deleteTarget.id);
      setDeleteTarget(null);
    }
  }

  return (
    <div className="app">
      {isDemo && (
        <div className="demo-banner">
          <Info size={16} />
          <span>Dados reais — alterações não são salvas nesta versão</span>
        </div>
      )}
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <LayoutDashboard size={24} />
          <h1>Real Estate Tracker</h1>
        </div>
        <div className="header-actions">
          {activeTab === 'dashboard' && (
            <div className="view-toggle">
              <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>
                <List size={16} /> Lista
              </button>
              <button className={viewMode === 'map' ? 'active' : ''} onClick={() => setViewMode('map')}>
                <Map size={16} /> Mapa
              </button>
            </div>
          )}
          <button className="btn-theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="btn-add" onClick={handleAdd}>
            <Plus size={18} />
            Adicionar imóvel
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="app-tabs">
        <button className={`app-tab ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
          <LayoutDashboard size={16} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
          Dashboard
        </button>
        <button className={`app-tab ${activeTab === 'evolution' ? 'active' : ''}`} onClick={() => setActiveTab('evolution')}>
          <TrendingUp size={16} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
          Evolução
        </button>
        <button className={`app-tab ${activeTab === 'simulator' ? 'active' : ''}`} onClick={() => setActiveTab('simulator')}>
          <Calculator size={16} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
          Simulador
        </button>
        <button className={`app-tab ${activeTab === 'market' ? 'active' : ''}`} onClick={() => setActiveTab('market')}>
          <Search size={16} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
          Explorador de Mercado
        </button>
      </div>

      {activeTab === 'market' ? (
        <MarketExplorer userProperties={imoveis} />
      ) : activeTab === 'simulator' ? (
        <FinancingSimulator
          valorImovelInicial={selected?.compra.valorCompra}
        />
      ) : activeTab === 'evolution' ? (
        <div className="evolution-page">
          <MarketTimingDashboard />
          <NeighborhoodScorecard />
          <EconomicIndicators />
          <FipeZapChart />
          <PortfolioEvolution imoveis={imoveis} benchmarks={benchmarks} />
          <EquityDebtChart imoveis={imoveis} benchmarks={benchmarks} />
        </div>
      ) : (
        <>
          {/* Portfolio Summary */}
          <PortfolioSummary imoveis={imoveis} />

          {/* Map view */}
          {viewMode === 'map' && (
            <>
              <MapFilters filtro={mapFilter} onChange={setMapFilter} />
              <PropertyMap
                imoveis={imoveis}
                selectedId={selectedId}
                onSelectImovel={selectImovel}
                dadosMercado={FIPEZAP_MARKET_DATA}
                filtro={mapFilter}
              />
            </>
          )}

          {/* Main content */}
          <div className="main-grid">
            {/* Property cards */}
            <div className="cards-column">
              <h2 className="section-title">Meus Imóveis</h2>
              {isLoading ? (
                <div className="loading-state">
                  <Loader2 size={32} className="spin" />
                  <span>Carregando imóveis...</span>
                </div>
              ) : error ? (
                <div className="error-state">
                  <p>Erro ao carregar: {error}</p>
                  <button onClick={fetchImoveis}>Tentar novamente</button>
                </div>
              ) : imoveis.length === 0 ? (
                <div className="empty-state">
                  <p>Nenhum imóvel cadastrado.</p>
                  <p>Clique em "Adicionar imóvel" para começar.</p>
                </div>
              ) : (
                <div className="cards-list">
                  {imoveis.map(imovel => (
                    <PropertyCard
                      key={imovel.id}
                      imovel={imovel}
                      benchmarks={benchmarks}
                      onClick={() => selectImovel(imovel.id)}
                      onEdit={() => handleEdit(imovel)}
                      onDelete={() => setDeleteTarget(imovel)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Detail panel */}
            <div className="detail-column">
              {selected ? (
                <>
                  <h2 className="section-title">{selected.nome} — Detalhes</h2>
                  <YieldBreakdown imovel={selected} />
                  {benchmarks?.selicAnual && benchmarks?.ipca12m && (
                    <BenchmarkChart
                      yieldBruto={selectedYields.yieldBruto}
                      yieldLiquido={selectedYields.yieldLiquido}
                      valorizacao12mPct={selectedVd?.ultimos12mPct ?? 0}
                      selicAnual={benchmarks.selicAnual}
                      ipca12m={benchmarks.ipca12m}
                      nomeImovel={selected.nome}
                      benchmarksData={benchmarks}
                    />
                  )}
                </>
              ) : (
                <div className="empty-detail">
                  Selecione um imóvel para ver os detalhes
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Form modal */}
      <PropertyForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSave={handleSave}
        editingImovel={editingImovel}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir imóvel"
        message={`Tem certeza que deseja excluir "${deleteTarget?.nome}"? Esta ação não pode ser desfeita.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

export default App;
