"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTheme } from "next-themes";
import { GameEngine, GameEventType } from "@/lib/game/engine";
import { GameRenderer } from "@/components/game/GameRenderer";
import { Snake, PlayerInput, GameState } from "@/lib/game/models";
import { v4 as uuidv4 } from "uuid";
import { gameSocketClient } from "@/lib/game/socket-client";
import { soundManager } from "@/lib/audio/SoundManager";
import { gameStatsClient, GameStats, testDatabaseConnection, displayStats } from "@/lib/game/stats-client";
import { createBrowserClient } from "@supabase/ssr";
import { Users, X, Info, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from "lucide-react";
import Leaderboard from './Leaderboard';
import ChatBox from './ChatBox';
import SoundControl from './SoundControl';
import { useRouter } from "next/navigation";

interface GameCanvasProps {
  width?: number;
  height?: number;
  onPlayerNameChange?: (name: string) => void;
  forceOnlineMode?: boolean;
}

// Constants for game configuration
const MAP_WIDTH = 6000; // Larger map for more exploration
const MAP_HEIGHT = 6000;

// Tutorial Overlay Component
const TutorialOverlay = ({ onClose }: { onClose: () => void }) => {
  return (
    <div className="absolute inset-0 bg-black/70 z-50 flex items-center justify-center">
      <div className="bg-gray-900 rounded-xl shadow-xl p-6 max-w-2xl w-full mx-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X size={24} />
        </button>
        
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500">
              Snake.io Tutorial
            </span>
          </h2>
          <p className="text-gray-300">Master the basics and dominate the arena!</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-800/70 p-4 rounded-lg">
            <h3 className="text-purple-400 text-lg font-semibold mb-2">Movement</h3>
            <div className="flex justify-center gap-2 mb-4">
              <div className="w-10 h-10 bg-gray-700 rounded flex items-center justify-center">
                <ArrowUp size={20} className="text-white" />
              </div>
              <div className="w-10 h-10 bg-gray-700 rounded flex items-center justify-center">
                <ArrowLeft size={20} className="text-white" />
              </div>
              <div className="w-10 h-10 bg-gray-700 rounded flex items-center justify-center">
                <ArrowDown size={20} className="text-white" />
              </div>
              <div className="w-10 h-10 bg-gray-700 rounded flex items-center justify-center">
                <ArrowRight size={20} className="text-white" />
              </div>
            </div>
            <p className="text-gray-300 text-sm">
              Use arrow keys or WASD to control your snake. You can also use mouse movement in single-player mode.
            </p>
          </div>
          
          <div className="bg-gray-800/70 p-4 rounded-lg">
            <h3 className="text-cyan-400 text-lg font-semibold mb-2">Boost Speed</h3>
            <div className="flex justify-center mb-4">
              <div className="px-4 py-2 bg-gray-700 rounded text-white text-sm">
                Space
              </div>
            </div>
            <p className="text-gray-300 text-sm">
              Press Space when your boost meter is full for a temporary speed boost!
              Collect food to charge your boost meter.
            </p>
          </div>
          
          <div className="bg-gray-800/70 p-4 rounded-lg">
            <h3 className="text-amber-400 text-lg font-semibold mb-2">Power-ups</h3>
            <div className="flex justify-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-500/50 rounded-full flex items-center justify-center">
                🛡️
              </div>
              <div className="w-8 h-8 bg-purple-500/50 rounded-full flex items-center justify-center">
                🧲
              </div>
              <div className="w-8 h-8 bg-gray-500/50 rounded-full flex items-center justify-center">
                👻
              </div>
              <div className="w-8 h-8 bg-orange-500/50 rounded-full flex items-center justify-center">
                🔱
              </div>
            </div>
            <p className="text-gray-300 text-sm">
              Collect special power-ups for temporary abilities:
              Shield (protection), Magnet (attract food), Ghost (pass through), and Giant (size increase).
            </p>
          </div>
          
          <div className="bg-gray-800/70 p-4 rounded-lg">
            <h3 className="text-green-400 text-lg font-semibold mb-2">Grow & Survive</h3>
            <p className="text-gray-300 text-sm mb-2">
              • Eat food to grow longer and gain points
            </p>
            <p className="text-gray-300 text-sm mb-2">
              • Avoid hitting other snakes or the borders
            </p>
            <p className="text-gray-300 text-sm">
              • Try to trap opponents by circling around them
            </p>
          </div>
        </div>
        
        <div className="mt-6 text-center">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-medium transition-colors"
          >
            Got it!
          </button>
          <div className="mt-4 text-gray-400 text-xs">
            Use the <Info size={12} className="inline" /> button to show this tutorial again at any time.
          </div>
        </div>
      </div>
    </div>
  );
};

const GameCanvas = ({ 
  width = 800, 
  height = 600,
  onPlayerNameChange,
  forceOnlineMode = false
}: GameCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();
  const [isInitialized, setIsInitialized] = useState(false);
  const [gameEngine, setGameEngine] = useState<GameEngine | null>(null);
  const [gameRenderer, setGameRenderer] = useState<GameRenderer | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isOnlineMode, setIsOnlineMode] = useState(forceOnlineMode);
  const [isConnecting, setIsConnecting] = useState(forceOnlineMode);
  const [playerName, setPlayerName] = useState("Cosmic_" + uuidv4().substring(0, 5));
  const [canvasSize, setCanvasSize] = useState({ width, height });
  const [zoom, setZoom] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [gameStartTime, setGameStartTime] = useState<number>(0);
  const [showDebug, setShowDebug] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [playerSnake, setPlayerSnake] = useState<Snake | null>(null);
  const [playerRank, setPlayerRank] = useState<number | undefined>(undefined);
  const [showChat, setShowChat] = useState(false);
  const [playerCount, setPlayerCount] = useState(0);
  const [killFeed, setKillFeed] = useState<{message: string, timestamp: number, isError?: boolean, animateClass?: string}[]>([]);
  const [showTutorial, setShowTutorial] = useState(false);
  
  // Update canvas size on window resize - use the entire viewport
  useEffect(() => {
    const handleResize = () => {
      setCanvasSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    
    window.addEventListener('resize', handleResize);
    handleResize(); // Set initial size
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Check authentication status when component mounts
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Skip actual auth check in development mode
        if (process.env.NODE_ENV === 'development') {
          console.log("Development mode: skipping auth check");
          return;
        }
        
        // Only check auth if we have Supabase credentials
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
          console.log("No Supabase credentials available, skipping auth check");
          return;
        }
        
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );
        
        // Try session check first (most reliable)
        const { data: sessionData } = await supabase.auth.getSession();
        console.log("Initial auth check - session exists:", !!sessionData?.session);
        
        if (sessionData?.session?.user?.id) {
          // User is definitely logged in - remember this
          localStorage.setItem('userHasAuthenticated', 'true');
          console.log("User authenticated, saved to local storage");
        }
      } catch (err) {
        console.error("Initial auth check error:", err);
      }
    };
    
    checkAuth();
  }, []);
  
  // Initialize the game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas resolution for high DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize.width * dpr;
    canvas.height = canvasSize.height * dpr;
    canvas.style.width = `${canvasSize.width}px`;
    canvas.style.height = `${canvasSize.height}px`;
    ctx.scale(dpr, dpr);

    // Initialize game engine and renderer
    const engine = new GameEngine(
      forceOnlineMode ? MAP_WIDTH*1.5 : MAP_WIDTH, 
      forceOnlineMode ? MAP_HEIGHT*1.5 : MAP_HEIGHT
    );
    const renderer = new GameRenderer(
      ctx,
      canvasSize.width,
      canvasSize.height,
      forceOnlineMode ? MAP_WIDTH*1.5 : MAP_WIDTH,
      forceOnlineMode ? MAP_HEIGHT*1.5 : MAP_HEIGHT,
      theme === "dark"
    );

    // Create a player for local mode (default)
    const id = engine.addPlayer(playerName);
    
    setGameEngine(engine);
    setGameRenderer(renderer);
    setPlayerId(id);
    setIsInitialized(true);
    
    // Set game start time here and log it
    const startTime = Date.now();
    console.log("Setting game start time:", startTime);
    setGameStartTime(startTime);
    
    // Force store in localStorage as a backup
    localStorage.setItem('gameStartTime', startTime.toString());
    
    // Play game start sound and background music
    soundManager.playSound('game-start');
    soundManager.playBackgroundMusic();
    
    // If forceOnlineMode is true, we should skip auto-connect attempt and always try to connect
    if (forceOnlineMode) {
      setIsOnlineMode(true);
      tryConnectToServer();
    } else {
      // For offline mode, we don't need to connect to server
      // This keeps offline mode purely client-side
      console.log("Running in offline (client-side) mode");
    }
    
    // Auto-hide controls after 5 seconds
    const controlsTimer = setTimeout(() => {
      setShowControls(false);
    }, 5000);
    
    return () => {
      // Clean up WebSocket connection only if we were in online mode
      if (isOnlineMode) {
        gameSocketClient.disconnect();
      }
      
      // Stop background music
      soundManager.stopBackgroundMusic();
      
      clearTimeout(controlsTimer);
    };
  }, [playerName, forceOnlineMode]);

  // Update canvas size when window resizes
  useEffect(() => {
    if (!canvasRef.current || !gameRenderer) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Update canvas dimensions
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize.width * dpr;
    canvas.height = canvasSize.height * dpr;
    canvas.style.width = `${canvasSize.width}px`;
    canvas.style.height = `${canvasSize.height}px`;
    ctx.scale(dpr, dpr);
    
    // Update renderer with new dimensions
    gameRenderer.updateDimensions(canvasSize.width, canvasSize.height);
  }, [canvasSize, gameRenderer]);

  // Function to attempt connection to the game server (only for multiplayer mode)
  const tryConnectToServer = () => {
    setIsConnecting(true);
    
    // Connect to the WebSocket server
    gameSocketClient.connect();
    
    // Set up connection listener
    gameSocketClient.addConnectionListener((connected) => {
      if (connected) {
        setIsOnlineMode(true);
        gameSocketClient.joinGame(playerName);
        console.log("Connected to server - running in multiplayer (server-side authority) mode");
      } else {
        setIsOnlineMode(false);
        console.log("Failed to connect to server - falling back to offline mode");
      }
      setIsConnecting(false);
      setIsConnected(connected);
    });
    
    // Set up connection error listener
    gameSocketClient.addConnectionErrorListener((error) => {
      console.error("Socket connection error:", error);
      setIsConnecting(false);
      setIsConnected(false);
      setIsOnlineMode(false);
      
      // Add error message to kill feed
      setKillFeed(prev => [
        ...prev, 
        { 
          message: "⚠️ Multiplayer connection failed. Running in offline mode.", 
          timestamp: Date.now(),
          isError: true
        }
      ]);
    });
    
    // Set up player joined listener
    gameSocketClient.addPlayerJoinedListener((data) => {
      setPlayerId(data.playerId);
    });
    
    // Set up game state listener with client-side prediction
    let lastServerUpdate = Date.now();
    gameSocketClient.addGameStateListener((state) => {
      // Record time of this server update for prediction calculations
      lastServerUpdate = Date.now();
      
      // Determine if food was collected by comparing food counts
      if (gameState && state.foods.length < gameState.foods.length) {
        soundManager.playRandomFoodSound();
      }
      
      // Get the player snake from current and new state
      const currentPlayerSnake = gameState?.snakes.find(s => s.id === playerId);
      const newPlayerSnake = state.snakes.find(s => s.id === playerId);
      
      // Check if player died
      if (currentPlayerSnake?.alive && newPlayerSnake && !newPlayerSnake.alive) {
        soundManager.playSound('death');
      }
      
      setGameState(state);
    });
    
    // Set up kill feed listener (multiplayer only)
    const handleKillEvent = (data: any) => {
      // Create a meaningful kill message
      let message = "";
      
      if (data.killerName && data.victimName) {
        // New format from server with more details
        message = `${data.killerName} eliminated ${data.victimName}`;
      } else {
        // Fallback to old format
        message = `${data.victimName} was eliminated`;
      }
      
      // Add the new kill message to the feed with animation class
      setKillFeed(prev => [...prev, { message, timestamp: Date.now(), animateClass: 'animate-fadeOut' }]);
      
      // Remove old messages after 6 seconds
      setTimeout(() => {
        setKillFeed(prev => {
          if (prev.length > 0) {
            const [oldest, ...rest] = prev;
            // Don't remove error messages automatically
            if (oldest.isError) {
              return prev;
            }
            return rest;
          }
          return prev;
        });
      }, 6000);
    };
    
    // Add kill event listener (multiplayer only)
    gameSocketClient.addKillListener(handleKillEvent);
    
    // Clean up function will be called when component unmounts or dependencies change
    return () => {
      gameSocketClient.removeKillListener(handleKillEvent);
    };
  };

  // Handle name change
  useEffect(() => {
    if (isOnlineMode && playerId && gameSocketClient.isConnected()) {
      gameSocketClient.changeName(playerName);
    }
    
    if (onPlayerNameChange) {
      onPlayerNameChange(playerName);
    }
  }, [playerName, isOnlineMode, playerId, onPlayerNameChange]);

  // Update dark mode in the renderer when theme changes
  useEffect(() => {
    if (gameRenderer) {
      gameRenderer.setDarkMode(theme === "dark");
    }
  }, [theme, gameRenderer]);

  // Handle zoom with mouse wheel
  useEffect(() => {
    if (!gameRenderer) return;
    
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Math.max(0.5, Math.min(2, zoom + delta));
      setZoom(newZoom);
      gameRenderer.setZoom(newZoom);
    };
    
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('wheel', handleWheel, { passive: false });
    }
    
    return () => {
      if (canvas) {
        canvas.removeEventListener('wheel', handleWheel);
      }
    };
  }, [zoom, gameRenderer]);

  // Handle mouse/touch controls
  useEffect(() => {
    if (!isInitialized) return;
    if (!gameEngine && !isOnlineMode) return;
    if (!playerId) return;

    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      // Show controls temporarily when mouse moves
      setShowControls(true);
      
      // Hide controls after 3 seconds
      const controlsTimer = setTimeout(() => {
        setShowControls(false);
      }, 3000);

      // Get mouse position relative to canvas
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Get player snake
      let playerSnake: Snake | undefined;
      
      if (isOnlineMode && gameState) {
        playerSnake = gameState.snakes.find(snake => snake.id === playerId);
      } else if (gameEngine) {
        const state = gameEngine.getState();
        playerSnake = state.snakes.find(snake => snake.id === playerId);
      }
      
      if (!playerSnake || !playerSnake.alive) return;

      // Calculate direction from snake head to mouse position
      const head = playerSnake.segments[0];
      const direction = {
        x: mouseX - canvas.width / 2,
        y: mouseY - canvas.height / 2,
      };

      // Update player direction
      if (isOnlineMode) {
        // Send direction to server
        gameSocketClient.sendInput(direction);
      } else if (gameEngine) {
        // Update local game engine
        const input: PlayerInput = {
          id: playerId,
          direction,
        };
        gameEngine.handlePlayerInput(input);
      }
      
      return () => clearTimeout(controlsTimer);
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas || e.touches.length === 0) return;
      
      // Show controls temporarily
      setShowControls(true);
      
      // Get touch position
      const rect = canvas.getBoundingClientRect();
      const touchX = e.touches[0].clientX - rect.left;
      const touchY = e.touches[0].clientY - rect.top;
      
      // Get player snake
      let playerSnake: Snake | undefined;
      
      if (isOnlineMode && gameState) {
        playerSnake = gameState.snakes.find(snake => snake.id === playerId);
      } else if (gameEngine) {
        const state = gameEngine.getState();
        playerSnake = state.snakes.find(snake => snake.id === playerId);
      }
      
      if (!playerSnake || !playerSnake.alive) return;
      
      // Calculate direction from center to touch position
      const direction = {
        x: touchX - canvas.width / 2,
        y: touchY - canvas.height / 2,
      };
      
      // Update player direction
      if (isOnlineMode) {
        gameSocketClient.sendInput(direction);
      } else if (gameEngine) {
        const input: PlayerInput = {
          id: playerId,
          direction,
        };
        gameEngine.handlePlayerInput(input);
      }
    };

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener("mousemove", handleMouseMove);
      canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    }

    return () => {
      if (canvas) {
        canvas.removeEventListener("mousemove", handleMouseMove);
        canvas.removeEventListener("touchmove", handleTouchMove);
      }
    };
  }, [isInitialized, gameEngine, playerId, isOnlineMode, gameState]);

  // Store the start time in state and localStorage when game is initialized
  useEffect(() => {
    if (isInitialized && !gameStartTime) {
      const startTime = Date.now();
      setGameStartTime(startTime);
      localStorage.setItem('gameStartTime', startTime.toString());
      console.log("Game start time set:", startTime);
    }
  }, [isInitialized, gameStartTime]);

  // Main game loop for local mode
  useEffect(() => {
    // Skip if using online mode
    if (isOnlineMode) return;
    if (!isInitialized || !gameEngine || !gameRenderer || !playerId) return;
    
    // Create a function to record game stats
    const recordGameStats = (snake: Snake) => {
      // Get game start time from state or localStorage as fallback
      const startTimeFromState = gameStartTime;
      const startTimeFromStorage = parseInt(localStorage.getItem('gameStartTime') || '0');
      
      // Use state value if available, otherwise fallback to localStorage
      const effectiveStartTime = startTimeFromState || startTimeFromStorage;
      
      if (!effectiveStartTime) {
        console.error("Cannot record stats: gameStartTime is not available", {
          gameStartTimeState: gameStartTime,
          gameStartTimeStorage: startTimeFromStorage
        });
        return;
      }
      
      // Calculate play time in seconds
      const currentTime = Date.now();
      const playTimeSeconds = Math.floor((currentTime - effectiveStartTime) / 1000);
      
      console.log("Play time calculation:", {
        currentTime,
        startTime: effectiveStartTime,
        difference: currentTime - effectiveStartTime,
        playTimeSeconds
      });
      
      // Record match stats
      const stats: GameStats = {
        score: snake.score,
        snakeLength: snake.segments.length,
        playTime: playTimeSeconds,
        isMultiplayer: forceOnlineMode || isOnlineMode,
        kills: snake.kills || 0, // Track kills for multiplayer
        position: gameEngine?.getPlayerRank(playerId || '') || undefined
      };
      
      console.log("Recording game stats:", JSON.stringify(stats));
      
      // Record the match
      gameStatsClient.recordMatch(stats)
        .then(() => {
          console.log("Stats recorded successfully");
          // Clear gameStartTime from localStorage after successful recording
          localStorage.removeItem('gameStartTime');
          // Force reset the game start time
          setGameStartTime(0);
        })
        .catch(err => {
          console.error("Error recording stats:", err);
        });
      
      // Check for achievements
      if (snake.segments.length >= 50) {
        gameStatsClient.unlockAchievement({
          name: "Growing Pains",
          description: "Reach length 50 or more"
        }).catch(err => console.error("Error unlocking achievement:", err));
      }
      
      if (playTimeSeconds >= 300) { // 5 minutes
        gameStatsClient.unlockAchievement({
          name: "Survivalist",
          description: "Play for 5 minutes without dying"
        }).catch(err => console.error("Error unlocking achievement:", err));
      }
    };

    // Add event listeners for sound effects
    const handleGameEvent = (event: GameEventType, data?: any) => {
      if (data?.playerId !== playerId) return; // Only play sounds for the player's events
      
      switch (event) {
        case 'foodCollect':
          soundManager.playRandomFoodSound();
          break;
        case 'specialFoodCollect':
          soundManager.playSound('special-food');
          break;
        case 'playerDeath':
          soundManager.playSound('death');
          
          // Get the snake and record stats when player dies
          if (gameEngine) {
            const state = gameEngine.getState();
            const playerSnake = state.snakes.find(snake => snake.id === playerId);
            if (playerSnake) {
              recordGameStats(playerSnake);
            }
          }
          break;
        case 'playerDeathBorder':
          soundManager.playSound('death-border');
          
          // Get the snake and record stats when player dies at border
          if (gameEngine) {
            const state = gameEngine.getState();
            const playerSnake = state.snakes.find(snake => snake.id === playerId);
            if (playerSnake) {
              recordGameStats(playerSnake);
            }
          }
          break;
        case 'playerKill':
          // Play kill sound
          soundManager.playSound('special-food'); // Use existing sound for now
          
          // Track First Blood achievement
          if (gameEngine) {
            gameStatsClient.unlockAchievement({
              name: "First Blood",
              description: "Defeat your first opponent"
            }).catch(err => console.error("Error unlocking achievement:", err));
          }
          break;
        case 'boostStart':
          // Play boost activation sound
          soundManager.playSound('special-food'); // Use an existing sound for now
          
          // Track boost usage for achievement
          const boostCount = parseInt(localStorage.getItem('boostCount') || '0') + 1;
          localStorage.setItem('boostCount', boostCount.toString());
          
          if (boostCount >= 50) {
            gameStatsClient.unlockAchievement({
              name: "Speed Demon",
              description: "Use boost 50 times"
            }).catch(err => console.error("Error unlocking achievement:", err));
          }
          break;
        case 'boostEnd':
          // Play boost end sound
          soundManager.playSound('special-food'); // Use an existing sound for now, but with lower volume
          break;
      }
      
      if (event === 'playerDeath' && data?.playerId === playerId) {
        handlePlayerDeath();
      }
      
      // Track boost usage for achievement
      if (event === 'boostStart' && data?.playerId === playerId) {
        // You could have a counter in localStorage or state
        const boostCount = parseInt(localStorage.getItem('boostCount') || '0') + 1;
        localStorage.setItem('boostCount', boostCount.toString());
        
        if (boostCount >= 50) {
          gameStatsClient.unlockAchievement({
            name: "Speed Demon",
            description: "Use boost 50 times"
          }).catch(err => console.error("Error unlocking achievement:", err));
        }
      }
    };
    
    gameEngine.addEventListener(handleGameEvent);
    
    // Add keyboard event listener for boost activation
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle spacebar key when the game canvas is focused
      if (e.code === 'Space') {
        e.preventDefault(); // Prevent default spacebar behavior (like scrolling)
        e.stopPropagation(); // Stop event from bubbling up
        
        // Get the current player state to check if boost is available
        const state = gameEngine.getState();
        const playerSnake = state.snakes.find(snake => snake.id === playerId);
        
        if (playerSnake && playerSnake.alive && playerSnake.boostMeter >= 100 && !playerSnake.isBoosting) {
          // Only activate boost if meter is full and not already boosting
          gameEngine.activateBoost(playerId);
        }
      }
    };
    
    // Use the canvas as the event target instead of window for more specific control
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('keydown', handleKeyDown);
      // Make the canvas focusable
      canvas.tabIndex = 1; 
      // Focus the canvas on load
      canvas.focus();
    }
    
    let lastTime = 0;
    let animationFrameId: number;

    const gameLoop = (timestamp: number) => {
      // Calculate delta time
      const deltaTime = lastTime > 0 ? timestamp - lastTime : 0;
      lastTime = timestamp;

      // Update game state
      gameEngine.update(deltaTime);
      
      // Get the updated state
      const state = gameEngine.getState();
      const playerSnake = state.snakes.find(snake => snake.id === playerId) as Snake;
      
      // Center the view on the player's snake
      if (playerSnake && playerSnake.segments.length > 0) {
        const head = playerSnake.segments[0];
        gameRenderer.setCameraPosition(head.x, head.y);
      }
      
      // Pass deltaTime to the renderer
      gameRenderer.render(state, playerSnake, deltaTime);

      // Request next frame
      animationFrameId = requestAnimationFrame(gameLoop);
    };

    // Start game loop
    animationFrameId = requestAnimationFrame(gameLoop);

    // Clean up
    return () => {
      cancelAnimationFrame(animationFrameId);
      gameEngine.removeEventListener(handleGameEvent);
      if (canvas) {
        canvas.removeEventListener('keydown', handleKeyDown);
      }
      if (playerId && gameEngine) {
        gameEngine.removePlayer(playerId);
      }
    };
  }, [isInitialized, gameEngine, gameRenderer, playerId, isOnlineMode]);

  // Rendering loop for online mode
  useEffect(() => {
    // Skip if using local mode
    if (!isOnlineMode) return;
    if (!gameRenderer || !gameState) return;

    // Add keyboard event listener for boost activation in online mode
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && playerId) {
        e.preventDefault(); // Prevent default spacebar behavior
        e.stopPropagation(); // Stop event from bubbling up
        
        // For online mode, we would send a message to the server
        // This would be implemented when server-side boost is supported
        // For now, we can add a placeholder to show it's being captured
        console.log('Boost activation requested in online mode');
      }
    };
    
    // Use the canvas as the event target instead of window
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('keydown', handleKeyDown);
      // Make the canvas focusable
      canvas.tabIndex = 1;
      // Focus the canvas on load
      canvas.focus();
    }
    
    let animationFrameId: number;
    let lastTime = 0;

    const renderLoop = (timestamp: number) => {
      // Calculate delta time
      const deltaTime = lastTime > 0 ? timestamp - lastTime : 0;
      lastTime = timestamp;
      
      // Render the game state received from the server
      const playerSnake = gameState.snakes.find(snake => snake.id === playerId);
      
      // Center the view on the player's snake
      if (playerSnake && playerSnake.segments.length > 0) {
        const head = playerSnake.segments[0];
        gameRenderer.setCameraPosition(head.x, head.y);
      }
      
      // Pass deltaTime to the renderer for particle animations
      gameRenderer.render(gameState, playerSnake, deltaTime);

      // Request next frame
      animationFrameId = requestAnimationFrame(renderLoop);
    };

    // Start render loop
    animationFrameId = requestAnimationFrame(renderLoop);

    // Clean up
    return () => {
      cancelAnimationFrame(animationFrameId);
      if (canvas) {
        canvas.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [gameRenderer, gameState, playerId, isOnlineMode]);

  // Handle restart on click when game over
  useEffect(() => {
    if (!isInitialized) return;
    if (isOnlineMode && !gameState) return;
    if (!isOnlineMode && !gameEngine) return;
    if (!playerId) return;

    const handleClick = () => {
      let playerSnake: Snake | undefined;
      
      if (isOnlineMode && gameState) {
        playerSnake = gameState.snakes.find(snake => snake.id === playerId);
      } else if (gameEngine) {
        const state = gameEngine.getState();
        playerSnake = state.snakes.find(snake => snake.id === playerId);
      }
      
      if (playerSnake && !playerSnake.alive) {
        if (isOnlineMode) {
          // For online mode, rejoin the game
          gameSocketClient.disconnect();
          setTimeout(() => {
            gameSocketClient.connect();
            gameSocketClient.joinGame(playerName);
          }, 500);
        } else if (gameEngine) {
          // For local mode, create a new player
          gameEngine.removePlayer(playerId);
          const newId = gameEngine.addPlayer(playerName);
          setPlayerId(newId);
        }
      }
    };

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener("click", handleClick);
    }

    return () => {
      if (canvas) {
        canvas.removeEventListener("click", handleClick);
      }
    };
  }, [isInitialized, gameEngine, playerId, isOnlineMode, gameState, playerName]);

  // Handle zoom in/out buttons
  const handleZoomIn = () => {
    if (!gameRenderer) return;
    const newZoom = Math.min(2, zoom + 0.1);
    setZoom(newZoom);
    gameRenderer.setZoom(newZoom);
  };
  
  const handleZoomOut = () => {
    if (!gameRenderer) return;
    const newZoom = Math.max(0.5, zoom - 0.1);
    setZoom(newZoom);
    gameRenderer.setZoom(newZoom);
  };

  // When a game starts
  useEffect(() => {
    if (playerId && gameEngine) {
      setGameStartTime(Date.now());
    }
  }, [playerId, gameEngine]);

  // Handle player death event
  const handlePlayerDeath = () => {
    if (!playerId || !gameStartTime) return;
    
    console.log("handlePlayerDeath called");
    
    // First, test database connection 
    testDatabaseConnection().then(result => {
      console.log("Database connection test before recording death stats:", result);
    });
    
    // Get the player's final stats
    let finalState;
    let playerSnake;
    
    if (isOnlineMode && gameState) {
      finalState = gameState;
      playerSnake = finalState.snakes.find(s => s.id === playerId);
    } else if (gameEngine) {
      finalState = gameEngine.getState();
      playerSnake = finalState.snakes.find(s => s.id === playerId);
    }
    
    if (!playerSnake) {
      console.error("Player snake not found!");
      return;
    }
    
    // Calculate play time in seconds
    const playTimeSeconds = Math.floor((Date.now() - gameStartTime) / 1000);
    
    // Prepare stats object
    const stats: GameStats = {
      score: playerSnake.score,
      snakeLength: playerSnake.segments.length,
      position: finalState && finalState.leaderboard 
        ? finalState.leaderboard.findIndex(entry => entry.id === playerId) + 1 
        : undefined,
      playTime: playTimeSeconds
    };
    
    console.log("Recording death stats:", stats);
    
    // Check authentication status
    const checkAuth = async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data: { user } } = await supabase.auth.getUser();
        console.log("Auth check in handlePlayerDeath - user:", user);
      } catch (err) {
        console.error("Auth check error:", err);
      }
    };
    
    checkAuth();
    
    // Record the stats
    gameStatsClient.recordMatch(stats)
      .then(() => {
        console.log("Death stats recorded successfully");
      })
      .catch(err => {
        console.error("Error recording death stats:", err);
      });
  };

  // Function to test database connection
  const handleTestConnection = async () => {
    try {
      const result = await testDatabaseConnection();
      console.log("Database connection test result:", result);
      alert(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error("Error testing database connection:", error);
      alert("Error: " + JSON.stringify(error, null, 2));
    }
  };

  // Function to toggle force local storage only mode
  const toggleForceLocalStorage = () => {
    const currentValue = localStorage.getItem('forceLocalStorage') === 'true';
    const newValue = !currentValue;
    localStorage.setItem('forceLocalStorage', newValue.toString());
    console.log(`Force local storage only mode ${newValue ? 'enabled' : 'disabled'}`);
    alert(`Force local storage only mode ${newValue ? 'enabled' : 'disabled'}`);
  };

  // Function to display stats
  const handleShowStats = () => {
    displayStats();
  };

  // Add a hotkey to toggle debug mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Shift + D to toggle debug mode
      if (e.shiftKey && e.key === 'D') {
        setShowDebug(prev => !prev);
      }
      
      // S key to show stats
      if (e.key === 's' || e.key === 'S') {
        handleShowStats();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // For online mode (multiplayer)
  useEffect(() => {
    if (!isOnlineMode && !forceOnlineMode) return;
    if (!playerId) return;
    
    const handleDisconnect = () => {
      console.log("Disconnected from server");
      
      // When disconnected, record stats if we were connected
      if (isConnected && playerSnake) {
        // Calculate play time 
        const currentTime = Date.now();
        const startTimeFromState = gameStartTime;
        const startTimeFromStorage = parseInt(localStorage.getItem('gameStartTime') || '0');
        const effectiveStartTime = startTimeFromState || startTimeFromStorage;
        
        if (effectiveStartTime) {
          const playTimeSeconds = Math.floor((currentTime - effectiveStartTime) / 1000);
          
          // Record match stats
          const stats: GameStats = {
            score: playerSnake.score,
            snakeLength: playerSnake.segments.length,
            playTime: playTimeSeconds,
            isMultiplayer: true, // Ensure this is always true for multiplayer
            kills: playerSnake.kills || 0,
            position: playerRank
          };
          
          console.log("Recording multiplayer game stats:", JSON.stringify(stats));
          
          gameStatsClient.recordMatch(stats)
            .then(() => {
              console.log("Multiplayer stats recorded successfully");
              localStorage.removeItem('gameStartTime');
              setGameStartTime(0);
            })
            .catch(err => {
              console.error("Error recording multiplayer stats:", err);
            });
        }
      }
    };

    // Set the start time when connecting to multiplayer
    if (!gameStartTime) {
      const startTime = Date.now();
      setGameStartTime(startTime);
      localStorage.setItem('gameStartTime', startTime.toString());
      console.log("Multiplayer game start time set:", startTime);
    }

    // Add disconnect listener
    gameSocketClient.addConnectionListener((connected) => {
      if (!connected && isConnected) {
        handleDisconnect();
      }
      setIsConnected(connected);
    });

    return () => {
      // Clean up the listener
      handleDisconnect();
    };
  }, [isOnlineMode, forceOnlineMode, playerId, playerSnake, gameStartTime, isConnected, playerRank]);

  // Track player's snake and rank in multiplayer mode
  useEffect(() => {
    if (!isOnlineMode && !forceOnlineMode) return;
    if (!gameState || !playerId) return;
    
    // Find the player's snake
    const snake = gameState.snakes.find(s => s.id === playerId);
    if (snake) {
      setPlayerSnake(snake);
      
      // Get the player's rank
      const rank = gameState.leaderboard.findIndex(item => item.id === playerId) + 1;
      setPlayerRank(rank > 0 ? rank : undefined);
    }
  }, [isOnlineMode, forceOnlineMode, gameState, playerId]);

  // Update effects for multiplayer UI
  useEffect(() => {
    if (isOnlineMode) {
      // Set up kill feed listener
      const handleKillEvent = (data: any) => {
        // Create a meaningful kill message
        let message = "";
        
        if (data.killerName && data.victimName) {
          // New format from server with more details
          message = `${data.killerName} eliminated ${data.victimName}`;
        } else {
          // Fallback to old format
          message = `${data.victimName} was eliminated`;
        }
        
        // Add the new kill message to the feed with animation class
        setKillFeed(prev => [...prev, { message, timestamp: Date.now(), animateClass: 'animate-fadeOut' }]);
        
        // Remove old messages after 6 seconds
        setTimeout(() => {
          setKillFeed(prev => {
            if (prev.length > 0) {
              const [oldest, ...rest] = prev;
              // Don't remove error messages automatically
              if (oldest.isError) {
                return prev;
              }
              return rest;
            }
            return prev;
          });
        }, 6000);
      };
      
      // Add kill event listener
      gameSocketClient.addKillListener(handleKillEvent);
      
      // Update player count based on game state
      if (gameState) {
        setPlayerCount(gameState.snakes.filter(snake => snake.alive).length);
      }
      
      // Clean up event listener
      return () => {
        gameSocketClient.removeKillListener(handleKillEvent);
      };
    }
  }, [isOnlineMode, gameState]);

  // Show tutorial for first-time players
  useEffect(() => {
    // Always show tutorial on initial component mount
    setShowTutorial(true);
    
    // Store that user has seen tutorial
    if (!localStorage.getItem('hasTutorialBeenSeen')) {
      localStorage.setItem('hasTutorialBeenSeen', 'true');
    }
  }, []);

  // Add a method to toggle tutorial
  const toggleTutorial = useCallback(() => {
    setShowTutorial(prev => !prev);
  }, []);

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden">
      {/* Header with player name */}
      <div className="flex items-center justify-between bg-gradient-to-r from-indigo-900/70 to-purple-900/70 backdrop-blur-md shadow-lg border-b border-indigo-500/30 p-4">
        <div className="flex items-center">
          <h1 className="text-xl font-bold text-white">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400">
              Snake.io
            </span>
          </h1>
          {(isOnlineMode || forceOnlineMode) && (
            <div className="ml-2 flex items-center space-x-1 bg-indigo-600/50 px-2 py-1 rounded-full text-white text-xs">
              <Users size={12} />
              <span>Multiplayer</span>
            </div>
          )}
        </div>
        <div className="flex items-center">
          <div className="text-white mr-2">Playing as:</div>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="bg-indigo-900/50 border border-indigo-400/30 rounded px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="Enter your name"
          />
        </div>
      </div>
      
      {/* Tutorial toggle button */}
      <button 
        onClick={toggleTutorial}
        className="absolute top-20 right-4 z-10 bg-indigo-800/40 hover:bg-indigo-700/60 text-white rounded-full p-2"
        title="Show Tutorial"
      >
        <Info size={16} />
      </button>
      
      {/* Game canvas */}
      <div className="flex-1 relative">
        <canvas 
          ref={canvasRef} 
          className="w-full h-full" 
        />
        
        {/* Show tutorial overlay */}
        {showTutorial && <TutorialOverlay onClose={() => setShowTutorial(false)} />}
        
        {/* Multiplayer components - only show when in multiplayer mode */}
        {(isOnlineMode || forceOnlineMode) && (
          <>
            {/* Player count display */}
            <div className="absolute top-4 right-4 p-2 bg-black/70 rounded-lg text-white flex items-center gap-2 z-10">
              <Users size={16} />
              <span>{playerCount}</span>
            </div>
            
            {/* Kill feed */}
            <div className="absolute top-20 right-4 flex flex-col gap-2 z-10 max-w-[300px]">
              {killFeed.map((item, index) => (
                <div 
                  key={item.timestamp + index} 
                  className={`p-2 ${item.isError 
                    ? 'bg-red-900/90 border border-red-500' 
                    : 'bg-black/80'} text-white rounded-md ${item.animateClass || ''}`}
                >
                  {item.message}
                  {item.isError && (
                    <button 
                      onClick={() => {
                        setKillFeed(prev => prev.filter((_, i) => i !== index));
                      }}
                      className="ml-2 text-xs text-red-300 hover:text-white"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              ))}
            </div>
            
            {/* Leaderboard */}
            <Leaderboard
              playerCount={playerCount}
            />
            
            {/* Toggle chat button */}
            <button 
              onClick={() => setShowChat(!showChat)}
              className="absolute bottom-20 right-4 p-2 bg-black/70 text-white rounded-md z-10 hover:bg-black/90 transition-colors"
            >
              {showChat ? "Hide Chat" : "Show Chat"}
            </button>
            
            {/* Chat box */}
            {showChat && (
              <ChatBox 
                visible={showChat}
                onClose={() => setShowChat(false)}
              />
            )}
          </>
        )}

        {/* Multiplayer mode indicator */}
        {forceOnlineMode && (
          <div className="absolute top-20 left-0 right-0 flex justify-center pointer-events-none z-20">
            <div className="bg-indigo-600 text-white px-4 py-2 rounded-full font-bold flex items-center gap-2 shadow-lg">
              <Users size={16} />
              Multiplayer Mode
              {isConnecting && !isOnlineMode && " - Connecting..."}
            </div>
          </div>
        )}
        
        {/* Improved Game Controls Helper */}
        <div className="absolute bottom-4 left-4 z-10 rounded-lg bg-black/60 backdrop-blur-md border border-indigo-500/30 shadow-xl overflow-hidden">
          <div className="bg-indigo-900/70 px-3 py-1.5">
            <h3 className="text-white font-medium text-sm">Game Controls</h3>
          </div>
          <div className="p-3">
            <ul className="space-y-2 text-sm">
              <li className="flex items-center text-gray-200">
                <div className="w-8 h-6 flex items-center justify-center bg-gray-800 rounded mr-2 text-xs font-mono">
                  WASD
                </div>
                <span>Move snake</span>
              </li>
              <li className="flex items-center text-gray-200">
                <div className="w-8 h-6 flex items-center justify-center bg-gray-800 rounded mr-2 text-xs">
                  <span className="transform rotate-90">⟳</span>
                </div>
                <span>Zoom in/out</span>
              </li>
              <li className="flex items-center text-gray-200">
                <div className="w-8 h-6 flex items-center justify-center bg-gray-800 rounded mr-2 text-xs font-mono">
                  Space
                </div>
                <span>Boost speed</span>
              </li>
              {!isOnlineMode && (
                <li className="flex items-center text-gray-200">
                  <div className="w-8 h-6 flex items-center justify-center bg-gray-800 rounded mr-2 text-xs">
                    🖱️
                  </div>
                  <span>Alternative movement</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Mini Map */}
        <div className="absolute bottom-4 right-4 z-10 w-48 h-48 bg-black/60 backdrop-blur-md border border-indigo-500/30 rounded-lg shadow-xl overflow-hidden">
          <div className="bg-indigo-900/70 px-3 py-1.5 flex justify-between items-center">
            <h3 className="text-white font-medium text-sm">Mini Map</h3>
            <div className="text-xs text-indigo-200">
              {Math.round(zoom * 100)}% zoom
            </div>
          </div>
          <div className="relative w-full h-[calc(100%-32px)] bg-indigo-950/50 p-1">
            {/* Map border - always visible */}
            <div className="absolute inset-1 border border-indigo-500/30 rounded"></div>
            
            {/* Grid background for mini-map */}
            <div className="absolute inset-1 grid grid-cols-10 grid-rows-10 pointer-events-none">
              {[...Array(100)].map((_, i) => (
                <div 
                  key={i} 
                  className="border border-indigo-500/10"
                ></div>
              ))}
            </div>
            
            {/* Display map content regardless of gameState */}
            <>
              {/* Food dots */}
              {(gameState?.foods || []).map((food) => {
                const x = (food.position.x / (forceOnlineMode ? MAP_WIDTH*1.5 : MAP_WIDTH)) * 100;
                const y = (food.position.y / (forceOnlineMode ? MAP_HEIGHT*1.5 : MAP_HEIGHT)) * 100;
                return (
                  <div 
                    key={food.id}
                    className="absolute w-1 h-1 rounded-full bg-yellow-400"
                    style={{ 
                      left: `${x}%`, 
                      top: `${y}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                  ></div>
                );
              })}
              
              {/* Power-ups */}
              {(gameState?.powerUps || []).map((powerUp) => {
                const x = (powerUp.position.x / (forceOnlineMode ? MAP_WIDTH*1.5 : MAP_WIDTH)) * 100;
                const y = (powerUp.position.y / (forceOnlineMode ? MAP_HEIGHT*1.5 : MAP_HEIGHT)) * 100;
                return (
                  <div 
                    key={powerUp.id}
                    className="absolute w-2 h-2 rounded-full bg-purple-500 animate-pulse"
                    style={{ 
                      left: `${x}%`, 
                      top: `${y}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                  ></div>
                );
              })}
              
              {/* Snakes - Get from gameEngine if not in online mode */}
              {(gameState?.snakes || (gameEngine ? gameEngine.getState().snakes : [])).filter(snake => snake.alive).map((snake) => {
                const head = snake.segments[0];
                const x = (head.x / (forceOnlineMode ? MAP_WIDTH*1.5 : MAP_WIDTH)) * 100;
                const y = (head.y / (forceOnlineMode ? MAP_HEIGHT*1.5 : MAP_HEIGHT)) * 100;
                const isPlayerSnake = snake.id === playerId;
                return (
                  <div 
                    key={snake.id}
                    className={`absolute w-2 h-2 rounded-full ${isPlayerSnake ? 'bg-cyan-400 ring-2 ring-white' : 'bg-red-500'}`}
                    style={{ 
                      left: `${x}%`, 
                      top: `${y}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                  ></div>
                );
              })}
              
              {/* Visible area indicator - works with playerSnake from either source */}
              {playerSnake && playerSnake.segments.length > 0 && (
                <div
                  className="absolute border-2 border-white/50 rounded pointer-events-none"
                  style={{
                    left: `${(playerSnake.segments[0].x / (forceOnlineMode ? MAP_WIDTH*1.5 : MAP_WIDTH)) * 100}%`,
                    top: `${(playerSnake.segments[0].y / (forceOnlineMode ? MAP_HEIGHT*1.5 : MAP_HEIGHT)) * 100}%`,
                    width: `${(canvasSize.width / (forceOnlineMode ? MAP_WIDTH*1.5 : MAP_WIDTH)) * 100 / zoom}%`,
                    height: `${(canvasSize.height / (forceOnlineMode ? MAP_HEIGHT*1.5 : MAP_HEIGHT)) * 100 / zoom}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                ></div>
              )}
            </>
          </div>
        </div>

        {/* Sound control - moved slightly up to not overlap with mini-map */}
        <div className="absolute bottom-56 right-4 z-10">
          <SoundControl />
        </div>
        
        {/* Stats button - always visible */}
        <button
          onClick={handleShowStats}
          className="absolute top-4 right-4 bg-indigo-900/70 hover:bg-indigo-800/80 text-white px-3 py-1 rounded text-sm font-medium"
        >
          View Stats
        </button>
        
        {/* Debug buttons (press Shift+D to show) */}
        {showDebug && (
          <div className="absolute top-4 left-4 p-2 bg-black/70 backdrop-blur-sm rounded-md z-50">
            <h3 className="text-white text-xs font-bold mb-2">Debug Tools</h3>
            <div className="flex flex-col gap-2">
              <button 
                onClick={handleTestConnection}
                className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
              >
                Test DB Connection
              </button>
              <button 
                onClick={toggleForceLocalStorage}
                className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
              >
                Toggle Force Local Storage
              </button>
              <button 
                onClick={handleShowStats}
                className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
              >
                Show Stats
              </button>
            </div>
            <div className="mt-2 text-xs text-gray-400">Press Shift+D to hide</div>
          </div>
        )}
        
        {/* Game status indicators */}
        <div className="absolute top-20 right-4 px-3 py-2 rounded-lg bg-black/50 backdrop-blur-sm text-xs font-medium">
          <div className="flex flex-col gap-2">
            {isConnecting ? (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
                <span className="text-yellow-500">Connecting...</span>
              </div>
            ) : isOnlineMode ? (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-green-500">Online Mode</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-blue-500">Local Mode</span>
              </div>
            )}
            
            <div className="flex items-center justify-between gap-4">
              <span className="text-white">Zoom:</span>
              
              <div className="flex gap-2">
                <button 
                  onClick={handleZoomOut}
                  className="w-6 h-6 flex items-center justify-center bg-gray-800 rounded hover:bg-gray-700"
                >
                  <span className="text-white">-</span>
                </button>
                <button 
                  onClick={handleZoomIn}
                  className="w-6 h-6 flex items-center justify-center bg-gray-800 rounded hover:bg-gray-700"
                >
                  <span className="text-white">+</span>
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default GameCanvas; 