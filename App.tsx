
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Point, Direction, GameStatus, GameState, Difficulty, Language } from './types';
import { GRID_SIZE, DIRECTIONS, REVERSE_DIRECTIONS, DIFFICULTY_CONFIG } from './constants';
import { fetchHorseWisdom } from './services/geminiService';
import GameBoard from './components/GameBoard';
import Controls from './components/Controls';

const translations = {
  EN: {
    tagline: "The Great Gallop",
    bestScore: "Best Score",
    score: "SCORE",
    level: "LEVEL",
    goal: "GOAL",
    pickPaddock: "READY TO RACE?",
    startRace: "START RACE",
    stumbled: "STUMBLED!",
    finalScore: "FINAL SCORE",
    wisdom: "Horse Wisdom",
    consulting: "Consulting the stable...",
    mainMenu: "MAIN MENU",
    paused: "PAUSED",
    revelation: "Revelation Peace Present",
    levelComplete: "LEVEL COMPLETE!",
    nextLevel: "NEXT GALLOP",
    victory: "VICTORY!",
    footer: "REVELATION PEACE"
  },
  CN: {
    tagline: "万马奔腾",
    bestScore: "最高得分",
    score: "得分",
    level: "关卡",
    goal: "目标",
    pickPaddock: "准备好竞赛了吗？",
    startRace: "开始竞赛",
    stumbled: "绊倒了！",
    finalScore: "最终得分",
    wisdom: "小马智慧",
    consulting: "正在向马厩请教...",
    mainMenu: "返回主页",
    paused: "暂停",
    revelation: "Revelation Peace Present",
    levelComplete: "顺利过关！",
    nextLevel: "下一关",
    victory: "最终胜利！",
    footer: "天启鸿泰企业"
  }
};

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('CN');
  const [gameState, setGameState] = useState<GameState>({
    snake: [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }],
    food: { x: 5, y: 5 },
    obstacles: [],
    direction: Direction.UP,
    status: GameStatus.IDLE,
    difficulty: Difficulty.MEDIUM,
    score: 0,
    highScore: parseInt(localStorage.getItem('horse-snake-highscore') || '0'),
    speed: DIFFICULTY_CONFIG[Difficulty.MEDIUM].initialSpeed,
    level: 1,
  });

  const [wisdom, setWisdom] = useState<string>("");
  const [loadingWisdom, setLoadingWisdom] = useState(false);
  const gameLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const t = translations[lang];

  const getLevelGoal = (lvl: number): number => {
    if (lvl === 1) return 10;
    if (lvl === 2) return 30;
    if (lvl === 3) return 100;
    return 100000 + (lvl - 4) * 100000;
  };

  const generateObstacles = useCallback((count: number, exclude: Point[]): Point[] => {
    const newObstacles: Point[] = [];
    while (newObstacles.length < count) {
      const p = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      const isExcluded = exclude.some(e => e.x === p.x && e.y === p.y);
      const isObstacle = newObstacles.some(o => o.x === p.x && o.y === p.y);
      if (!isExcluded && !isObstacle) {
        newObstacles.push(p);
      }
    }
    return newObstacles;
  }, []);

  const generateFood = useCallback((snake: Point[], obstacles: Point[]): Point => {
    let newFood;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      const isOnSnake = snake.some(segment => segment.x === newFood!.x && segment.y === newFood!.y);
      const isOnObstacle = obstacles.some(obs => obs.x === newFood!.x && obs.y === newFood!.y);
      if (!isOnSnake && !isOnObstacle) break;
    }
    return newFood;
  }, []);

  const moveSnake = useCallback(() => {
    setGameState(prev => {
      if (prev.status !== GameStatus.PLAYING) return prev;

      const newHead = { ...prev.snake[0] };
      switch (prev.direction) {
        case Direction.UP: newHead.y -= 1; break;
        case Direction.DOWN: newHead.y += 1; break;
        case Direction.LEFT: newHead.x -= 1; break;
        case Direction.RIGHT: newHead.x += 1; break;
      }

      if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
        return { ...prev, status: GameStatus.GAME_OVER };
      }
      if (prev.snake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
        return { ...prev, status: GameStatus.GAME_OVER };
      }
      if (prev.obstacles.some(obs => obs.x === newHead.x && obs.y === newHead.y)) {
        return { ...prev, status: GameStatus.GAME_OVER };
      }

      let newSnake = [newHead, ...prev.snake];
      let newScore = prev.score;
      let newFoodPos = prev.food;
      let newStatus: GameStatus = prev.status;

      const ateFood = newHead.x === prev.food.x && newHead.y === prev.food.y;
      if (ateFood) {
        newScore += 100;
        const newHighScore = Math.max(newScore, prev.highScore);
        if (newHighScore > prev.highScore) {
          localStorage.setItem('horse-snake-highscore', newHighScore.toString());
        }
        
        const goal = getLevelGoal(prev.level);
        if (newScore >= goal) {
          newStatus = GameStatus.LEVEL_UP;
        } else {
          newFoodPos = generateFood(newSnake, prev.obstacles);
        }
      }

      const targetLength = 3 + Math.floor(newScore / 10000);
      while (newSnake.length > targetLength) {
        newSnake.pop();
      }

      const config = DIFFICULTY_CONFIG[prev.difficulty];
      const newSpeed = ateFood ? Math.max(config.minSpeed, prev.speed - config.speedIncrement) : prev.speed;

      return {
        ...prev,
        snake: newSnake,
        food: newFoodPos,
        score: newScore,
        highScore: Math.max(newScore, prev.highScore),
        status: newStatus,
        speed: newSpeed,
      };
    });
  }, [generateFood]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const key = e.key;
    if (DIRECTIONS[key]) {
      const newDir = DIRECTIONS[key] as Direction;
      setGameState(prev => {
        if (REVERSE_DIRECTIONS[newDir] === prev.direction) return prev;
        return { ...prev, direction: newDir };
      });
    } else if (key === ' ') {
      setGameState(prev => {
        if (prev.status === GameStatus.PLAYING) return { ...prev, status: GameStatus.PAUSED };
        if (prev.status === GameStatus.PAUSED) return { ...prev, status: GameStatus.PLAYING };
        return prev;
      });
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (gameState.status === GameStatus.PLAYING) {
      gameLoopRef.current = setInterval(moveSnake, gameState.speed);
    } else {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    }
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [gameState.status, gameState.speed, moveSnake]);

  useEffect(() => {
    if (gameState.status === GameStatus.GAME_OVER) {
      setLoadingWisdom(true);
      fetchHorseWisdom(gameState.score).then(w => {
        setWisdom(w);
        setLoadingWisdom(false);
      });
    }
  }, [gameState.status, gameState.score]);

  const startRace = () => {
    const difficulty = Difficulty.MEDIUM;
    const config = DIFFICULTY_CONFIG[difficulty];
    const initialSnake = [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }];
    const obstacles = generateObstacles(config.obstacleCount, initialSnake);
    
    setGameState({
      snake: initialSnake,
      obstacles: obstacles,
      food: generateFood(initialSnake, obstacles),
      direction: Direction.UP,
      status: GameStatus.PLAYING,
      difficulty: difficulty,
      score: 0,
      highScore: parseInt(localStorage.getItem('horse-snake-highscore') || '0'),
      speed: config.initialSpeed,
      level: 1,
    });
    setWisdom("");
  };

  const nextLevel = () => {
    setGameState(prev => {
      const nextLvl = prev.level + 1;
      const config = DIFFICULTY_CONFIG[prev.difficulty];
      const obstacles = generateObstacles(config.obstacleCount, prev.snake);
      return {
        ...prev,
        level: nextLvl,
        status: GameStatus.PLAYING,
        obstacles: obstacles,
        food: generateFood(prev.snake, obstacles),
        speed: Math.max(config.minSpeed, prev.speed - 2),
      };
    });
  };

  const changeDirectionManually = (dir: Direction) => {
    setGameState(prev => {
      if (REVERSE_DIRECTIONS[dir] === prev.direction) return prev;
      if (prev.status !== GameStatus.PLAYING) return prev;
      return { ...prev, direction: dir };
    });
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4 w-full py-4">
      <div className="w-full flex justify-between items-end max-w-[400px]">
        <div className="flex flex-col">
          <h1 className="text-3xl font-black retro-font tracking-tighter text-emerald-400 leading-none">EQUINE GLIDE</h1>
          <div className="text-stone-400 text-[10px] uppercase tracking-widest font-semibold mt-1">{t.tagline}</div>
        </div>
        <div className="text-right">
          <div className="text-stone-500 text-[10px] uppercase font-bold">{t.bestScore}</div>
          <div className="text-xl retro-font text-stone-100">{gameState.highScore.toLocaleString()}</div>
        </div>
      </div>

      <div className="relative w-full max-w-[400px]">
        <div className="flex justify-between items-center mb-2 px-1">
          <div className="text-sm retro-font text-stone-300">
            {t.level}: <span className="text-emerald-400">{gameState.level}/999</span>
          </div>
          <div className="text-sm retro-font text-stone-300">
            {t.score}: <span className="text-stone-100">{gameState.score.toLocaleString()}</span>
          </div>
          <div className="text-sm retro-font text-stone-400">
            {t.goal}: <span className="text-yellow-500">{getLevelGoal(gameState.level).toLocaleString()}</span>
          </div>
        </div>

        <GameBoard 
          snake={gameState.snake} 
          food={gameState.food} 
          obstacles={gameState.obstacles}
          status={gameState.status} 
        />

        {gameState.status === GameStatus.LEVEL_UP && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-stone-900/90 rounded-lg p-6 text-center animate-in fade-in scale-in duration-300">
            <div className="text-6xl mb-4 animate-bounce">🏆</div>
            <h2 className="text-4xl retro-font text-emerald-400 mb-2">{t.levelComplete}</h2>
            <div className="text-xl text-stone-300 mb-8">
               {t.level} {gameState.level} &raquo; {gameState.level + 1}
            </div>
            <button 
              onClick={nextLevel}
              className="px-8 py-3 bg-emerald-600 text-white rounded-full font-black shadow-xl hover:bg-emerald-500 transition-all active:scale-95"
            >
              {t.nextLevel}
            </button>
          </div>
        )}

        {gameState.status === GameStatus.IDLE && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-stone-900/95 rounded-lg p-6 text-center">
            <div className="absolute top-4 right-4 flex gap-2">
              <button onClick={() => setLang('EN')} className={`w-8 h-8 rounded-full text-[10px] font-bold border transition-colors ${lang === 'EN' ? 'bg-emerald-600 border-emerald-400' : 'bg-stone-800 border-stone-700 text-stone-500'}`}>EN</button>
              <button onClick={() => setLang('CN')} className={`w-8 h-8 rounded-full text-[10px] font-bold border transition-colors ${lang === 'CN' ? 'bg-emerald-600 border-emerald-400' : 'bg-stone-800 border-stone-700 text-stone-500'}`}>CN</button>
            </div>

            <div className="text-5xl mb-2">🐴</div>
            <h2 className="text-3xl retro-font mb-1">{t.pickPaddock}</h2>
            <div className="text-emerald-400/80 text-xs retro-font mb-4 tracking-widest animate-pulse">
               {t.revelation}
            </div>
            
            <button 
              onClick={startRace}
              className="mt-4 group flex items-center justify-center w-full max-w-[240px] px-6 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xl shadow-2xl transition-all active:scale-95"
            >
              {t.startRace}
            </button>
          </div>
        )}

        {gameState.status === GameStatus.GAME_OVER && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-stone-950/90 rounded-lg p-6 text-center animate-in fade-in zoom-in duration-300">
            <div className="text-5xl mb-2">🏁</div>
            <h2 className="text-4xl retro-font text-red-500 mb-1">{t.stumbled}</h2>
            <div className="text-2xl retro-font text-stone-300 mb-4">{t.finalScore}: {gameState.score.toLocaleString()}</div>
            
            <div className="bg-stone-800/50 p-4 rounded-xl border border-stone-700 mb-6 w-full max-w-[280px]">
              <div className="text-[10px] text-stone-500 uppercase font-bold mb-2 flex items-center gap-2">
                <i className="fa-solid fa-bolt text-yellow-500"></i> {t.wisdom}
              </div>
              <p className="italic text-stone-200 text-sm min-h-[40px]">
                {loadingWisdom ? t.consulting : wisdom}
              </p>
            </div>

            <button 
              onClick={() => setGameState(prev => ({ ...prev, status: GameStatus.IDLE }))}
              className="px-10 py-4 bg-white text-stone-900 rounded-full font-black shadow-xl hover:bg-emerald-400 transition-colors active:scale-95"
            >
              {t.mainMenu}
            </button>
          </div>
        )}
      </div>

      <Controls 
        onDirectionChange={changeDirectionManually}
        status={gameState.status}
      />

      <footer className="pt-4 text-stone-600 text-[10px] uppercase tracking-[0.4em] font-black text-center">
        {t.footer}
      </footer>
    </div>
  );
};

export default App;
