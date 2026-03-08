import { useState } from 'react';
import { X } from 'lucide-react';
import { CurrencyInput } from './CurrencyInput';
import type { Imovel } from '../types';

const UF_OPTIONS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
];

const TIPO_OPTIONS = [
  { value: 'apartamento', label: 'Apartamento' },
  { value: 'casa', label: 'Casa' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'terreno', label: 'Terreno' },
  { value: 'sala', label: 'Sala' },
  { value: 'loja', label: 'Loja' },
];

interface FormData {
  nome: string;
  tipo: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  area_util: number;
  quartos: number;
  vagas: number;
  valor_compra: number;
  data_compra: string;
  iptu_anual: number;
  condominio_mensal: number;
  seguro_anual: number;
  manutencao_mensal: number;
  tipo_renda: string;
  aluguel_mensal: number;
  taxa_vacancia_pct: number;
  diaria_media: number;
  taxa_ocupacao_pct: number;
  custos_plataforma_pct: number;
  valor_atual_estimado: number;
}

function imovelToForm(imovel: Imovel): FormData {
  return {
    nome: imovel.nome,
    tipo: imovel.tipo,
    logradouro: imovel.endereco.logradouro,
    numero: imovel.endereco.numero,
    bairro: imovel.endereco.bairro,
    cidade: imovel.endereco.cidade,
    uf: imovel.endereco.uf,
    cep: '',
    area_util: imovel.areaUtil,
    quartos: imovel.quartos,
    vagas: imovel.vagas,
    valor_compra: imovel.compra.valorCompra,
    data_compra: imovel.compra.dataCompra,
    iptu_anual: imovel.custos.iptuAnual,
    condominio_mensal: imovel.custos.condominioMensal,
    seguro_anual: imovel.custos.seguroAnual,
    manutencao_mensal: imovel.custos.manutencaoMensal,
    tipo_renda: imovel.renda.tipo,
    aluguel_mensal: imovel.renda.aluguelMensal ?? 0,
    taxa_vacancia_pct: imovel.renda.taxaVacanciaPct,
    diaria_media: imovel.renda.diariaMedia ?? 0,
    taxa_ocupacao_pct: imovel.renda.taxaOcupacaoPct ?? 0,
    custos_plataforma_pct: imovel.renda.custosPlataformaPct ?? 3,
    valor_atual_estimado: imovel.valorAtualEstimado ?? 0,
  };
}

const EMPTY_FORM: FormData = {
  nome: '',
  tipo: 'apartamento',
  logradouro: '',
  numero: '',
  bairro: '',
  cidade: 'São Paulo',
  uf: 'SP',
  cep: '',
  area_util: 0,
  quartos: 0,
  vagas: 0,
  valor_compra: 0,
  data_compra: new Date().toISOString().split('T')[0],
  iptu_anual: 0,
  condominio_mensal: 0,
  seguro_anual: 0,
  manutencao_mensal: 0,
  tipo_renda: 'aluguel_longterm',
  aluguel_mensal: 0,
  taxa_vacancia_pct: 0,
  diaria_media: 0,
  taxa_ocupacao_pct: 0,
  custos_plataforma_pct: 3,
  valor_atual_estimado: 0,
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  editingImovel?: Imovel | null;
}

