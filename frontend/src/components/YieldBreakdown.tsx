import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { Imovel } from '../types';
import { calcularYieldLongterm, calcularYieldAirbnb, calcularValorizacao } from '../services/calculations';
import { TAXA_ADMINISTRACAO_PCT, CUSTOS_LIMPEZA_POR_ESTADIA, MEDIA_NOITES_POR_ESTADIA } from '../config';
import { useThemeColors } from '../hooks/useThemeColors';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface Props {
  imovel: Imovel;
}

export function YieldBreakdown({ imovel }: Props) {
  const tc = useThemeColors();
  const COLORS = [tc.green, tc.orange, tc.red, tc.indigo, tc.purple, tc.pink];
  const val = calcularValorizacao(imovel);

  if (imovel.renda.tipo === 'airbnb' && imovel.renda.diariaMedia && imovel.renda.taxaOcupacaoPct) {
    const custoFixo = imovel.custos.condominioMensal + imovel.custos.iptuAnual / 12;
    const res = calcularYieldAirbnb(
      val.valorAtual,
      imovel.renda.diariaMedia,
      imovel.renda.taxaOcupacaoPct,
      custoFixo,
      imovel.renda.custosPlataformaPct ?? 3,
      CUSTOS_LIMPEZA_POR_ESTADIA,
      MEDIA_NOITES_POR_ESTADIA,
    );

    const pieData = [
      { name: 'Receita líquida', value: res.receitaLiquidaAnual },
      { name: 'Taxa plataforma', value: res.breakdown.taxaPlataforma },
      { name: 'Limpeza', value: res.breakdown.limpezaTotal },
      { name: 'Custos fixos', value: res.breakdown.custosFixos },
    ].filter(d => d.value > 0);

    return (
      <div className="breakdown-panel">
        <h4>Breakdown — Airbnb</h4>
        <div className="breakdown-grid">
          <div className="breakdown-chart">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={80} label={false}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmt(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="breakdown-details">
            <div className="detail-row">
              <span>Diária média</span>
              <span>{fmt(imovel.renda.diariaMedia)}</span>
            </div>
            <div className="detail-row">
              <span>Ocupação</span>
              <span>{imovel.renda.taxaOcupacaoPct}%</span>
            </div>
            <div className="detail-row">
              <span>Noites/ano</span>
              <span>{res.noitesOcupadasAno}</span>
            </div>
            <div className="detail-row separator">
              <span>Receita bruta</span>
              <span>{fmt(res.receitaBrutaAnual)}</span>
            </div>
            <div className="detail-row cost">
              <span>Taxa plataforma</span>
              <span>-{fmt(res.breakdown.taxaPlataforma)}</span>
            </div>
            <div className="detail-row cost">
              <span>Limpeza</span>
              <span>-{fmt(res.breakdown.limpezaTotal)}</span>
            </div>
            <div className="detail-row cost">
              <span>Custos fixos</span>
              <span>-{fmt(res.breakdown.custosFixos)}</span>
            </div>
            <div className="detail-row total">
              <span>Receita líquida</span>
              <span>{fmt(res.receitaLiquidaAnual)}</span>
            </div>
            <div className="detail-row highlight">
              <span>Yield bruto</span>
              <span>{res.yieldBruto.toFixed(2)}%</span>
            </div>
            <div className="detail-row highlight">
              <span>Yield líquido</span>
              <span>{res.yieldLiquido.toFixed(2)}%</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Long-term
  const res = calcularYieldLongterm(
    val.valorAtual,
    imovel.renda.aluguelMensal ?? 0,
    imovel.custos.iptuAnual,
    imovel.custos.condominioMensal,
    imovel.custos.seguroAnual,
    imovel.custos.manutencaoMensal,
    TAXA_ADMINISTRACAO_PCT,
    imovel.renda.taxaVacanciaPct,
  );

  const pieData = [
    { name: 'Receita líquida', value: Math.max(0, res.receitaLiquidaAnual) },
    { name: 'IPTU', value: res.breakdown.iptu },
    { name: 'Condomínio', value: res.breakdown.condominioAnual },
    { name: 'Administração', value: res.breakdown.administracao },
    { name: 'IR', value: res.irAnual },
    { name: 'Outros', value: res.breakdown.seguro + res.breakdown.manutencaoAnual },
  ].filter(d => d.value > 0);

  return (
    <div className="breakdown-panel">
      <h4>Breakdown — Aluguel Long-term</h4>
      <div className="breakdown-grid">
        <div className="breakdown-chart">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={80} label={false}>
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => fmt(Number(v))} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="breakdown-details">
          <div className="detail-row">
            <span>Aluguel mensal</span>
            <span>{fmt(imovel.renda.aluguelMensal ?? 0)}</span>
          </div>
          <div className="detail-row">
            <span>Vacância</span>
            <span>{imovel.renda.taxaVacanciaPct}%</span>
          </div>
          <div className="detail-row separator">
            <span>Receita bruta anual</span>
            <span>{fmt(res.receitaBrutaAnual)}</span>
          </div>
          <div className="detail-row cost">
            <span>IPTU</span>
            <span>-{fmt(res.breakdown.iptu)}</span>
          </div>
          <div className="detail-row cost">
            <span>Condomínio</span>
            <span>-{fmt(res.breakdown.condominioAnual)}</span>
          </div>
          <div className="detail-row cost">
            <span>Administração (8%)</span>
            <span>-{fmt(res.breakdown.administracao)}</span>
          </div>
          <div className="detail-row cost">
            <span>Seguro + Manutenção</span>
            <span>-{fmt(res.breakdown.seguro + res.breakdown.manutencaoAnual)}</span>
          </div>
          <div className="detail-row cost">
            <span>IR</span>
            <span>-{fmt(res.irAnual)}</span>
          </div>
          <div className="detail-row total">
            <span>Receita líquida anual</span>
            <span>{fmt(res.receitaLiquidaAnual)}</span>
          </div>
          <div className="detail-row highlight">
            <span>Yield bruto</span>
            <span>{res.yieldBruto.toFixed(2)}%</span>
          </div>
          <div className="detail-row highlight">
            <span>Yield líquido</span>
            <span>{res.yieldLiquido.toFixed(2)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
