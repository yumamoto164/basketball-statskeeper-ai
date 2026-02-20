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

export type StatsFromAudioResult =
  | ShotResult
  | NonShotResult
  | undefined
  | { error: "unclear stat" | "unclear which team" };
export type StatsFromAudioStage =
  | "received"
  | "transcribing"
  | "transcribed"
  | "extracting"
  | "resolving_player"
  | "formatting";

export type StatsFromAudioProgressEvent = {
  type: "progress" | "result";
  stage: StatsFromAudioStage;
  message: string;
  transcript?: string;
};

const apiUrl = import.meta.env.VITE_API_URL;

const mapApiResponseToResult = (
  responseData: unknown,
): StatsFromAudioResult => {
  if (!responseData) return undefined;

  const response = responseData as Record<string, unknown>;
  if (response.category === "shot") {
    const { category, team, player_index, shot_type, made } = response as {
      category: "shot";
      team: "home" | "away";
      player_index: number;
      shot_type: "freeThrow" | "twoPointer" | "threePointer";
      made: boolean;
    };
    return {
      category,
      team,
      playerIndex: player_index,
      shotType: shot_type,
      made,
    } as ShotResult;
  }

  if (response.category === "non-shot") {
    const { category, team, player_index, stat, delta } = response as {
      category: "non-shot";
      team: "home" | "away";
      player_index: number;
      stat: string;
      delta: number;
    };
    return {
      category,
      team,
      playerIndex: player_index,
      stat,
      delta,
    } as NonShotResult;
  }

  if (responseData === "unclear which team") {
    return { error: "unclear which team" };
  }

  if (responseData === "unclear stat") {
    return { error: "unclear stat" };
  }

  return undefined;
};

const parseSseEventData = (eventChunk: string): unknown | null => {
  const lines = eventChunk
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const dataLines = lines
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.replace(/^data:\s?/, ""));

  if (dataLines.length === 0) return null;

  try {
    return JSON.parse(dataLines.join("\n"));
  } catch {
    return null;
  }
};

const streamStatsFromAudio = async (
  requestBody: Record<string, unknown>,
  onProgress?: (event: StatsFromAudioProgressEvent) => void,
): Promise<StatsFromAudioResult> => {
  const response = await fetch(`${apiUrl}/stats-from-audio/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Streaming endpoint failed with status ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let finalResult: StatsFromAudioResult = undefined;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const eventChunk of events) {
      const parsed = parseSseEventData(eventChunk) as Record<
        string,
        unknown
      > | null;
      if (!parsed) continue;

      if (parsed.type === "progress") {
        const stage = parsed.stage as StatsFromAudioStage;
        const message = String(parsed.message ?? "Processing...");
        onProgress?.({
          type: "progress",
          stage,
          message,
          transcript: parsed.transcript ? String(parsed.transcript) : undefined,
        });
      } else if (parsed.type === "result") {
        finalResult = mapApiResponseToResult(parsed.response);
      } else if (parsed.type === "error") {
        throw new Error(String(parsed.detail ?? "Streaming error"));
      }
    }
  }

  return finalResult;
};

const fetchStatsFromAudio = async (
  requestBody: Record<string, unknown>,
): Promise<StatsFromAudioResult> => {
  const response = await fetch(`${apiUrl}/stats-from-audio`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });
  const data = await response.json();
  return mapApiResponseToResult(data?.response);
};

export const statsFromAudioService = async (
  audio: Blob,
  homeTeamData: RequestTeamData,
  awayTeamData: RequestTeamData,
  onProgress?: (event: StatsFromAudioProgressEvent) => void,
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

  try {
    const useStreaming = import.meta.env.VITE_USE_STREAMING_STATS !== "false";
    if (useStreaming) {
      try {
        return await streamStatsFromAudio(requestBody, onProgress);
      } catch {
        // Fallback to non-streaming endpoint for compatibility.
        return await fetchStatsFromAudio(requestBody);
      }
    }

    return await fetchStatsFromAudio(requestBody);
  } catch (error) {
    throw new Error("Error processing audio: " + error);
  }
};
