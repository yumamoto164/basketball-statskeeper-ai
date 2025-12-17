import type { Player } from "../types";

interface PlayerRosterProps {
  team: "home" | "away";
  teamName: string;
  players: Player[];
  selectedPlayerIndex: number | null;
  onPlayerSelect: (index: number) => void;
}

function PlayerRoster({
  team,
  teamName,
  players,
  selectedPlayerIndex,
  onPlayerSelect,
}: PlayerRosterProps) {
  const isHome = team === "home";
  const headerClass = isHome ? "roster-header home-header" : "roster-header away-header";

  return (
    <div className="player-roster">
      <div className={headerClass}>
        <div className="roster-dot"></div>
        <span>{teamName || (isHome ? "Team A" : "Team B")}</span>
      </div>
      <div className="roster-list">
        {players.map((player, index) => (
          <div
            key={index}
            className={`roster-item ${
              selectedPlayerIndex === index ? "selected" : ""
            }`}
            onClick={() => onPlayerSelect(index)}
          >
            <div className="player-icon-small">{player.number}</div>
            <div className="player-info-small">
              <div className="player-name-small">{player.name}</div>
              <div className="player-points-small">{player.points} pts</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PlayerRoster;

