import { useContext, useState } from "react";
import type { Player } from "../types";
import GameHeader from "./GameHeader";
import PlayerRoster from "./PlayerRoster";
import StatEntryPanel from "./StatEntryPanel";
import TeamStatsTable from "./TeamStatsTable";
import SaveStatsAsCSVButton from "./SaveStatsButton";
import AudioRecorder from "./AudioRecorder";
import { StatsContext } from "../App";

interface StatKeeperProps {
  homeTeamName: string;
  awayTeamName: string;
  onEndGame: () => void;
}

function StatKeeper({
  homeTeamName,
  awayTeamName,
  onEndGame,
}: StatKeeperProps) {
  const [selectedTeam, setSelectedTeam] = useState<"home" | "away">("home");
  const [selectedPlayerIndex, setSelectedPlayerIndex] = useState<number | null>(
    null
  );
  const { homePlayers, setHomePlayers, awayPlayers, setAwayPlayers } =
    useContext(StatsContext);

  const updateStat = (
    team: "home" | "away",
    playerIndex: number,
    stat: string,
    delta: number
  ): void => {
    const setter = team === "home" ? setHomePlayers : setAwayPlayers;
    const players = team === "home" ? homePlayers : awayPlayers;

    setter(
      players.map((p, i) => {
        if (i === playerIndex) {
          const newValue = Math.max(
            0,
            (p[stat as keyof Player] as number) + delta
          );
          return { ...p, [stat]: newValue };
        }
        return p;
      })
    );
  };

  const updateShot = (
    team: "home" | "away",
    playerIndex: number,
    shotType: "freeThrow" | "twoPointer" | "threePointer",
    shotStats: { made: number; attempted: number },
    pointsDiff: number
  ): void => {
    const setter = team === "home" ? setHomePlayers : setAwayPlayers;
    const players = team === "home" ? homePlayers : awayPlayers;

    setter(
      players.map((p, i) => {
        if (i === playerIndex) {
          return {
            ...p,
            [shotType]: shotStats,
            points: p.points + pointsDiff,
          };
        }
        return p;
      })
    );
  };

  const handlePlayerSelect = (team: "home" | "away", index: number) => {
    setSelectedTeam(team);
    setSelectedPlayerIndex(index);
  };

  const selectedPlayer =
    selectedPlayerIndex !== null
      ? selectedTeam === "home"
        ? homePlayers[selectedPlayerIndex]
        : awayPlayers[selectedPlayerIndex]
      : null;

  return (
    <div className="stat-keeper-container">
      <GameHeader
        homeTeamName={homeTeamName}
        awayTeamName={awayTeamName}
        onEndGame={onEndGame}
      />

      <div className="stat-keeper-main">
        <div className="stat-keeper-top">
          <PlayerRoster
            team="home"
            teamName={homeTeamName}
            selectedPlayerIndex={
              selectedTeam === "home" ? selectedPlayerIndex : null
            }
            onPlayerSelect={(index) => handlePlayerSelect("home", index)}
          />

          <StatEntryPanel
            player={selectedPlayer}
            team={selectedTeam}
            playerIndex={selectedPlayerIndex}
            onUpdateStat={updateStat}
            onUpdateShot={updateShot}
          />

          <PlayerRoster
            team="away"
            teamName={awayTeamName}
            selectedPlayerIndex={
              selectedTeam === "away" ? selectedPlayerIndex : null
            }
            onPlayerSelect={(index) => handlePlayerSelect("away", index)}
          />
        </div>

        <div className="audio-recorder-container">
          <AudioRecorder
            awayTeamName={awayTeamName}
            homeTeamName={homeTeamName}
            updateShot={updateShot}
            updateStat={updateStat}
          />
        </div>

        <div className="stat-keeper-bottom">
          <TeamStatsTable team="home" teamName={homeTeamName} />
          <TeamStatsTable team="away" teamName={awayTeamName} />
        </div>
        <div style={{ textAlign: "center", width: "100%" }}>
          <SaveStatsAsCSVButton
            homeTeamName={homeTeamName}
            awayTeamName={awayTeamName}
          />
        </div>
      </div>
    </div>
  );
}

export default StatKeeper;
