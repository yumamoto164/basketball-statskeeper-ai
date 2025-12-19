import { useState } from "react";
import "./App.css";
import PlayerEntry from "./components/PlayerEntry";
import StatKeeper from "./components/StatKeeper";
import type { Player } from "./types";
import { createContext } from "react";
import { Toaster } from "react-hot-toast";

export const StatsContext = createContext<{
  homePlayers: Player[];
  awayPlayers: Player[];
  setHomePlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  setAwayPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
}>(
  {} as {
    homePlayers: Player[];
    awayPlayers: Player[];
    setHomePlayers: React.Dispatch<React.SetStateAction<Player[]>>;
    setAwayPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  }
);

function App() {
  const [homePlayers, setHomePlayers] = useState<Player[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<Player[]>([]);
  const [homeTeamName, setHomeTeamName] = useState<string>("");
  const [awayTeamName, setAwayTeamName] = useState<string>("");
  const [started, setStarted] = useState<boolean>(false);

  return (
    <StatsContext.Provider
      value={{ homePlayers, setHomePlayers, awayPlayers, setAwayPlayers }}
    >
      <Toaster />
      <div className="App">
        <div className="header-section">
          <h1 className="main-title">Basketball Stats Keeper</h1>
          <p className="subtitle">Set up both team rosters to get started.</p>
        </div>

        {!started ? (
          <>
            <div className="teams-container">
              <PlayerEntry
                team="Home"
                teamName={homeTeamName}
                setTeamName={setHomeTeamName}
              />
              <PlayerEntry
                team="Away"
                teamName={awayTeamName}
                setTeamName={setAwayTeamName}
              />
            </div>
            <button
              className="start-game-button"
              disabled={homePlayers.length === 0 || awayPlayers.length === 0}
              onClick={() => setStarted(true)}
            >
              Start Game
            </button>
          </>
        ) : (
          <StatKeeper
            homeTeamName={homeTeamName}
            awayTeamName={awayTeamName}
            onEndGame={() => setStarted(false)}
          />
        )}
      </div>
    </StatsContext.Provider>
  );
}

export default App;
