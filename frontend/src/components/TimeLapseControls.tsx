import { Play, Pause, SkipForward, SkipBack } from 'lucide-react';

interface Props {
  isPlaying: boolean;
  currentPeriodo: string;
  currentIndex: number;
  totalPeriodos: number;
  speed: number;
  transactionCount: number;
  onPlay: () => void;
  onPause: () => void;
  onSetSpeed: (speed: number) => void;
  onSeek: (index: number) => void;
}

function formatPeriodo(periodo: string): string {
  const [year, month] = periodo.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[parseInt(month) - 1]} ${year}`;
}

export function TimeLapseControls({
  isPlaying, currentPeriodo, currentIndex, totalPeriodos,
  speed, transactionCount,
  onPlay, onPause, onSetSpeed, onSeek,
}: Props) {
  return (
    <div className="timelapse-controls">
      <div className="tl-transport">
        <button
          className="tl-btn"
          onClick={() => onSeek(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
        >
          <SkipBack size={16} />
        </button>

        <button
          className="tl-btn tl-btn-play"
          onClick={isPlaying ? onPause : onPlay}
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} />}
        </button>

        <button
          className="tl-btn"
          onClick={() => onSeek(Math.min(totalPeriodos - 1, currentIndex + 1))}
          disabled={currentIndex >= totalPeriodos - 1}
        >
          <SkipForward size={16} />
        </button>

        {/* Speed control */}
        <div className="tl-speed">
          {[1, 2, 4].map(s => (
            <button
              key={s}
              className={`tl-speed-btn ${speed === s ? 'active' : ''}`}
              onClick={() => onSetSpeed(s)}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Period display */}
      <div className="tl-period">
        <span className="tl-period-label">{formatPeriodo(currentPeriodo)}</span>
        <span className="tl-period-count">{transactionCount} transações</span>
      </div>

      {/* Timeline slider */}
      <div className="tl-slider-container">
        <input
          type="range"
          min={0}
          max={totalPeriodos - 1}
          value={currentIndex}
          onChange={e => onSeek(parseInt(e.target.value))}
          className="tl-slider"
        />
        <div className="tl-slider-labels">
          <span>{totalPeriodos > 0 ? formatPeriodo(currentPeriodo.replace(/-\d+$/, '-01')) : ''}</span>
          <span>{currentIndex + 1} / {totalPeriodos}</span>
        </div>
      </div>
    </div>
  );
}
