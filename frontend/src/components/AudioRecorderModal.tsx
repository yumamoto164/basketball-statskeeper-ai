import { Modal } from "@mui/material";
import Box from "@mui/material/Box";
import { useContext, useCallback, useRef, useState, useEffect } from "react";
import {
  statsFromAudioService,
  type StatsFromAudioProgressEvent,
} from "../utils/statsFromAudioService";
import { StatsContext } from "../App";
import { getPlayerStack } from "../utils/playerStackUtils";
import { CANVAS_HEIGHT, drawBars } from "../utils/audioVisualizerUtils";
import { AudioRecorderType } from "./AudioRecorder";

type ResultState =
  | { status: "success"; message: string }
  | { status: "error"; message: string }
  | null;

const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "90%",
  maxWidth: 420,
  background: "#fff",
  borderRadius: "16px",
  border: "1px solid #e5e7eb",
  boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
  padding: "2rem",
  color: "#1a1a1a",
  fontFamily: "inherit",
};

const SHOT_TYPE_LABELS: Record<string, string> = {
  freeThrow: "free throw",
  twoPointer: "2-pointer",
  threePointer: "3-pointer",
};

export const AudioRecorderModal = ({
  isOpen,
  handleClose,
  data,
}: {
  isOpen: boolean;
  handleClose: () => void;
  data: AudioRecorderType;
}) => {
  const { homePlayers, awayPlayers } = useContext(StatsContext);
  const {
    homeTeamName,
    awayTeamName,
    updateShot,
    updateStat,
    shotUpdateStacks,
  } = data;
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState(
    "Sending audio to AI for analysis...",
  );
  const [result, setResult] = useState<ResultState>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const startDrawLoop = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const data = new Uint8Array(analyser.frequencyBinCount);
    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(data);
      drawBars(canvas, data, true);
    };
    draw();
  }, []);

  const startRecording = async () => {
    setResult(null);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaStreamRef.current = stream;

    // Set up Web Audio analyser for visualization
    const audioCtx = new AudioContext();
    audioCtxRef.current = audioCtx;
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    audioCtx.createMediaStreamSource(stream).connect(analyser);
    analyserRef.current = analyser;

    // Set up MediaRecorder for capturing audio
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

      setProcessing(true);
      setProcessingMessage("Uploading audio...");
      try {
        const homeTeamData = {
          name: homeTeamName,
          players: homePlayers.map((p) => ({ name: p.name, number: p.number })),
        };
        const awayTeamData = {
          name: awayTeamName,
          players: awayPlayers.map((p) => ({ name: p.name, number: p.number })),
        };

        const apiResult = await statsFromAudioService(
          audioBlob,
          homeTeamData,
          awayTeamData,
          (event: StatsFromAudioProgressEvent) => {
            if (event.stage === "transcribed" && event.transcript) {
              setProcessingMessage(`Transcribed: "${event.transcript}"`);
              return;
            }
            if (event.type === "result") {
              setProcessingMessage("Finished processing audio");
              return;
            }
          },
        );

        if (apiResult) {
          if (apiResult.category === "shot") {
            const players =
              apiResult.team === "home" ? homePlayers : awayPlayers;
            const player = players[apiResult.playerIndex];
            const shotType = apiResult.shotType as
              | "freeThrow"
              | "twoPointer"
              | "threePointer";
            const currentShot = player[shotType];
            const newShot = {
              made: apiResult.made ? currentShot.made + 1 : currentShot.made,
              attempted: currentShot.attempted + 1,
            };
            const points =
              shotType === "freeThrow" ? 1 : shotType === "twoPointer" ? 2 : 3;
            const pointsDiff = apiResult.made ? points : 0;
            updateShot(
              apiResult.team,
              apiResult.playerIndex,
              shotType,
              newShot,
              pointsDiff,
            );
            const playerStack = getPlayerStack(
              shotUpdateStacks,
              apiResult.team,
              apiResult.playerIndex,
            );
            playerStack[shotType].push(apiResult.made);

            const label = SHOT_TYPE_LABELS[shotType] ?? shotType;
            setResult({
              status: "success",
              message: `${apiResult.made ? "Made" : "Missed"} ${label} — ${player.name}`,
            });
          } else if (apiResult.category === "non-shot") {
            updateStat(
              apiResult.team,
              apiResult.playerIndex,
              apiResult.stat,
              apiResult.delta,
            );
            const players =
              apiResult.team === "home" ? homePlayers : awayPlayers;
            const player = players[apiResult.playerIndex];
            setResult({
              status: "success",
              message: `${apiResult.stat.charAt(0).toUpperCase() + apiResult.stat.slice(1)} — ${player.name}`,
            });
          }
        } else {
          setResult({
            status: "error",
            message: "Couldn't recognize a player or stat — try again",
          });
        }
      } catch {
        setResult({
          status: "error",
          message: "Something went wrong — try again",
        });
      } finally {
        setProcessing(false);
        setProcessingMessage("Sending audio to AI for analysis...");
      }
    };

    mediaRecorder.start();
    setRecording(true);
    startDrawLoop();
  };

  // Draw idle bars when not recording
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || recording) return;
    drawBars(canvas, null, false);
  }, [isOpen, recording]);

  // Auto-start recording when modal opens
  useEffect(() => {
    if (isOpen) {
      startRecording(); // eslint-disable-line react-hooks/exhaustive-deps
    }
  }, [isOpen]); // intentionally only fires on open/close transitions

  const stopRecording = () => {
    cancelAnimationFrame(animFrameRef.current);
    analyserRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description"
    >
      <Box sx={modalStyle}>
        <p
          style={{ margin: "0 0 16px", fontSize: "0.875rem", color: "#6b7280" }}
        >
          Example: <em>"LeBron James scores a three"</em>
        </p>
        <canvas
          ref={canvasRef}
          width={356}
          height={CANVAS_HEIGHT}
          style={{
            width: "100%",
            height: CANVAS_HEIGHT,
            borderRadius: 12,
            border: "2px solid #e5e7eb",
            background: "#f5f5f5",
            display: "block",
          }}
        />

        <div style={{ marginTop: 24, textAlign: "center" }}>
          <button
            onClick={recording ? stopRecording : startRecording}
            disabled={processing}
            style={{
              padding: "0.75rem 1.5rem",
              background: processing
                ? "#9ca3af"
                : recording
                  ? "#dc2626"
                  : "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "1rem",
              cursor: processing ? "not-allowed" : "pointer",
              transition: "background 0.2s",
            }}
          >
            {processing
              ? "Processing..."
              : recording
                ? "Stop Recording"
                : "Record Again"}
          </button>
        </div>

        {processing && (
          <div
            style={{
              marginTop: 16,
              textAlign: "center",
              fontSize: "0.875rem",
              color: "#374151",
            }}
          >
            {processingMessage}
          </div>
        )}

        {!processing && result && (
          <div
            style={{
              marginTop: 16,
              padding: "0.75rem 1rem",
              borderRadius: 8,
              borderLeft: `4px solid ${result.status === "success" ? "#16a34a" : "#dc2626"}`,
              background: result.status === "success" ? "#f0fdf4" : "#fef2f2",
              fontSize: "0.875rem",
              color: result.status === "success" ? "#15803d" : "#b91c1c",
            }}
          >
            {result.status === "success" ? "✓ " : "✗ "}
            {result.message}
          </div>
        )}
      </Box>
    </Modal>
  );
};
