import { useState, useRef, useCallback, useEffect } from 'react';
import type { TransacaoITBI } from '../types';
import { fetchTimeSeries } from '../services/marketApi';

interface TimeLapseState {
  isPlaying: boolean;
  currentPeriodo: string;
  speed: number; // 1, 2, 4
  currentTransactions: TransacaoITBI[];
  allPeriodos: string[];
  currentIndex: number;
}

// Generate monthly periods from start to end
function generatePeriodos(start: string, end: string): string[] {
  const periods: string[] = [];
  const [sy, sm] = start.split('-').map(Number);
  const [ey, em] = end.split('-').map(Number);

  let y = sy, m = sm;
  while (y < ey || (y === ey && m <= em)) {
    periods.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return periods;
}

export function useTimeLapse(dataInicio: string, dataFim: string) {
  const [state, setState] = useState<TimeLapseState>({
    isPlaying: false,
    currentPeriodo: dataInicio || '2019-01',
    speed: 1,
    currentTransactions: [],
    allPeriodos: [],
    currentIndex: 0,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Generate periods when date range changes
  useEffect(() => {
    const start = dataInicio || '2019-01';
    const end = dataFim || '2025-06';
    const periodos = generatePeriodos(start, end);
    setState(s => ({
      ...s,
      allPeriodos: periodos,
      currentPeriodo: periodos[0] || start,
      currentIndex: 0,
    }));
  }, [dataInicio, dataFim]);

  const loadPeriod = useCallback(async (periodo: string) => {
    const transactions = await fetchTimeSeries(periodo);
    setState(s => ({
      ...s,
      currentPeriodo: periodo,
      currentTransactions: transactions,
    }));
  }, []);

  const play = useCallback(() => {
    setState(s => ({ ...s, isPlaying: true }));

    const advance = async () => {
      const s = stateRef.current;
      const nextIndex = s.currentIndex + 1;
      if (nextIndex >= s.allPeriodos.length) {
        // Loop back to start
        setState(prev => ({ ...prev, isPlaying: false, currentIndex: 0 }));
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }
      const nextPeriodo = s.allPeriodos[nextIndex];
      setState(prev => ({ ...prev, currentIndex: nextIndex, currentPeriodo: nextPeriodo }));
      await loadPeriod(nextPeriodo);
    };

    intervalRef.current = setInterval(advance, 1500 / state.speed);
  }, [loadPeriod, state.speed]);

  const pause = useCallback(() => {
    setState(s => ({ ...s, isPlaying: false }));
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const setSpeed = useCallback((speed: number) => {
    setState(s => ({ ...s, speed }));
    // Restart interval if playing
    if (stateRef.current.isPlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      const advance = async () => {
        const s = stateRef.current;
        const nextIndex = s.currentIndex + 1;
        if (nextIndex >= s.allPeriodos.length) {
          setState(prev => ({ ...prev, isPlaying: false, currentIndex: 0 }));
          if (intervalRef.current) clearInterval(intervalRef.current);
          return;
        }
        const nextPeriodo = s.allPeriodos[nextIndex];
        setState(prev => ({ ...prev, currentIndex: nextIndex, currentPeriodo: nextPeriodo }));
        await loadPeriod(nextPeriodo);
      };
      intervalRef.current = setInterval(advance, 1500 / speed);
    }
  }, [loadPeriod]);

  const seekTo = useCallback(async (index: number) => {
    if (index < 0 || index >= state.allPeriodos.length) return;
    const periodo = state.allPeriodos[index];
    setState(s => ({ ...s, currentIndex: index, currentPeriodo: periodo }));
    await loadPeriod(periodo);
  }, [state.allPeriodos, loadPeriod]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return {
    ...state,
    play,
    pause,
    setSpeed,
    seekTo,
  };
}
