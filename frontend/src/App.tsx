import { useEffect, useState } from 'react';
import { LayoutDashboard, Plus, Loader2, List, Map, Calculator } from 'lucide-react';
import { PropertyCard } from './components/PropertyCard';
import { PropertyMap } from './components/PropertyMap';
import { YieldBreakdown } from './components/YieldBreakdown';
import { BenchmarkChart } from './components/BenchmarkChart';
import { PortfolioSummary } from './components/PortfolioSummary';
import { PropertyForm } from './components/PropertyForm';
import { ConfirmDialog } from './components/ConfirmDialog';
import { FinancingSimulator } from './components/FinancingSimulator';
import { useStore } from './store/useStore';
import { calcularValorizacao, calcularYieldLongterm, calcularYieldAirbnb } from './services/calculations';
import { TAXA_ADMINISTRACAO_PCT } from './config';
import type { Imovel } from './types';
import './App.css';

function getYield(imovel: Imovel): number {
  const val = calcularValorizacao(imovel);
  if (imovel.renda.tipo === 'airbnb' && imovel.renda.diariaMedia && imovel.renda.taxaOcupacaoPct) {
    const custoFixo = imovel.custos.condominioMensal + imovel.custos.iptuAnual / 12;
    return calcularYieldAirbnb(val.valorAtual, imovel.renda.diariaMedia, imovel.renda.taxaOcupacaoPct, custoFixo).yieldLiquido;
  }
  if (imovel.renda.aluguelMensal) {
    return calcularYieldLongterm(
      val.valorAtual, imovel.renda.aluguelMensal, imovel.custos.iptuAnual,
      imovel.custos.condominioMensal, imovel.custos.seguroAnual, imovel.custos.manutencaoMensal,
      TAXA_ADMINISTRACAO_PCT, imovel.renda.taxaVacanciaPct,
    ).yieldLiquido;
  }
  return 0;
}

type AppTab = 'dashboard' | 'simulator';

function App() {
  const {
    imoveis, selectedId, benchmarks, isLoading, error,
    fetchImoveis, fetchBenchmarks, selectImovel,
    criarImovel, atualizarImovel, deletarImovel,
  } = useStore();

  const [showForm, setShowForm] = useState(false);
  const [editingImovel, setEditingImovel] = useState<Imovel | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Imovel | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');

  useEffect(() => {
    fetchImoveis();
    fetchBenchmarks();
  }, [fetchImoveis, fetchBenchmarks]);

  const selected = imoveis.find(i => i.id === selectedId) ?? null;
  const selectedYield = selected ? getYield(selected) : 0;

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
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <LayoutDashboard size={24} />
          <h1>Real Estate Tracker</h1>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
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
        <button className={`app-tab ${activeTab === 'simulator' ? 'active' : ''}`} onClick={() => setActiveTab('simulator')}>
          <Calculator size={16} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
          Simulador
        </button>
      </div>

      {activeTab === 'simulator' ? (
        <FinancingSimulator
          valorImovelInicial={selected?.compra.valorCompra}
        />
      ) : (
        <>
          {/* Portfolio Summary */}
          <PortfolioSummary imoveis={imoveis} />

          {/* Map view */}
          {viewMode === 'map' && (
            <PropertyMap
              imoveis={imoveis}
              selectedId={selectedId}
              onSelectImovel={selectImovel}
            />
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
                      yieldImovel={selectedYield}
                      selicAnual={benchmarks.selicAnual}
                      ipca12m={benchmarks.ipca12m}
                      nomeImovel={selected.nome}
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
