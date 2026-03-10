import { useState } from 'react';
import { Bell, Plus, Trash2, Star, AlertTriangle } from 'lucide-react';
import type { MarketAlert } from '../types';
import { createAlert, deleteAlert } from '../services/marketApi';
import { SP_BAIRRO_NAMES } from '../services/staticData';

interface Props {
  alerts: MarketAlert[];
  onAlertsChange: (alerts: MarketAlert[]) => void;
  watchedBairros: string[];
  onToggleWatchBairro: (bairro: string) => void;
}

const ALERT_TYPES = [
  { value: 'price_drop', label: 'Queda de preço', description: 'Quando R$/m² cair abaixo de...' },
  { value: 'new_transaction', label: 'Nova transação', description: 'Quando ocorrer transação em...' },
  { value: 'yield_change', label: 'Yield acima de', description: 'Quando yield estimado superar...' },
] as const;

export function MarketAlerts({ alerts, onAlertsChange, watchedBairros, onToggleWatchBairro }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [formTipo, setFormTipo] = useState<string>('price_drop');
  const [formBairro, setFormBairro] = useState('');
  const [formLogradouro, setFormLogradouro] = useState('');
  const [formPrecoLimite, setFormPrecoLimite] = useState('');
  const [formYieldLimite, setFormYieldLimite] = useState('');

  async function handleCreate() {
    const alert = await createAlert({
      tipo: formTipo,
      bairro: formBairro || undefined,
      logradouro: formLogradouro || undefined,
      preco_m2_limite: formPrecoLimite ? Number(formPrecoLimite) : undefined,
      yield_limite: formYieldLimite ? Number(formYieldLimite) : undefined,
    });
    onAlertsChange([alert, ...alerts]);
    setShowCreate(false);
    setFormBairro('');
    setFormLogradouro('');
    setFormPrecoLimite('');
    setFormYieldLimite('');
  }

  async function handleDelete(id: number) {
    await deleteAlert(id);
    onAlertsChange(alerts.filter(a => a.id !== id));
  }

  return (
    <div className="market-alerts-panel">
      <div className="ma-header">
        <h4><Bell size={16} /> Alertas & Watchlist</h4>
        <button className="mf-chip active" onClick={() => setShowCreate(!showCreate)}>
          <Plus size={14} /> Novo
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="ma-create-form">
          <select
            value={formTipo}
            onChange={e => setFormTipo(e.target.value)}
            className="mf-input"
          >
            {ALERT_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          <select
            value={formBairro}
            onChange={e => setFormBairro(e.target.value)}
            className="mf-input"
          >
            <option value="">Selecione o bairro</option>
            {SP_BAIRRO_NAMES.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          {formTipo === 'new_transaction' && (
            <input
              type="text"
              placeholder="Logradouro (opcional)"
              value={formLogradouro}
              onChange={e => setFormLogradouro(e.target.value)}
              className="mf-input"
            />
          )}

          {formTipo === 'price_drop' && (
            <input
              type="number"
              placeholder="R$/m² limite"
              value={formPrecoLimite}
              onChange={e => setFormPrecoLimite(e.target.value)}
              className="mf-input"
            />
          )}

          {formTipo === 'yield_change' && (
            <input
              type="number"
              placeholder="Yield % limite"
              value={formYieldLimite}
              onChange={e => setFormYieldLimite(e.target.value)}
              className="mf-input"
              step="0.1"
            />
          )}

          <div className="ma-form-actions">
            <button className="btn-secondary" onClick={() => setShowCreate(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleCreate} disabled={!formBairro}>Criar</button>
          </div>
        </div>
      )}

      {/* Active alerts */}
      {alerts.length > 0 && (
        <div className="ma-alerts-list">
          <div className="ma-section-title">Alertas ativos</div>
          {alerts.map(alert => (
            <div key={alert.id} className="ma-alert-item">
              <div className="ma-alert-info">
                <AlertTriangle size={14} />
                <div>
                  <div className="ma-alert-type">
                    {ALERT_TYPES.find(t => t.value === alert.tipo)?.label || alert.tipo}
                  </div>
                  <div className="ma-alert-detail">
                    {alert.bairro && <span>{alert.bairro}</span>}
                    {alert.preco_m2_limite && <span> ≤ R$ {alert.preco_m2_limite.toLocaleString('pt-BR')}/m²</span>}
                    {alert.yield_limite && <span> ≥ {alert.yield_limite}%</span>}
                    {alert.logradouro && <span> — {alert.logradouro}</span>}
                  </div>
                </div>
              </div>
              <button className="btn-icon-sm btn-icon-danger" onClick={() => handleDelete(alert.id)}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Watchlist */}
      <div className="ma-watchlist">
        <div className="ma-section-title">Bairros favoritos</div>
        {watchedBairros.length === 0 ? (
          <div className="ma-empty">
            Clique <Star size={12} /> no mapa para adicionar bairros à watchlist
          </div>
        ) : (
          <div className="ma-watched-chips">
            {watchedBairros.map(b => (
              <button
                key={b}
                className="mf-chip active"
                onClick={() => onToggleWatchBairro(b)}
              >
                <Star size={12} fill="currentColor" /> {b}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
