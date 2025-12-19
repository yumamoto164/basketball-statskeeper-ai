type RequestTeamData = {
  name: string;
  players: { name: string; number: string }[];
};

export type ShotResult = {
  category: "shot";
  team: "home" | "away";
  playerIndex: number;
  shotType: "freeThrow" | "twoPointer" | "threePointer";
  made: boolean;
};

export type NonShotResult = {
  category: "non-shot";
  team: "home" | "away";
  playerIndex: number;
  stat: string;
  delta: number;
};

export type StatsFromAudioResult = ShotResult | NonShotResult | undefined;

export const statsFromAudioService = async (
  audio: Blob,
  homeTeamData: RequestTeamData,
  awayTeamData: RequestTeamData
): Promise<StatsFromAudioResult> => {
  // convert audio Blob to base64 string using FileReader
  const audioBase64: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(",")[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(audio);
  });

  // Format request body to match backend expectations
  const requestBody = {
    audio_file: audioBase64,
    home_team_data: {
      team_name: homeTeamData.name,
      players: homeTeamData.players,
    },
    away_team_data: {
      team_name: awayTeamData.name,
      players: awayTeamData.players,
    },
  };

  const backendUrl = "http://localhost:8000";
  try {
    const response = await fetch(`${backendUrl}/stats-from-audio`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
    const data = await response.json();
    if (data && data?.response) {
      if (data.response.category === "shot") {
        const { category, team, player_index, shot_type, made } = data.response;
        return {
          category,
          team,
          playerIndex: player_index,
          shotType: shot_type,
          made,
        } as ShotResult;
      } else if (data.response.category === "non-shot") {
        const { category, team, player_index, stat, delta } = data.response;
        return {
          category,
          team,
          playerIndex: player_index,
          stat,
          delta,
        } as NonShotResult;
      } else if (data.response === "unclear stat") {
        return undefined;
      }
    }
    return undefined;
  } catch (error) {
    throw new Error("Error processing audio: " + error);
  }
};
