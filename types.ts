
export type Point = {
  x: number;
  y: number;
};

export enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
}

export enum GameStatus {
  IDLE = 'IDLE',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER',
  LEVEL_UP = 'LEVEL_UP',
}

export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

export type Language = 'EN' | 'CN';

export interface GameState {
  snake: Point[];
  food: Point;
  obstacles: Point[];
  direction: Direction;
  status: GameStatus;
  difficulty: Difficulty;
  score: number;
  highScore: number;
  speed: number;
  level: number;
}
