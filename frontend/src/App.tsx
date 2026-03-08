import { useState } from 'react';
import { LayoutDashboard, Plus } from 'lucide-react';
import { PropertyCard } from './components/PropertyCard';
import { YieldBreakdown } from './components/YieldBreakdown';
import { BenchmarkChart } from './components/BenchmarkChart';
import { PortfolioSummary } from './components/PortfolioSummary';
import { MOCK_IMOVEIS, MOCK_BENCHMARKS } from './services/mockData';
import { calcularValorizacao, calcularYieldLongterm, calcularYieldAirbnb } from './services/calculations';
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
      8, imovel.renda.taxaVacanciaPct,
    ).yieldLiquido;
  }
  return 0;
}

function App() {
  const [selectedId, setSelectedId] = useState<string | null>(MOCK_IMOVEIS[0]?.id ?? null);
  const selected = MOCK_IMOVEIS.find(i => i.id === selectedId) ?? null;
  const selectedYield = selected ? getYield(selected) : 0;

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <LayoutDashboard size={24} />
          <h1>Real Estate Tracker</h1>
        </div>
        <button className="btn-add">
          <Plus size={18} />
          Adicionar imóvel
        </button>
      </header>

      {/* Portfolio Summary */}
      <PortfolioSummary imoveis={MOCK_IMOVEIS} />

      {/* Main content */}
      <div className="main-grid">
        {/* Property cards */}
        <div className="cards-column">
          <h2 className="section-title">Meus Imóveis</h2>
          <div className="cards-list">
            {MOCK_IMOVEIS.map(imovel => (
              <PropertyCard
                key={imovel.id}
                imovel={imovel}
                onClick={() => setSelectedId(imovel.id)}
              />
            ))}
          </div>
        </div>

        {/* Detail panel */}
        <div className="detail-column">
          {selected ? (
            <>
              <h2 className="section-title">{selected.nome} — Detalhes</h2>
              <YieldBreakdown imovel={selected} />
              {MOCK_BENCHMARKS.selicAnual && MOCK_BENCHMARKS.ipca12m && (
                <BenchmarkChart
                  yieldImovel={selectedYield}
                  selicAnual={MOCK_BENCHMARKS.selicAnual}
                  ipca12m={MOCK_BENCHMARKS.ipca12m}
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
    </div>
  );
}

export default App;
