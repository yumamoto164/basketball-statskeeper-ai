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
      <h1 className="game-title">Basketball Stats</h1>
      <div className="scoreboard">
        <div className="scoreboard-team">
          <span className="team-pill home-pill">HOME</span>
          <div className="team-name">{homeTeamName || "Team A"}</div>
          <div className="team-score">{homeScore}</div>
        </div>
        <div className="scoreboard-separator">-</div>
        <div className="scoreboard-team">
          <span className="team-pill away-pill">AWAY</span>
          <div className="team-name">{awayTeamName || "Team B"}</div>
          <div className="team-score">{awayScore}</div>
        </div>
      </div>
      <button className="end-game-button" onClick={onEndGame}>
        End Game
      </button>
    </div>
  );
}

export default GameHeader;
