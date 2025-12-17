import { useState } from "react";
import "./App.css";
import PlayerEntry from "./components/PlayerEntry";
import StatKeeper from "./components/StatKeeper";
import type { Player } from "./types";

function App() {
  const [homePlayers, setHomePlayers] = useState<Player[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<Player[]>([]);
  const [homeTeamName, setHomeTeamName] = useState<string>("");
  const [awayTeamName, setAwayTeamName] = useState<string>("");
  const [started, setStarted] = useState<boolean>(false);

  return (
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
              players={homePlayers}
              setPlayers={setHomePlayers}
              teamName={homeTeamName}
              setTeamName={setHomeTeamName}
            />
            <PlayerEntry
              team="Away"
              players={awayPlayers}
              setPlayers={setAwayPlayers}
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
          homePlayers={homePlayers}
          setHomePlayers={setHomePlayers}
          awayPlayers={awayPlayers}
          setAwayPlayers={setAwayPlayers}
        />
      )}
      {!started && (
        <p className="coming-soon">Voice-to-text AI stat entry coming soon!</p>
      )}
    </div>
  );
}

export default App;

