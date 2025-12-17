import saveAs from "file-saver";
import { Player } from "../types";
import { generateCSV } from "../utils/csvUtils";

function SaveStatsAsCSVButton({
  homeTeamName,
  awayTeamName,
  homePlayers,
  awayPlayers,
}: {
  homeTeamName: string;
  awayTeamName: string;
  homePlayers: Player[];
  awayPlayers: Player[];
}) {
  const handleSave = () => {
    const homeCSV = generateCSV(homeTeamName, homePlayers);
    const awayCSV = generateCSV(awayTeamName, awayPlayers);
    const csv = homeCSV + "\n" + awayCSV;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "basketball_stats.csv");
  };
  return (
    <button style={{ marginTop: 24 }} onClick={handleSave}>
      Save Stats as CSV
    </button>
  );
}
export default SaveStatsAsCSVButton;
