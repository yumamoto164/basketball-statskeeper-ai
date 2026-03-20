import { useContext } from "react";
import { StatsContext } from "../App";
import type { Player } from "../types";

interface TeamStatsTableProps {
  team: "home" | "away";
}

const COLUMNS = [
  { label: "#", width: "5%" },
  { label: "Player", width: "20%" },
  { label: "PTS", width: "7%" },
  { label: "FG", width: "8%" },
  { label: "3PT", width: "8%" },
  { label: "FT", width: "8%" },
  { label: "AST", width: "7%" },
  { label: "REB", width: "7%" },
  { label: "STL", width: "7%" },
  { label: "BLK", width: "7%" },
  { label: "TO", width: "7%" },
  { label: "PF", width: "7%" },
];

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

  const colgroup = (
    <colgroup>
      {COLUMNS.map((col) => (
        <col key={col.label} style={{ width: col.width }} />
      ))}
    </colgroup>
  );

  return (
    <div className="team-stats-table">
      {/* Fixed header table */}
      <table className="stats-table stats-table-header-only" style={{ tableLayout: "fixed" }}>
        {colgroup}
        <thead className={theadClass}>
          <tr>
            {COLUMNS.map((col) => (
              <th key={col.label}>{col.label}</th>
            ))}
          </tr>
        </thead>
      </table>

      {/* Scrollable body container */}
      <div className="stats-table-body-container">
        <table className="stats-table" style={{ tableLayout: "fixed" }}>
          {colgroup}
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
