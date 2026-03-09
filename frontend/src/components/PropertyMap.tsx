import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { Imovel } from '../types';
import { calcularValorizacao } from '../services/calculations';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Fix default marker icon issue with webpack/vite
const defaultIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const selectedIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [30, 49],
  iconAnchor: [15, 49],
  popupAnchor: [1, -40],
  shadowSize: [49, 49],
  className: 'marker-selected',
});

interface Props {
  imoveis: Imovel[];
  selectedId?: string | null;
  onSelectImovel?: (id: string) => void;
}

interface ImovelWithCoords extends Imovel {
  _lat: number;
  _lng: number;
}

export function PropertyMap({ imoveis, selectedId, onSelectImovel }: Props) {
  // Filter imoveis that have coordinates
  // For now, use city-based defaults if no lat/lng
  const mapped: ImovelWithCoords[] = imoveis.map(im => {
    const lat = (im as unknown as Record<string, unknown>).latitude as number | undefined;
    const lng = (im as unknown as Record<string, unknown>).longitude as number | undefined;
    if (lat && lng) {
      return { ...im, _lat: lat, _lng: lng };
    }
    // Default coordinates by city
    const defaults: Record<string, [number, number]> = {
      'São Paulo': [-23.5505, -46.6333],
      'Rio de Janeiro': [-22.9068, -43.1729],
      'Belo Horizonte': [-19.9167, -43.9345],
      'Curitiba': [-25.4284, -49.2733],
      'Porto Alegre': [-30.0346, -51.2177],
    };
    const city = im.endereco.cidade;
    const [dlat, dlng] = defaults[city] ?? [-23.5505, -46.6333];
    // Add small random offset so markers don't overlap
    const offset = () => (Math.random() - 0.5) * 0.02;
    return { ...im, _lat: dlat + offset(), _lng: dlng + offset() };
  });

  if (mapped.length === 0) {
    return (
      <div className="map-empty">
        <p>Adicione imóveis para visualizar no mapa.</p>
      </div>
    );
  }

  const center: [number, number] = [
    mapped.reduce((s, m) => s + m._lat, 0) / mapped.length,
    mapped.reduce((s, m) => s + m._lng, 0) / mapped.length,
  ];

  return (
    <div className="map-container">
      <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%', borderRadius: 12 }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {mapped.map(im => {
          const val = calcularValorizacao(im);
          return (
            <Marker
              key={im.id}
              position={[im._lat, im._lng]}
              icon={im.id === selectedId ? selectedIcon : defaultIcon}
              eventHandlers={{
                click: () => onSelectImovel?.(im.id),
              }}
            >
              <Popup>
                <div style={{ minWidth: 160 }}>
                  <strong>{im.nome}</strong>
                  <br />
                  <span style={{ fontSize: 12, color: '#64748b' }}>
                    {im.endereco.bairro}, {im.endereco.cidade}
                  </span>
                  <br />
                  <span style={{ fontSize: 13 }}>
                    Valor: {fmt(val.valorAtual)}
                  </span>
                  <br />
                  <span style={{ fontSize: 12, color: '#64748b' }}>
                    {im.areaUtil}m² | {fmt(val.precoM2)}/m²
                  </span>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
