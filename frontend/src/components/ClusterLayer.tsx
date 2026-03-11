import { CircleMarker, Tooltip } from 'react-leaflet';
import type { ClusterOrPoint } from '../hooks/useCluster';
import { priceToColor } from '../utils/colors';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

interface Props {
  clusters: ClusterOrPoint[];
}

export function ClusterLayer({ clusters }: Props) {
  return (
    <>
      {clusters.map(item => {
        if (item.type === 'cluster') {
          const radius = 10 + Math.log2(item.count) * 5;
          const color = item.avgPrecoM2 > 0 ? priceToColor(item.avgPrecoM2) : '#94a3b8';
          return (
            <CircleMarker
              key={`cl-${item.clusterId}`}
              center={[item.latitude, item.longitude]}
              radius={radius}
              pathOptions={{
                fillColor: color,
                fillOpacity: 0.65,
                color,
                weight: 2,
                opacity: 0.85,
              }}
            >
              <Tooltip>
                <div style={{ minWidth: 130, fontSize: 12 }}>
                  <strong>{item.count} transações</strong>
                  {item.avgPrecoM2 > 0 && (
                    <>
                      <br />
                      Média: {fmt(item.avgPrecoM2)}/m²
                    </>
                  )}
                </div>
              </Tooltip>
            </CircleMarker>
          );
        }

        // Individual point at cluster edge
        const t = item.original;
        return (
          <CircleMarker
            key={`pt-${t.id}`}
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
        );
      })}
    </>
  );
}
