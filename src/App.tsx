import React, { useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { motion, AnimatePresence } from 'motion/react';
import { Heart } from 'lucide-react';

type GameState = 'MENU' | 'PLAYING' | 'GAME_OVER';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [lives, setLives] = useState(3);
  const [gameId, setGameId] = useState(0);

  const startGame = () => {
    setLives(3);
    setGameId(prev => prev + 1);
    setGameState('PLAYING');
  };

  const handleGameOver = () => {
    setGameState('GAME_OVER');
  };

  const handleLifeChange = (newLives: number) => {
    setLives(newLives);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black text-white font-sans">
      
      {/* Game Layer */}
      {(gameState === 'PLAYING' || gameState === 'GAME_OVER') && (
        <div className="absolute inset-0 z-0">
          <GameCanvas 
            key={gameId} 
            onGameOver={handleGameOver} 
            onLifeChange={handleLifeChange} 
          />
        </div>
      )}

      {/* UI Overlay Layer */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        
        {/* HUD */}
        {gameState === 'PLAYING' && (
          <div className="absolute top-4 left-4 flex gap-1">
            {[...Array(3)].map((_, i) => (
              <Heart
                key={i}
                className={`w-8 h-8 ${i < lives ? 'fill-red-500 text-red-500' : 'text-gray-800 fill-gray-900'}`}
              />
            ))}
          </div>
        )}

        {/* Screens */}
        <AnimatePresence>
          {gameState === 'MENU' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 pointer-events-auto"
            >
              <h1 className="text-6xl font-bold mb-8 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
                ly的测试游戏
              </h1>
              <button
                onClick={startGame}
                className="px-8 py-4 bg-white text-black text-xl font-bold rounded-full hover:scale-105 active:scale-95 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.3)] cursor-pointer"
              >
                开始游戏
              </button>
            </motion.div>
          )}

          {gameState === 'GAME_OVER' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 pointer-events-auto"
            >
              <h2 className="text-5xl font-bold mb-4 text-red-500">游戏结束</h2>
              <p className="text-gray-400 mb-8">下次再接再厉！</p>
              <button
                onClick={startGame}
                className="px-8 py-4 bg-white text-black text-xl font-bold rounded-full hover:scale-105 active:scale-95 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.3)] cursor-pointer"
              >
                重新开始
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
