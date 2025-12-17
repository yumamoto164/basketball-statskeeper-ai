import { Player } from "../types";

// Button to save stats as CSV
function playerToCSVRow(player: Player): string {
  return [
    player.number,
    player.name,
    player.points,
    player.freeThrow.made,
    player.freeThrow.attempted,
    player.twoPointer.made,
    player.twoPointer.attempted,
    player.threePointer.made,
    player.threePointer.attempted,
    player.assists,
    player.offensiveRebounds,
    player.defensiveRebounds,
    player.steals,
    player.blocks,
    player.turnovers,
    player.fouls,
  ].join(",");
}

function generateCSV(teamName: string, players: Player[]): string {
  const header = `Team,Number,Name,Points,FT Made,FT Att,2P Made,2P Att,3P Made,3P Att,Assists,Off Reb,Def Reb,Steals,Blocks,Turnovers,Fouls`;
  const rows = players.map((p) =>
    [teamName, ...playerToCSVRow(p).split(",")].join(",")
  );
  return [header, ...rows].join("\n");
}
export { generateCSV };
