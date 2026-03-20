import type { Player } from "../types";

const SHOT_TYPES: Array<{
  key: "freeThrow" | "twoPointer" | "threePointer";
  label: string;
}> = [
  { key: "freeThrow", label: "Free Throws" },
  { key: "twoPointer", label: "2 Pointers" },
  { key: "threePointer", label: "3 Pointers" },
];

interface PlayerStatEntryProps {
  player: Player | null;
  playerIndex: number | null;
  players: Player[];
  totalRebounds: number;
  onSelectPlayer: (index: number) => void;
  onShot: (type: "freeThrow" | "twoPointer" | "threePointer", made: boolean) => void;
  onUndo: (type: "freeThrow" | "twoPointer" | "threePointer") => void;
  onUpdateStat: (stat: string, delta: number) => void;
  onReboundIncrement: () => void;
  onReboundDecrement: () => void;
}

function PlayerStatEntry({
  player,
  playerIndex,
  players,
  totalRebounds,
  onSelectPlayer,
  onShot,
  onUndo,
  onUpdateStat,
  onReboundIncrement,
  onReboundDecrement,
}: PlayerStatEntryProps) {
  return (
    <div className="stat-entry-panel">
      {/* Player Dropdown */}
      <div className="player-dropdown-wrapper">
        <select
          className="player-dropdown"
          value={playerIndex ?? ""}
          onChange={(e) => {
            const val = e.target.value;
            if (val !== "") onSelectPlayer(Number(val));
          }}
        >
          <option value="" disabled>
            Select a player
          </option>
          {players.map((p, i) => (
            <option key={i} value={i}>
              #{p.number} {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Shot Stats */}
      <section className="stats-section">
        <div className="shot-stats-grid">
          {SHOT_TYPES.map(({ key, label }) => {
            const shotData = player ? player[key] : { made: 0, attempted: 0 };
            return (
              <div key={key} className="shot-stat-card">
                <div className="shot-stat-title">{label}</div>
                <div className="shot-stat-score">
                  <span className="shot-made">{shotData.made}</span>
                  <span className="shot-divider"> /{shotData.attempted}</span>
                </div>
                <div className="shot-buttons">
                  <button
                    className="shot-btn shot-btn-made"
                    onClick={() => onShot(key, true)}
                    disabled={!player}
                  >
                    Made
                  </button>
                  <button
                    className="shot-btn shot-btn-miss"
                    onClick={() => onShot(key, false)}
                    disabled={!player}
                  >
                    Miss
                  </button>
                  <button
                    className="shot-btn shot-btn-undo"
                    onClick={() => onUndo(key)}
                    disabled={!player || shotData.attempted === 0}
                  >
                    ↺
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Other Stats */}
      <section className="stats-section">
        <div className="other-stats-grid">
          <StatCard
            label="Assists"
            value={player?.assists ?? 0}
            onIncrement={() => onUpdateStat("assists", 1)}
            onDecrement={() => onUpdateStat("assists", -1)}
            disabled={!player}
          />
          <StatCard
            label="Rebounds"
            value={totalRebounds}
            onIncrement={onReboundIncrement}
            onDecrement={onReboundDecrement}
            disabled={!player}
          />
          <StatCard
            label="Blocks"
            value={player?.blocks ?? 0}
            onIncrement={() => onUpdateStat("blocks", 1)}
            onDecrement={() => onUpdateStat("blocks", -1)}
            disabled={!player}
          />
          <StatCard
            label="Turnovers"
            value={player?.turnovers ?? 0}
            onIncrement={() => onUpdateStat("turnovers", 1)}
            onDecrement={() => onUpdateStat("turnovers", -1)}
            disabled={!player}
          />
          <StatCard
            label="Fouls"
            value={player?.fouls ?? 0}
            onIncrement={() => onUpdateStat("fouls", 1)}
            onDecrement={() => onUpdateStat("fouls", -1)}
            disabled={!player}
          />
          <StatCard
            label="Steals"
            value={player?.steals ?? 0}
            onIncrement={() => onUpdateStat("steals", 1)}
            onDecrement={() => onUpdateStat("steals", -1)}
            disabled={!player}
          />
        </div>
      </section>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  disabled?: boolean;
}

function StatCard({ label, value, onIncrement, onDecrement, disabled }: StatCardProps) {
  return (
    <div className="other-stat-card">
      <span className="other-stat-label">{label}</span>
      <div className="other-stat-controls">
        <button
          className="other-stat-btn other-stat-minus"
          onClick={onDecrement}
          disabled={disabled}
        >
          −
        </button>
        <span className="other-stat-value">{value}</span>
        <button
          className="other-stat-btn other-stat-plus"
          onClick={onIncrement}
          disabled={disabled}
        >
          +
        </button>
      </div>
    </div>
  );
}

export default PlayerStatEntry;
