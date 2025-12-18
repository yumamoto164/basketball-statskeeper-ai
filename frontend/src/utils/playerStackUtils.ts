import { ShotUpdateStack } from "../components/StatKeeper";

/**
 * Get the stack of shots for a player. Used to undo shots.
 * @param shotUpdateStacks - the stack of shots for the player
 * @param team - the team of the player
 * @param playerIndex - the index of the player
 * @returns the stack of shots for the player
 */
export const getPlayerStack = (
  shotUpdateStacks: React.RefObject<ShotUpdateStack>,
  team: "home" | "away",
  playerIndex: number
) => {
  const playerKey = `${team}-${playerIndex}`;
  if (!shotUpdateStacks.current.has(playerKey)) {
    shotUpdateStacks.current.set(playerKey, {
      freeThrow: [],
      twoPointer: [],
      threePointer: [],
    });
  }
  return shotUpdateStacks.current.get(playerKey)!;
};
