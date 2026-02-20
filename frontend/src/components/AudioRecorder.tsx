import { useState } from "react";
import { FaMicrophone } from "react-icons/fa";
import { ShotUpdateStack } from "./StatKeeper";
import { LuSparkles } from "react-icons/lu";
import { Tooltip } from "@mui/material";
import { AudioRecorderModal } from "./AudioRecorderModal";

export type AudioRecorderType = {
  awayTeamName: string;
  homeTeamName: string;
  updateShot: (
    team: "home" | "away",
    playerIndex: number,
    shotType: "freeThrow" | "twoPointer" | "threePointer",
    shotStats: { made: number; attempted: number },
    pointsDiff: number,
  ) => void;
  updateStat: (
    team: "home" | "away",
    playerIndex: number,
    stat: string,
    delta: number,
  ) => void;
  shotUpdateStacks: React.RefObject<ShotUpdateStack>;
};

const TOOL_TIP_TEXT =
  "Speak the player name and stat and our AI will record it automatically.";

export const AudioRecorder = ({
  awayTeamName,
  homeTeamName,
  updateShot,
  updateStat,
  shotUpdateStacks,
}: AudioRecorderType) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <div>
      <Tooltip title={TOOL_TIP_TEXT} arrow placement="top">
        <span>
          <button onClick={handleOpenModal}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <LuSparkles />
              {"Auto-Record By Voice"}
              <FaMicrophone />
            </div>
          </button>
        </span>
      </Tooltip>
      <AudioRecorderModal
        isOpen={isModalOpen}
        handleClose={handleCloseModal}
        data={{
          awayTeamName,
          homeTeamName,
          updateShot,
          updateStat,
          shotUpdateStacks,
        }}
      />
    </div>
  );
};

export default AudioRecorder;
