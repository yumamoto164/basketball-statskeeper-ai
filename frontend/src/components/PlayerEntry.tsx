import { useState } from "react";
import type { Player } from "../types";

interface PlayerEntryProps {
  team: "Home" | "Away";
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  teamName: string;
  setTeamName: React.Dispatch<React.SetStateAction<string>>;
}

function PlayerEntry({
  team,
  players,
  setPlayers,
  teamName,
  setTeamName,
}: PlayerEntryProps) {
  const [name, setName] = useState<string>("");
  const [number, setNumber] = useState<string>("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState<string>("");
  const [editNumber, setEditNumber] = useState<string>("");

  const addPlayer = (): void => {
    if (name && number) {
      setPlayers([
        ...players,
        { name, number, points: 0, assists: 0, rebounds: 0 },
      ]);
      setName("");
      setNumber("");
    }
  };

  const removePlayer = (index: number): void => {
    setPlayers(players.filter((_, i) => i !== index));
  };

  const startEdit = (index: number): void => {
    setEditingIndex(index);
    setEditName(players[index].name);
    setEditNumber(players[index].number);
  };

  const saveEdit = (): void => {
    if (editName && editNumber && editingIndex !== null) {
      setPlayers(
        players.map((p, i) =>
          i === editingIndex
            ? { ...p, name: editName, number: editNumber }
            : p
        )
      );
      setEditingIndex(null);
      setEditName("");
      setEditNumber("");
    }
  };

  const cancelEdit = (): void => {
    setEditingIndex(null);
    setEditName("");
    setEditNumber("");
  };

  const isHome = team === "Home";
  const pillClass = isHome ? "team-pill home-pill" : "team-pill away-pill";

  return (
    <div className="team-panel">
      <div className="team-header">
        <span className={pillClass}>{isHome ? "HOME" : "AWAY"}</span>
        <span className="team-name-label">{teamName || `${team} Team`}</span>
      </div>

      <input
        className="team-name-input"
        placeholder={`${team} Team`}
        value={teamName}
        onChange={(e) => setTeamName(e.target.value)}
      />

      <div className="add-player-section">
        <label className="section-label">Add Player</label>
        <div className="add-player-inputs">
          <input
            className="jersey-input"
            placeholder="#"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            type="number"
          />
          <input
            className="player-name-input"
            placeholder="Player Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <button className="add-button" onClick={addPlayer}>
          Add
        </button>
      </div>

      <div className="roster-section">
        <label className="section-label">
          Roster ({players.length} {players.length === 1 ? "player" : "players"})
        </label>
        <div className="roster-list">
          {players.map((p, i) => (
            <div key={i} className="player-card">
              {editingIndex === i ? (
                <div className="edit-player-form">
                  <input
                    className="jersey-input-small"
                    placeholder="#"
                    value={editNumber}
                    onChange={(e) => setEditNumber(e.target.value)}
                    type="number"
                  />
                  <input
                    className="player-name-input-small"
                    placeholder="Player Name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                  <button className="save-button" onClick={saveEdit}>
                    Save
                  </button>
                  <button className="cancel-button" onClick={cancelEdit}>
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <div className="player-info">
                    <div className="player-icon">{p.number}</div>
                    <div className="player-details">
                      <div className="player-name">{p.name}</div>
                      <div className="player-jersey">#{p.number}</div>
                    </div>
                  </div>
                  <div className="player-actions">
                    <button
                      className="edit-button"
                      onClick={() => startEdit(i)}
                    >
                      Edit
                    </button>
                    <button
                      className="remove-button"
                      onClick={() => removePlayer(i)}
                    >
                      Remove
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PlayerEntry;

