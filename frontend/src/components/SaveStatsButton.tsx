import saveAs from "file-saver";
import { generateCSV } from "../utils/csvUtils";
import { StatsContext } from "../App";
import { useContext } from "react";

function SaveStatsAsCSVButton({
  homeTeamName,
  awayTeamName,
}: {
  homeTeamName: string;
  awayTeamName: string;
}) {
  const { homePlayers, awayPlayers } = useContext(StatsContext);

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
