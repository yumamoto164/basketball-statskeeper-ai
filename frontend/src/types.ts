export interface ShotStats {
  made: number;
  attempted: number;
}

export interface Player {
  name: string;
  number: string;
  // Scoring stats
  points: number;
  freeThrow: ShotStats;
  twoPointer: ShotStats;
  threePointer: ShotStats;
  // Other stats
  assists: number;
  offensiveRebounds: number;
  defensiveRebounds: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;
}
