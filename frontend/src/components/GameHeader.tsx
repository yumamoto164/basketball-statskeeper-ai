import { useContext } from "react";
import { StatsContext } from "../App";

interface GameHeaderProps {
  homeTeamName: string;
  awayTeamName: string;
  onEndGame: () => void;
}

function GameHeader({
  homeTeamName,
  awayTeamName,
  onEndGame,
}: GameHeaderProps) {
  const { homePlayers, awayPlayers } = useContext(StatsContext);
  const homeScore = homePlayers.reduce((sum, p) => sum + p.points, 0);
  const awayScore = awayPlayers.reduce((sum, p) => sum + p.points, 0);

  return (
    <div className="game-header">
      <span className="game-title">Basketball Stats</span>
      <div className="scoreboard">
        <span className="scoreboard-team-name">{homeTeamName || "Home"}</span>
        <span className="scoreboard-score home-score">{homeScore}</span>
        <span className="scoreboard-separator">–</span>
        <span className="scoreboard-score away-score">{awayScore}</span>
        <span className="scoreboard-team-name">{awayTeamName || "Away"}</span>
      </div>
      <button className="end-game-button" onClick={onEndGame}>
        Back to Player Entry
      </button>
    </div>
  );
}

export default GameHeader;
