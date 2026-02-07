
import { Difficulty } from './types';

export const GRID_SIZE = 20;

export const DIFFICULTY_CONFIG = {
  [Difficulty.EASY]: {
    initialSpeed: 180,
    minSpeed: 100,
    obstacleCount: 0,
    speedIncrement: 1,
  },
  [Difficulty.MEDIUM]: {
    initialSpeed: 140,
    minSpeed: 70,
    obstacleCount: 15,
    speedIncrement: 2,
  },
  [Difficulty.HARD]: {
    initialSpeed: 100,
    minSpeed: 50,
    obstacleCount: 30,
    speedIncrement: 3,
  },
};

export const DIRECTIONS: Record<string, string> = {
  ArrowUp: 'UP',
  ArrowDown: 'DOWN',
  ArrowLeft: 'LEFT',
  ArrowRight: 'RIGHT',
  w: 'UP',
  s: 'DOWN',
  a: 'LEFT',
  d: 'RIGHT',
};

export const REVERSE_DIRECTIONS: Record<string, string> = {
  UP: 'DOWN',
  DOWN: 'UP',
  LEFT: 'RIGHT',
  RIGHT: 'LEFT',
};
