import type { Player } from "../types";

interface StatKeeperProps {
  homePlayers: Player[];
  setHomePlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  awayPlayers: Player[];
  setAwayPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
}

type StatType = "points" | "assists" | "rebounds";
type TeamType = "home" | "away";

function StatKeeper({
  homePlayers,
  setHomePlayers,
  awayPlayers,
  setAwayPlayers,
}: StatKeeperProps) {
  const updateStat = (team: TeamType, idx: number, stat: StatType): void => {
    const setter = team === "home" ? setHomePlayers : setAwayPlayers;
    const players = team === "home" ? homePlayers : awayPlayers;
    setter(
      players.map((p, i) => (i === idx ? { ...p, [stat]: p[stat] + 1 } : p))
    );
  };

  const teamData: Array<{
    label: string;
    players: Player[];
    setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
    teamType: TeamType;
  }> = [
    {
      label: "Home",
      players: homePlayers,
      setPlayers: setHomePlayers,
      teamType: "home",
    },
    {
      label: "Away",
      players: awayPlayers,
      setPlayers: setAwayPlayers,
      teamType: "away",
    },
  ];

  return (
    <div style={{ display: "flex", gap: 40 }}>
      {teamData.map(({ label, players, teamType }, tIdx) => (
        <div key={label}>
          <h3>{label} Team Stats</h3>
          <table border={1}>
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Points</th>
                <th>Assists</th>
                <th>Rebounds</th>
                <th>+Stat</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p, i) => (
                <tr key={i}>
                  <td>{p.number}</td>
                  <td>{p.name}</td>
                  <td>{p.points}</td>
                  <td>{p.assists}</td>
                  <td>{p.rebounds}</td>
                  <td>
                    <button
                      onClick={() => updateStat(teamType, i, "points")}
                    >
                      +P
                    </button>
                    <button
                      onClick={() => updateStat(teamType, i, "assists")}
                    >
                      +A
                    </button>
                    <button
                      onClick={() => updateStat(teamType, i, "rebounds")}
                    >
                      +R
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

export default StatKeeper;

