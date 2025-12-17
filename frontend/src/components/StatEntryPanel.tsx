import type { Player } from "../types";

interface StatEntryPanelProps {
  player: Player | null;
  team: "home" | "away";
  playerIndex: number | null;
  onUpdateStat: (
    team: "home" | "away",
    playerIndex: number,
    stat: string,
    value: number
  ) => void;
  onUpdateShot: (
    team: "home" | "away",
    playerIndex: number,
    shotType: "freeThrow" | "twoPointer" | "threePointer",
    shotStats: { made: number; attempted: number },
    pointsDiff: number
  ) => void;
}

function StatEntryPanel({
  player,
  team,
  playerIndex,
  onUpdateStat,
  onUpdateShot,
}: StatEntryPanelProps) {
  if (!player) {
    return (
      <div className="stat-entry-panel">
        <div className="no-player-selected">Select a player to track stats</div>
      </div>
    );
  }

  const isHome = team === "home";

  const updateStat = (stat: string, delta: number) => {
    if (playerIndex !== null) {
      onUpdateStat(team, playerIndex, stat, delta);
    }
  };

  const handleShot = (
    type: "freeThrow" | "twoPointer" | "threePointer",
    made: boolean
  ) => {
    if (playerIndex === null) return;

    const currentShot = player[type];
    const newShot = {
      made: made ? currentShot.made + 1 : currentShot.made,
      attempted: currentShot.attempted + 1,
    };

    const points = type === "freeThrow" ? 1 : type === "twoPointer" ? 2 : 3;
    const pointsDiff = made ? points : 0;

    onUpdateShot(team, playerIndex, type, newShot, pointsDiff);

    // if (made) {
    //   const points = type === "freeThrow" ? 1 : type === "twoPointer" ? 2 : 3;
    //   updateStat("points", points);
    // }
  };

  const handleUndo = (type: "freeThrow" | "twoPointer" | "threePointer") => {
    if (playerIndex === null) return;

    const currentShot = player[type];
    if (currentShot.attempted === 0) return;

    const wasMade = currentShot.made > 0;
    const newShot = {
      made: Math.max(0, currentShot.made - (wasMade ? 1 : 0)),
      attempted: currentShot.attempted - 1,
    };
    const points = type === "freeThrow" ? 1 : type === "twoPointer" ? 2 : 3;
    const pointsDiff = wasMade ? -points : 0;

    onUpdateShot(team, playerIndex, type, newShot, pointsDiff);
  };

  return (
    <div className="stat-entry-panel">
      <div className="selected-player-header">
        <div className="selected-player-icon">{player.number}</div>
        <div className="selected-player-info">
          <div className="selected-player-name">
            {player.name}
            <span
              className={`team-label ${isHome ? "home-label" : "away-label"}`}
            >
              {isHome ? "HOME" : "AWAY"}
            </span>
          </div>
          <div className="selected-player-points">{player.points} points</div>
        </div>
      </div>

      <div className="scoring-stats">
        <div className="scoring-stat-card">
          <div className="scoring-stat-header">
            Free Throws {player.freeThrow.made}/{player.freeThrow.attempted}
          </div>
          <div className="scoring-stat-buttons">
            <button
              className="stat-button made-button"
              onClick={() => handleShot("freeThrow", true)}
            >
              Made
            </button>
            <button
              className="stat-button missed-button"
              onClick={() => handleShot("freeThrow", false)}
            >
              Missed
            </button>
            <button
              className="stat-button undo-button"
              onClick={() => handleUndo("freeThrow")}
            >
              Undo
            </button>
          </div>
        </div>

        <div className="scoring-stat-card">
          <div className="scoring-stat-header">
            2-Pointers {player.twoPointer.made}/{player.twoPointer.attempted}
          </div>
          <div className="scoring-stat-buttons">
            <button
              className="stat-button made-button"
              onClick={() => handleShot("twoPointer", true)}
            >
              Made
            </button>
            <button
              className="stat-button missed-button"
              onClick={() => handleShot("twoPointer", false)}
            >
              Missed
            </button>
            <button
              className="stat-button undo-button"
              onClick={() => handleUndo("twoPointer")}
            >
              Undo
            </button>
          </div>
        </div>

        <div className="scoring-stat-card">
          <div className="scoring-stat-header">
            3-Pointers {player.threePointer.made}/
            {player.threePointer.attempted}
          </div>
          <div className="scoring-stat-buttons">
            <button
              className="stat-button made-button"
              onClick={() => handleShot("threePointer", true)}
            >
              Made
            </button>
            <button
              className="stat-button missed-button"
              onClick={() => handleShot("threePointer", false)}
            >
              Missed
            </button>
            <button
              className="stat-button undo-button"
              onClick={() => handleUndo("threePointer")}
            >
              Undo
            </button>
          </div>
        </div>
      </div>

      <div className="other-stats-grid">
        <StatCard
          label="Assists"
          value={player.assists}
          onIncrement={() => updateStat("assists", 1)}
          onDecrement={() => updateStat("assists", -1)}
        />
        <StatCard
          label="Off. Rebounds"
          value={player.offensiveRebounds}
          onIncrement={() => updateStat("offensiveRebounds", 1)}
          onDecrement={() => updateStat("offensiveRebounds", -1)}
        />
        <StatCard
          label="Def. Rebounds"
          value={player.defensiveRebounds}
          onIncrement={() => updateStat("defensiveRebounds", 1)}
          onDecrement={() => updateStat("defensiveRebounds", -1)}
        />
        <StatCard
          label="Steals"
          value={player.steals}
          onIncrement={() => updateStat("steals", 1)}
          onDecrement={() => updateStat("steals", -1)}
        />
        <StatCard
          label="Blocks"
          value={player.blocks}
          onIncrement={() => updateStat("blocks", 1)}
          onDecrement={() => updateStat("blocks", -1)}
        />
        <StatCard
          label="Turnovers"
          value={player.turnovers}
          onIncrement={() => updateStat("turnovers", 1)}
          onDecrement={() => updateStat("turnovers", -1)}
        />
        <StatCard
          label="Fouls"
          value={player.fouls}
          onIncrement={() => updateStat("fouls", 1)}
          onDecrement={() => updateStat("fouls", -1)}
        />
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
}

function StatCard({ label, value, onIncrement, onDecrement }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-controls">
        <button className="stat-increment" onClick={onIncrement}>
          +
        </button>
        <button className="stat-decrement" onClick={onDecrement}>
          -
        </button>
      </div>
    </div>
  );
}

export default StatEntryPanel;
