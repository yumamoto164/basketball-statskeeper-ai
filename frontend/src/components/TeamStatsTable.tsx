import type { Player } from "../types";

interface TeamStatsTableProps {
  team: "home" | "away";
  teamName: string;
  players: Player[];
}

function TeamStatsTable({ team, teamName, players }: TeamStatsTableProps) {
  const isHome = team === "home";
  const headerClass = isHome
    ? "stats-table-header home-header"
    : "stats-table-header away-header";

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

  return (
    <div className="team-stats-table">
      <div className={headerClass}>
        <div className="stats-table-dot"></div>
        <span>{teamName || (isHome ? "Team A" : "Team B")} Stats</span>
      </div>
      <div className="stats-table-container">
        <table className="stats-table">
          <thead>
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
