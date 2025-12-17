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
}

function StatEntryPanel({
  player,
  team,
  playerIndex,
  onUpdateStat,
}: StatEntryPanelProps) {
  if (!player) {
    return (
      <div className="stat-entry-panel">
        <div className="no-player-selected">
          Select a player to track stats
        </div>
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
    const statMap = {
      freeThrow: { made: "freeThrowsMade", attempted: "freeThrowsAttempted" },
      twoPointer: { made: "twoPointersMade", attempted: "twoPointersAttempted" },
      threePointer: {
        made: "threePointersMade",
        attempted: "threePointersAttempted",
      },
    };

    const stats = statMap[type];
    updateStat(stats.attempted, 1);
    if (made) {
      updateStat(stats.made, 1);
      const points = type === "freeThrow" ? 1 : type === "twoPointer" ? 2 : 3;
      updateStat("points", points);
    }
  };

  return (
    <div className="stat-entry-panel">
      <div className="selected-player-header">
        <div className="selected-player-icon">{player.number}</div>
        <div className="selected-player-info">
          <div className="selected-player-name">
            {player.name}
            <span className={`team-label ${isHome ? "home-label" : "away-label"}`}>
              {isHome ? "HOME" : "AWAY"}
            </span>
          </div>
          <div className="selected-player-points">{player.points} points</div>
        </div>
      </div>

      <div className="scoring-stats">
        <div className="scoring-stat-card">
          <div className="scoring-stat-header">
            Free Throws {player.freeThrowsMade}/{player.freeThrowsAttempted}
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
              onClick={() => {
                if (player.freeThrowsAttempted > 0) {
                  updateStat("freeThrowsAttempted", -1);
                  if (player.freeThrowsMade > 0) {
                    updateStat("freeThrowsMade", -1);
                    updateStat("points", -1);
                  }
                }
              }}
            >
              Undo
            </button>
          </div>
        </div>

        <div className="scoring-stat-card">
          <div className="scoring-stat-header">
            2-Pointers {player.twoPointersMade}/{player.twoPointersAttempted}
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
              onClick={() => {
                if (player.twoPointersAttempted > 0) {
                  updateStat("twoPointersAttempted", -1);
                  if (player.twoPointersMade > 0) {
                    updateStat("twoPointersMade", -1);
                    updateStat("points", -2);
                  }
                }
              }}
            >
              Undo
            </button>
          </div>
        </div>

        <div className="scoring-stat-card">
          <div className="scoring-stat-header">
            3-Pointers {player.threePointersMade}/{player.threePointersAttempted}
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
              onClick={() => {
                if (player.threePointersAttempted > 0) {
                  updateStat("threePointersAttempted", -1);
                  if (player.threePointersMade > 0) {
                    updateStat("threePointersMade", -1);
                    updateStat("points", -3);
                  }
                }
              }}
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

