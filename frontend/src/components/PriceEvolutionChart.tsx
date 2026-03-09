import { useEffect, useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';
import { X, TrendingUp, TrendingDown } from 'lucide-react';
import type { PriceEvolutionPoint, Imovel } from '../types';
import { fetchPriceEvolution } from '../services/marketApi';
import { useThemeColors } from '../hooks/useThemeColors';

interface Props {
  bairro: string;
  onClose: () => void;
  /** User's properties in this bairro (for reference lines) */
  userProperties?: Imovel[];
}

const fmt = (v: number) => `R$ ${(v / 1000).toFixed(1)}K`;
const fmtFull = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export function PriceEvolutionChart({ bairro, onClose, userProperties }: Props) {
  const [data, setData] = useState<PriceEvolutionPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const colors = useThemeColors();

  useEffect(() => {
    setLoading(true);
    fetchPriceEvolution(bairro).then(d => {
      setData(d);
      setLoading(false);
    });
  }, [bairro]);

  const trend = useMemo(() => {
    if (data.length < 2) return null;
    const first = data[0].medianPrecoM2;
    const last = data[data.length - 1].medianPrecoM2;
    const pct = ((last - first) / first) * 100;
    return { pct, direction: pct >= 0 ? 'up' : 'down' as const };
  }, [data]);

  // Find user's purchase price/m² in this bairro
  const userPurchasePriceM2 = useMemo(() => {
    if (!userProperties?.length) return null;
    const prop = userProperties.find(p =>
      p.endereco.bairro.toLowerCase().includes(bairro.toLowerCase())
    );
    if (!prop) return null;
    return prop.compra.valorCompra / prop.areaUtil;
  }, [userProperties, bairro]);

  if (loading) {
    return (
      <div className="price-evolution-panel">
        <div className="pe-header">
          <h4>Evolução de Preço — {bairro}</h4>
          <button className="btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="pe-loading">Carregando...</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="price-evolution-panel">
        <div className="pe-header">
          <h4>Evolução de Preço — {bairro}</h4>
          <button className="btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="pe-loading">Sem dados suficientes para {bairro}</div>
      </div>
    );
  }

  return (
    <div className="price-evolution-panel">
      <div className="pe-header">
        <div>
          <h4>Evolução de Preço — {bairro}</h4>
          {trend && (
            <span className={`pe-trend ${trend.direction === 'up' ? 'positive' : 'negative'}`}>
              {trend.direction === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {trend.pct >= 0 ? '+' : ''}{trend.pct.toFixed(1)}% no período
            </span>
          )}
        </div>
        <button className="btn-icon" onClick={onClose}><X size={16} /></button>
      </div>

      <div className="pe-chart">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: colors.muted }}
              tickFormatter={v => {
                const [y, m] = v.split('-');
                return `${m}/${y.slice(2)}`;
              }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: colors.muted }}
              tickFormatter={fmt}
              width={65}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-light)',
                borderRadius: 8,
                fontSize: 12,
                color: 'var(--text-body)',
              }}
              formatter={(value: unknown) => [fmtFull(Number(value)) + '/m²', 'Mediana']}
              labelFormatter={v => {
                const [y, m] = String(v).split('-');
                return `${m}/${y}`;
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="medianPrecoM2"
              name="R$/m² mediano"
              stroke={colors.green}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            {userPurchasePriceM2 && (
              <ReferenceLine
                y={userPurchasePriceM2}
                stroke={colors.orange}
                strokeDasharray="5 5"
                label={{
                  value: `Compra: ${fmt(userPurchasePriceM2)}`,
                  fill: colors.orange,
                  fontSize: 11,
                  position: 'right',
                }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="pe-footer">
        <span>{data.length} meses de dados</span>
        <span>Último: {fmtFull(data[data.length - 1].medianPrecoM2)}/m²</span>
      </div>
    </div>
  );
}