export function PropertyForm({ open, onClose, onSave, editingImovel }: Props) {
  const [form, setForm] = useState<FormData>(
    editingImovel ? imovelToForm(editingImovel) : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [section, setSection] = useState(0);

  if (!open) return null;

  const set = <K extends keyof FormData>(key: K, val: FormData[K]) =>
    setForm(prev => ({ ...prev, [key]: val }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome || !form.area_util || !form.valor_compra) return;

    setSaving(true);
    try {
      const payload: Record<string, unknown> = { ...form };
      // Clean up based on renda type
      if (form.tipo_renda === 'aluguel_longterm') {
        payload.diaria_media = null;
        payload.taxa_ocupacao_pct = null;
      } else {
        payload.aluguel_mensal = null;
      }
      if (!form.valor_atual_estimado) {
        payload.valor_atual_estimado = null;
      }
      await onSave(payload);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const sections = ['Identificação', 'Características', 'Financeiro', 'Renda'];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content form-modal" onClick={e => e.stopPropagation()}>
        <div className="form-header">
          <h2>{editingImovel ? 'Editar Imóvel' : 'Novo Imóvel'}</h2>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Section tabs */}
        <div className="form-tabs">
          {sections.map((s, i) => (
            <button
              key={s}
              className={`form-tab ${i === section ? 'active' : ''}`}
              onClick={() => setSection(i)}
              type="button"
            >
              {s}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Section 0: Identificação */}
          {section === 0 && (
            <div className="form-section">
              <label className="form-field">
                <span className="form-label">Nome *</span>
                <input type="text" value={form.nome} onChange={e => set('nome', e.target.value)} required />
              </label>
              <label className="form-field">
                <span className="form-label">Tipo</span>
                <select value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                  {TIPO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
              <div className="form-row">
                <label className="form-field flex-2">
                  <span className="form-label">Logradouro</span>
                  <input type="text" value={form.logradouro} onChange={e => set('logradouro', e.target.value)} />
                </label>
                <label className="form-field flex-1">
                  <span className="form-label">Número</span>
                  <input type="text" value={form.numero} onChange={e => set('numero', e.target.value)} />
                </label>
              </div>
              <div className="form-row">
                <label className="form-field flex-1">
                  <span className="form-label">Bairro</span>
                  <input type="text" value={form.bairro} onChange={e => set('bairro', e.target.value)} />
                </label>
                <label className="form-field flex-1">
                  <span className="form-label">Cidade</span>
                  <input type="text" value={form.cidade} onChange={e => set('cidade', e.target.value)} />
                </label>
                <label className="form-field" style={{ width: 80 }}>
                  <span className="form-label">UF</span>
                  <select value={form.uf} onChange={e => set('uf', e.target.value)}>
                    {UF_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </label>
              </div>
            </div>
          )}

          {/* Section 1: Características */}
          {section === 1 && (
            <div className="form-section">
              <label className="form-field">
                <span className="form-label">Área útil (m²) *</span>
                <input type="number" step="0.1" min="0" value={form.area_util || ''} onChange={e => set('area_util', parseFloat(e.target.value) || 0)} required />
              </label>
              <div className="form-row">
                <label className="form-field flex-1">
                  <span className="form-label">Quartos</span>
                  <input type="number" min="0" value={form.quartos} onChange={e => set('quartos', parseInt(e.target.value) || 0)} />
                </label>
                <label className="form-field flex-1">
                  <span className="form-label">Vagas</span>
                  <input type="number" min="0" value={form.vagas} onChange={e => set('vagas', parseInt(e.target.value) || 0)} />
                </label>
              </div>
            </div>
          )}

          {/* Section 2: Financeiro */}
          {section === 2 && (
            <div className="form-section">
              <CurrencyInput label="Valor de compra" value={form.valor_compra} onChange={v => set('valor_compra', v)} required />
              <label className="form-field">
                <span className="form-label">Data da compra *</span>
                <input type="date" value={form.data_compra} onChange={e => set('data_compra', e.target.value)} required />
              </label>
              <div className="form-row">
                <CurrencyInput label="IPTU anual" value={form.iptu_anual} onChange={v => set('iptu_anual', v)} />
                <CurrencyInput label="Condomínio mensal" value={form.condominio_mensal} onChange={v => set('condominio_mensal', v)} />
              </div>
              <div className="form-row">
                <CurrencyInput label="Seguro anual" value={form.seguro_anual} onChange={v => set('seguro_anual', v)} />
                <CurrencyInput label="Manutenção mensal" value={form.manutencao_mensal} onChange={v => set('manutencao_mensal', v)} />
              </div>
              <CurrencyInput label="Valor atual estimado" value={form.valor_atual_estimado} onChange={v => set('valor_atual_estimado', v)} />
            </div>
          )}

          {/* Section 3: Renda */}
          {section === 3 && (
            <div className="form-section">
              <div className="form-field">
                <span className="form-label">Tipo de renda</span>
                <div className="radio-group">
                  <label className="radio-option">
                    <input type="radio" name="tipo_renda" value="aluguel_longterm" checked={form.tipo_renda === 'aluguel_longterm'} onChange={() => set('tipo_renda', 'aluguel_longterm')} />
                    Aluguel Long-term
                  </label>
                  <label className="radio-option">
                    <input type="radio" name="tipo_renda" value="airbnb" checked={form.tipo_renda === 'airbnb'} onChange={() => set('tipo_renda', 'airbnb')} />
                    Airbnb
                  </label>
                </div>
              </div>

              {form.tipo_renda === 'aluguel_longterm' ? (
                <>
                  <CurrencyInput label="Aluguel mensal" value={form.aluguel_mensal} onChange={v => set('aluguel_mensal', v)} />
                  <label className="form-field">
                    <span className="form-label">Vacância (%)</span>
                    <input type="number" step="0.1" min="0" max="100" value={form.taxa_vacancia_pct} onChange={e => set('taxa_vacancia_pct', parseFloat(e.target.value) || 0)} />
                  </label>
                </>
              ) : (
                <>
                  <CurrencyInput label="Diária média" value={form.diaria_media} onChange={v => set('diaria_media', v)} />
                  <label className="form-field">
                    <span className="form-label">Taxa de ocupação (%)</span>
                    <input type="number" step="0.1" min="0" max="100" value={form.taxa_ocupacao_pct} onChange={e => set('taxa_ocupacao_pct', parseFloat(e.target.value) || 0)} />
                  </label>
                  <label className="form-field">
                    <span className="form-label">Taxa plataforma (%)</span>
                    <input type="number" step="0.1" min="0" max="100" value={form.custos_plataforma_pct} onChange={e => set('custos_plataforma_pct', parseFloat(e.target.value) || 0)} />
                  </label>
                </>
              )}
            </div>
          )}

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : editingImovel ? 'Atualizar' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
