import { useContext } from "react";
import {
  mockHomePlayers,
  mockAwayPlayers,
  mockHomeTeamName,
  mockAwayTeamName,
} from "../test/mockData";
import { StatsContext } from "../App";

export const LoadMockDataButton = ({
  setHomeTeamName,
  setAwayTeamName,
}: {
  setHomeTeamName: (teamName: string) => void;
  setAwayTeamName: (teamName: string) => void;
}) => {
  const { setHomePlayers, setAwayPlayers } = useContext(StatsContext);

  const loadMockData = (): void => {
    setHomeTeamName(mockHomeTeamName);
    setAwayTeamName(mockAwayTeamName);

    setHomePlayers(mockHomePlayers);
    setAwayPlayers(mockAwayPlayers);
  };

  return (
    <button className="mock-data-link" onClick={loadMockData}>
      Skip player entry, use mock data
    </button>
  );
};
