import { useContext, useRef, useState } from "react";
import { FaMicrophone } from "react-icons/fa";
import { statsFromAudioService } from "../utils/statsFromAudioService";
import { StatsContext } from "../App";
import { ShotUpdateStack } from "./StatKeeper";
import { getPlayerStack } from "../utils/playerStackUtils";

type AudioRecorderProps = {
  awayTeamName: string;
  homeTeamName: string;
  updateShot: (
    team: "home" | "away",
    playerIndex: number,
    shotType: "freeThrow" | "twoPointer" | "threePointer",
    shotStats: { made: number; attempted: number },
    pointsDiff: number
  ) => void;
  updateStat: (
    team: "home" | "away",
    playerIndex: number,
    stat: string,
    delta: number
  ) => void;
  shotUpdateStacks: React.RefObject<ShotUpdateStack>;
};

const AudioRecorder = ({
  awayTeamName,
  homeTeamName,
  updateShot,
  updateStat,
  shotUpdateStacks,
}: AudioRecorderProps) => {
  const { homePlayers, awayPlayers } = useContext(StatsContext);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new window.MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    audioChunks.current = [];
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.current.push(event.data);
      }
    };
    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });

      // Send audio to backend API for processing
      setProcessing(true);
      try {
        const homeTeamData = {
          name: homeTeamName,
          players: homePlayers.map((p) => ({ name: p.name, number: p.number })),
        };
        const awayTeamData = {
          name: awayTeamName,
          players: awayPlayers.map((p) => ({ name: p.name, number: p.number })),
        };

        const result = await statsFromAudioService(
          audioBlob,
          homeTeamData,
          awayTeamData
        );

        if (result) {
          if (result.category === "shot") {
            // Get the current player to access their current stats
            const players = result.team === "home" ? homePlayers : awayPlayers;
            const player = players[result.playerIndex];

            // Map backend shot type to frontend shot type
            const shotType = result.shotType as
              | "freeThrow"
              | "twoPointer"
              | "threePointer";

            // Calculate new shot stats
            const currentShot = player[shotType];
            const newShot = {
              made: result.made ? currentShot.made + 1 : currentShot.made,
              attempted: currentShot.attempted + 1,
            };

            // Calculate points
            const points =
              shotType === "freeThrow" ? 1 : shotType === "twoPointer" ? 2 : 3;
            const pointsDiff = result.made ? points : 0;

            // Update the shot
            updateShot(
              result.team,
              result.playerIndex,
              shotType,
              newShot,
              pointsDiff
            );
            const playerStack = getPlayerStack(
              shotUpdateStacks,
              result.team,
              result.playerIndex
            );
            playerStack[
              shotType as "freeThrow" | "twoPointer" | "threePointer"
            ].push(result.made);
          } else if (result.category === "non-shot") {
            updateStat(
              result.team,
              result.playerIndex,
              result.stat,
              result.delta
            );
          }
        }
      } catch (error) {
        console.error("Error processing audio:", error);
      } finally {
        setProcessing(false);
      }
    };
    mediaRecorder.start();
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  return (
    <div>
      <button
        onClick={recording ? stopRecording : startRecording}
        disabled={processing}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {processing
            ? "Processing..."
            : recording
            ? "Stop Recording"
            : "Record By Voice"}
          <FaMicrophone />
        </div>
      </button>
      {processing && (
        <p style={{ fontSize: "12px", color: "#666" }}>
          Sending audio to AI for analysis...
        </p>
      )}
    </div>
  );
};

export default AudioRecorder;
