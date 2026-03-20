import type { Player } from "../types";
import { getPlayerStack } from "../utils/playerStackUtils";
import { ShotUpdateStack } from "./StatKeeper";
import TeamStatsTable from "./TeamStatsTable";
import PlayerStatEntry from "./PlayerStatEntry";

interface StatEntryPanelProps {
  player: Player | null;
  team: "home" | "away";
  teamName: string;
  playerIndex: number | null;
  players: Player[];
  onSelectPlayer: (index: number) => void;
  onUpdateStat: (
    team: "home" | "away",
    playerIndex: number,
    stat: string,
    value: number,
  ) => void;
  onUpdateShot: (
    team: "home" | "away",
    playerIndex: number,
    shotType: "freeThrow" | "twoPointer" | "threePointer",
    shotStats: { made: number; attempted: number },
    pointsDiff: number,
  ) => void;
  shotUpdateStacks: React.RefObject<ShotUpdateStack>;
}

function StatEntryPanel({
  player,
  team,
  teamName,
  playerIndex,
  players,
  onSelectPlayer,
  onUpdateStat,
  onUpdateShot,
  shotUpdateStacks,
}: StatEntryPanelProps) {
  const updateStat = (stat: string, delta: number) => {
    if (playerIndex !== null) {
      onUpdateStat(team, playerIndex, stat, delta);
    }
  };

  const handleShot = (
    type: "freeThrow" | "twoPointer" | "threePointer",
    made: boolean,
  ) => {
    if (playerIndex === null || !player) return;

    const playerStack = getPlayerStack(shotUpdateStacks, team, playerIndex);
    const currentShot = player[type];
    const newShot = {
      made: made ? currentShot.made + 1 : currentShot.made,
      attempted: currentShot.attempted + 1,
    };

    const points = type === "freeThrow" ? 1 : type === "twoPointer" ? 2 : 3;
    onUpdateShot(team, playerIndex, type, newShot, made ? points : 0);
    playerStack[type].push(made);
  };

  const handleUndo = (type: "freeThrow" | "twoPointer" | "threePointer") => {
    if (playerIndex === null || !player) return;

    const playerStack = getPlayerStack(shotUpdateStacks, team, playerIndex);
    const currentShot = player[type];
    if (currentShot.attempted === 0 || playerStack[type].length === 0) return;

    const lastShotMade = playerStack[type].pop();
    if (lastShotMade === undefined) return;

    const newShot = {
      made: Math.max(0, currentShot.made - (lastShotMade ? 1 : 0)),
      attempted: currentShot.attempted - 1,
    };

    const points = type === "freeThrow" ? 1 : type === "twoPointer" ? 2 : 3;
    onUpdateShot(team, playerIndex, type, newShot, lastShotMade ? -points : 0);
  };

  const totalRebounds = player
    ? player.offensiveRebounds + player.defensiveRebounds
    : 0;

  const handleReboundIncrement = () => updateStat("offensiveRebounds", 1);
  const handleReboundDecrement = () => {
    if (!player) return;
    if (player.defensiveRebounds > 0) updateStat("defensiveRebounds", -1);
    else updateStat("offensiveRebounds", -1);
  };

  return (
    <div className="stat-keeper-panel">
      {/* Left: stat entry */}
      <div className="stat-keeper-left">
        <PlayerStatEntry
          player={player}
          playerIndex={playerIndex}
          players={players}
          totalRebounds={totalRebounds}
          onSelectPlayer={onSelectPlayer}
          onShot={handleShot}
          onUndo={handleUndo}
          onUpdateStat={updateStat}
          onReboundIncrement={handleReboundIncrement}
          onReboundDecrement={handleReboundDecrement}
        />
      </div>
      {/* Right: box score */}
      <div className="stat-keeper-right">
        <TeamStatsTable team={team} />
      </div>
    </div>
  );
}

export default StatEntryPanel;
