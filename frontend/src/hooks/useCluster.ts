import { useMemo } from 'react';
import Supercluster from 'supercluster';
import type L from 'leaflet';
import type { TransacaoITBI } from '../types';

export interface ClusterResult {
  type: 'cluster';
  clusterId: number;
  latitude: number;
  longitude: number;
  count: number;
  avgPrecoM2: number;
}

export interface PointResult {
  type: 'point';
  original: TransacaoITBI;
}

export type ClusterOrPoint = ClusterResult | PointResult;

// Cluster aggregation: simple average of valid precoM2 values.
// Transactions with null precoM2 are counted but excluded from the price average
// so the bubble still reflects volume while the price stays accurate.
function clusterMap(props: Record<string, unknown>): Record<string, unknown> {
  const precoM2 = props.precoM2 as number | null;
  return {
    sumPrecoM2: precoM2 ?? 0,
    priceCount: precoM2 != null ? 1 : 0,
  };
}

function clusterReduce(accumulated: Record<string, unknown>, props: Record<string, unknown>): void {
  (accumulated.sumPrecoM2 as number) += props.sumPrecoM2 as number;
  (accumulated.priceCount as number) += props.priceCount as number;
}

/**
 * Client-side clustering of ITBI transactions using supercluster.
 *
 * Returns cluster circles at low zoom and individual points at high zoom.
 * The supercluster index is memoized on the transactions array reference.
 */
export function useCluster(
  transactions: TransacaoITBI[],
  zoom: number,
  bounds: L.LatLngBounds | null,
): ClusterOrPoint[] {
  // Build supercluster index (only rebuilds when transactions change)
  const index = useMemo(() => {
    const sc = new Supercluster({
      radius: 60,
      maxZoom: 13,
      map: clusterMap,
      reduce: clusterReduce,
    });

    const points: Supercluster.PointFeature<Record<string, unknown>>[] = transactions.map(t => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [t.longitude, t.latitude] },
      properties: { id: t.id, precoM2: t.precoM2, valorTransacao: t.valorTransacao, _original: t },
    }));

    sc.load(points);
    return sc;
  }, [transactions]);

  // Get clusters for current viewport
  return useMemo(() => {
    if (!bounds || transactions.length === 0) return [];

    const bbox: [number, number, number, number] = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth(),
    ];

    const clusters = index.getClusters(bbox, zoom);

    return clusters.map(feature => {
      const [lng, lat] = feature.geometry.coordinates;
      const props = feature.properties;

      if (props.cluster) {
        const count = props.point_count as number;
        const avgPrecoM2 = (props.priceCount as number) > 0
          ? (props.sumPrecoM2 as number) / (props.priceCount as number)
          : 0;

        return {
          type: 'cluster' as const,
          clusterId: props.cluster_id as number,
          latitude: lat,
          longitude: lng,
          count,
          avgPrecoM2,
        };
      }

      return {
        type: 'point' as const,
        original: props._original as TransacaoITBI,
      };
    });
  }, [index, bounds, zoom, transactions.length]);
}
