import React, { useEffect, useRef, useState } from 'react';

interface Point {
  x: number;
  y: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface Entity {
  x: number;
  y: number;
  radius: number;
  color: string;
  vx: number;
  vy: number;
}

interface GameCanvasProps {
  onGameOver: () => void;
  onLifeChange: (lives: number) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ onGameOver, onLifeChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const scoreRef = useRef<number>(0);
  
  // Game State Refs (mutable for performance in game loop)
  const playerRef = useRef<Entity>({ x: 0, y: 0, radius: 15, color: '#FFFFFF', vx: 0, vy: 0 });
  const enemiesRef = useRef<Entity[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const livesRef = useRef<number>(3);
  const lastTimeRef = useRef<number>(0);
  const enemySpawnTimerRef = useRef<number>(0);
  const isGameOverRef = useRef<boolean>(false);
  const screenShakeRef = useRef<number>(0);
  const flashRef = useRef<number>(0);

  const gameStartTimeRef = useRef<number>(0);
  const nextSpawnTimeRef = useRef<number>(0);

  // Input state
  const mouseRef = useRef<Point>({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize player position to center
    playerRef.current.x = window.innerWidth / 2;
    playerRef.current.y = window.innerHeight / 2;
    mouseRef.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    
    // Initialize game start time
    gameStartTimeRef.current = performance.now();
    nextSpawnTimeRef.current = 0; // Spawn immediately

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Input Listeners
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault(); // Prevent scrolling
      const touch = e.touches[0];
      mouseRef.current = { x: touch.clientX, y: touch.clientY };
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });

    // Game Loop
    const update = (time: number) => {
      if (isGameOverRef.current) return;

      const deltaTime = time - lastTimeRef.current;
      lastTimeRef.current = time;

      // Clear canvas
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Screen Flash
      if (flashRef.current > 0) {
        ctx.fillStyle = `rgba(255, 0, 0, ${flashRef.current})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        flashRef.current -= 0.1; // Fade out
      }

      // Screen Shake
      let shakeX = 0;
      let shakeY = 0;
      if (screenShakeRef.current > 0) {
        shakeX = (Math.random() - 0.5) * screenShakeRef.current;
        shakeY = (Math.random() - 0.5) * screenShakeRef.current;
        screenShakeRef.current *= 0.9; // Dampen shake
        if (screenShakeRef.current < 0.5) screenShakeRef.current = 0;
      }

      ctx.save();
      ctx.translate(shakeX, shakeY);

      // Update Player (Smooth follow)
      const dx = mouseRef.current.x - playerRef.current.x;
      const dy = mouseRef.current.y - playerRef.current.y;
      playerRef.current.x += dx * 0.15; // Smooth factor
      playerRef.current.y += dy * 0.15;

      // Player Particles
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
        particlesRef.current.push({
          x: playerRef.current.x,
          y: playerRef.current.y,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          life: 1.0,
          maxLife: 1.0,
          color: 'rgba(255, 255, 255, 0.5)',
          size: Math.random() * 3 + 2
        });
      }

      // Draw Player
      ctx.beginPath();
      ctx.arc(playerRef.current.x, playerRef.current.y, playerRef.current.radius, 0, Math.PI * 2);
      ctx.fillStyle = playerRef.current.color;
      ctx.shadowBlur = 20;
      ctx.shadowColor = 'white';
      ctx.fill();
      ctx.shadowBlur = 0;

      // Spawn Enemies
      // Logic: 0.8-1.8s base, reduce by 0.1s every 10s.
      if (time >= nextSpawnTimeRef.current) {
        spawnEnemy(canvas);
        
        const elapsedSeconds = (time - gameStartTimeRef.current) / 1000;
        const reductionSteps = Math.floor(elapsedSeconds / 10);
        const reductionMs = reductionSteps * 100; // 0.1s = 100ms
        
        // Base range: 800ms to 1800ms
        // Apply reduction, but clamp to minimums (e.g., 200ms min spawn time)
        const minSpawn = Math.max(200, 800 - reductionMs);
        const maxSpawn = Math.max(400, 1800 - reductionMs);
        
        const nextInterval = Math.random() * (maxSpawn - minSpawn) + minSpawn;
        nextSpawnTimeRef.current = time + nextInterval;
      }

      // Update & Draw Enemies
      for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
        const enemy = enemiesRef.current[i];
        
        // Movement Logic: Slight steering towards player
        const targetAngle = Math.atan2(playerRef.current.y - enemy.y, playerRef.current.x - enemy.x);
        const currentAngle = Math.atan2(enemy.vy, enemy.vx);
        
        // Calculate shortest rotation to target
        let deltaAngle = targetAngle - currentAngle;
        // Normalize to -PI to PI
        while (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;
        while (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;
        
        // Clamp turn rate (e.g., 0.05 radians per frame)
        const maxTurn = 0.01;
        if (deltaAngle > maxTurn) deltaAngle = maxTurn;
        if (deltaAngle < -maxTurn) deltaAngle = -maxTurn;
        
        const newAngle = currentAngle + deltaAngle;
        const speed = 3; // Constant speed
        
        enemy.vx = Math.cos(newAngle) * speed;
        enemy.vy = Math.sin(newAngle) * speed;
        
        enemy.x += enemy.vx;
        enemy.y += enemy.vy;

        // Enemy Particles (Trail)
        if (Math.random() > 0.5) {
           particlesRef.current.push({
            x: enemy.x,
            y: enemy.y,
            vx: (Math.random() - 0.5),
            vy: (Math.random() - 0.5),
            life: 0.8,
            maxLife: 0.8,
            color: enemy.color,
            size: Math.random() * 3 + 1
          });
        }

        // Draw Enemy
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
        ctx.fillStyle = enemy.color;
        ctx.fill();

        // Collision Detection
        const dist = Math.hypot(playerRef.current.x - enemy.x, playerRef.current.y - enemy.y);
        if (dist < playerRef.current.radius + enemy.radius) {
          // Hit!
          handleCollision(i);
        }
      }

      // Update & Draw Particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;

        if (p.life <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        // Parse color to add opacity if needed, or just assume rgba/hex
        // Simple hack: if it's hex, we can't easily fade it without parsing. 
        // But we set color as rgba for player particles. 
        // For enemies, let's just use globalAlpha.
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }

      ctx.restore();
      requestRef.current = requestAnimationFrame(update);
    };

    const spawnEnemy = (canvas: HTMLCanvasElement) => {
      const radius = 12;
      let x, y;
      // Spawn at edges
      if (Math.random() < 0.5) {
        x = Math.random() < 0.5 ? -radius : canvas.width + radius;
        y = Math.random() * canvas.height;
      } else {
        x = Math.random() * canvas.width;
        y = Math.random() < 0.5 ? -radius : canvas.height + radius;
      }

      const colors = ['#FF5733', '#33FF57', '#3357FF', '#F333FF', '#FFFF33', '#33FFFF'];
      const color = colors[Math.floor(Math.random() * colors.length)];

      // Initial velocity towards player
      const angle = Math.atan2(playerRef.current.y - y, playerRef.current.x - x);
      const speed = 3;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      enemiesRef.current.push({
        x,
        y,
        radius,
        color,
        vx,
        vy
      });
    };

    const handleCollision = (enemyIndex: number) => {
      // Remove enemy
      enemiesRef.current.splice(enemyIndex, 1);
      
      // Effects
      screenShakeRef.current = 20;
      flashRef.current = 0.5;
      
      // Logic
      livesRef.current -= 1;
      onLifeChange(livesRef.current);

      if (livesRef.current <= 0) {
        isGameOverRef.current = true;
        onGameOver();
      }
    };

    requestRef.current = requestAnimationFrame(update);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      cancelAnimationFrame(requestRef.current);
    };
  }, [onGameOver, onLifeChange]);

  return (
    <canvas
      ref={canvasRef}
      className="block w-full h-full touch-none"
      style={{ background: '#000', touchAction: 'none' }}
    />
  );
};
