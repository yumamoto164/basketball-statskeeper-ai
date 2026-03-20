import { useContext } from "react";
import { StatsContext } from "../App";
import type { Player } from "../types";

interface TeamStatsTableProps {
  team: "home" | "away";
}

function TeamStatsTable({ team }: TeamStatsTableProps) {
  const isHome = team === "home";
  const { homePlayers, awayPlayers } = useContext(StatsContext);
  const players = isHome ? homePlayers : awayPlayers;

  const calculateFieldGoals = (player: Player): string => {
    const made = player.twoPointer.made + player.threePointer.made;
    const attempted =
      player.twoPointer.attempted + player.threePointer.attempted;
    return attempted > 0 ? `${made}/${attempted}` : "0/0";
  };

  const calculateFreeThrows = (player: Player): string => {
    return player.freeThrow.attempted > 0
      ? `${player.freeThrow.made}/${player.freeThrow.attempted}`
      : "0/0";
  };

  const calculateThreePointers = (player: Player): string => {
    return player.threePointer.attempted > 0
      ? `${player.threePointer.made}/${player.threePointer.attempted}`
      : "0/0";
  };

  const totalRebounds = (player: Player): number => {
    return player.offensiveRebounds + player.defensiveRebounds;
  };

  const theadClass = isHome ? "stats-thead-home" : "stats-thead-away";

  return (
    <div className="team-stats-table">
      <div className="stats-table-container">
        <table className="stats-table">
          <thead className={theadClass}>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>PTS</th>
              <th>FG</th>
              <th>3PT</th>
              <th>FT</th>
              <th>AST</th>
              <th>REB</th>
              <th>STL</th>
              <th>BLK</th>
              <th>TO</th>
              <th>PF</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player, index) => (
              <tr key={index}>
                <td>{player.number}</td>
                <td>{player.name}</td>
                <td>{player.points}</td>
                <td>{calculateFieldGoals(player)}</td>
                <td>{calculateThreePointers(player)}</td>
                <td>{calculateFreeThrows(player)}</td>
                <td>{player.assists}</td>
                <td>{totalRebounds(player)}</td>
                <td>{player.steals}</td>
                <td>{player.blocks}</td>
                <td>{player.turnovers}</td>
                <td>{player.fouls}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TeamStatsTable;
