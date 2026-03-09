import type { MapFilter } from '../types';

interface Props {
  filtro: MapFilter;
  onChange: (filtro: MapFilter) => void;
}

export function MapFilters({ filtro, onChange }: Props) {
  return (
    <div className="map-filters">
      <div className="map-filter-group">
        <label>Tipo</label>
        <select
          value={filtro.tipo}
          onChange={e => onChange({ ...filtro, tipo: e.target.value as MapFilter['tipo'] })}
        >
          <option value="todos">Todos</option>
          <option value="apartamento">Apartamento</option>
          <option value="casa">Casa</option>
        </select>
      </div>
      <div className="map-filter-group">
        <label>Condição</label>
        <select
          value={filtro.condicao}
          onChange={e => onChange({ ...filtro, condicao: e.target.value as MapFilter['condicao'] })}
        >
          <option value="todos">Todos</option>
          <option value="novo">Novo</option>
          <option value="usado">Usado</option>
        </select>
      </div>
      <div className="map-filter-group">
        <label>Quartos</label>
        <select
          value={String(filtro.quartos)}
          onChange={e => {
            const v = e.target.value;
            onChange({ ...filtro, quartos: v === 'todos' ? 'todos' : Number(v) });
          }}
        >
          <option value="todos">Todos</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4+</option>
        </select>
      </div>
    </div>
  );
}
