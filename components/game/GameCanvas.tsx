"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useTheme } from "next-themes";
import { GameEngine } from "@/lib/game/engine";
import { GameRenderer } from "@/components/game/GameRenderer";
import { Snake, PlayerInput, GameState } from "@/lib/game/models";
import { v4 as uuidv4 } from "uuid";
import { gameSocketClient } from "@/lib/game/socket-client";
import { soundManager } from "@/lib/audio/SoundManager";
import SoundControl from "./SoundControl";
import { GameEventType } from '@/lib/game/engine';
import { gameStatsClient, GameStats, testDatabaseConnection, displayStats } from "@/lib/game/stats-client";
import { createBrowserClient } from "@supabase/ssr";
import { Users } from "lucide-react";
import Leaderboard from './Leaderboard';
import ChatBox from './ChatBox';

interface GameCanvasProps {
  width?: number;
  height?: number;
  onPlayerNameChange?: (name: string) => void;
  forceOnlineMode?: boolean;
}

// Constants for game configuration
const MAP_WIDTH = 6000; // Larger map for more exploration
const MAP_HEIGHT = 6000;

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
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  
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
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        
        // Try session check first (most reliable)
        const { data: sessionData } = await supabase.auth.getSession();
        console.log("Initial auth check - session exists:", !!sessionData?.session);
        
        if (sessionData?.session?.user?.id) {
          // User is definitely logged in - remember this
          localStorage.setItem('userHasAuthenticated', 'true');
          console.log("User authenticated, saved to local storage");
        }
        
        // Also try user check as fallback
        const { data: userData } = await supabase.auth.getUser();
        console.log("Initial auth check - user exists:", !!userData?.user);
        
        if (userData?.user?.id) {
          // User is definitely logged in - remember this
          localStorage.setItem('userHasAuthenticated', 'true');
          console.log("User authenticated (from getUser), saved to local storage");
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

  // Handle mouse lock for better control
  const requestPointerLock = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    if (!isPointerLocked) {
      canvas.requestPointerLock = canvas.requestPointerLock || 
                               (canvas as any).mozRequestPointerLock || 
                               (canvas as any).webkitRequestPointerLock;
      
      canvas.requestPointerLock();
    }
  }, [isPointerLocked]);
  
  // Update pointer lock state based on document state
  useEffect(() => {
    const handlePointerLockChange = () => {
      setIsPointerLocked(
        document.pointerLockElement === canvasRef.current ||
        (document as any).mozPointerLockElement === canvasRef.current ||
        (document as any).webkitPointerLockElement === canvasRef.current
      );
    };
    
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('mozpointerlockchange', handlePointerLockChange);
    document.addEventListener('webkitpointerlockchange', handlePointerLockChange);
    
    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('mozpointerlockchange', handlePointerLockChange);
      document.removeEventListener('webkitpointerlockchange', handlePointerLockChange);
    };
  }, []);
  
  // Unlock pointer when player dies
  const unlockPointer = useCallback(() => {
    if (document.exitPointerLock) {
      document.exitPointerLock();
    } else if ((document as any).mozExitPointerLock) {
      (document as any).mozExitPointerLock();
    } else if ((document as any).webkitExitPointerLock) {
      (document as any).webkitExitPointerLock();
    }
    setIsPointerLocked(false);
  }, []);

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

      // Calculate mouse movement based on pointer lock status
      let mouseX, mouseY;
      
      if (isPointerLocked) {
        // When pointer is locked, use movement deltas
        const state = isOnlineMode ? gameState : gameEngine?.getState();
        const playerSnake = state?.snakes.find(snake => snake.id === playerId);
        
        if (playerSnake && playerSnake.alive) {
          // Use movement deltas for direction when locked
          const direction = {
            x: e.movementX,
            y: e.movementY,
          };
          
          // Send input based on game mode
          if (isOnlineMode) {
            gameSocketClient.sendInput(direction);
          } else if (gameEngine) {
            const input: PlayerInput = {
              id: playerId,
              direction,
            };
            gameEngine.handlePlayerInput(input);
          }
        }
      } else {
        // Get mouse position relative to canvas when not locked
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;

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
  }, [isInitialized, gameEngine, playerId, isOnlineMode, gameState, isPointerLocked]);

  // Store the start time in state and localStorage when game is initialized
  useEffect(() => {
    if (isInitialized && !gameStartTime) {
      const startTime = Date.now();
      setGameStartTime(startTime);
      localStorage.setItem('gameStartTime', startTime.toString());
      console.log("Game start time set:", startTime);
    }
  }, [isInitialized, gameStartTime]);

  // Define handlePlayerDeath earlier
  const handlePlayerDeath = () => {
    if (!playerId || !gameStartTime) return;
    
    console.log("handlePlayerDeath called");
    
    // Unlock pointer when player dies
    unlockPointer();
    
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
    
    // Record the stats
    gameStatsClient.recordMatch(stats)
      .then(() => {
        console.log("Death stats recorded successfully");
      })
      .catch(err => {
        console.error("Error recording death stats:", err);
      });
  };

  // Game loop for local mode
  useEffect(() => {
    // Skip if using online mode
    if (isOnlineMode) return;
    if (!isInitialized || !gameEngine || !gameRenderer || !playerId) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Add keyboard event listener for boost activation
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && playerId && gameEngine) {
        e.preventDefault();
        e.stopPropagation();
        
        // Activate boost (this will check energy internally)
        gameEngine.activateBoost(playerId);
      }
    };
    
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
      
      // Record match stats
      const stats: GameStats = {
        score: snake.score,
        snakeLength: snake.segments.length,
        playTime: playTimeSeconds,
        isMultiplayer: forceOnlineMode || isOnlineMode,
        kills: snake.kills || 0, 
        position: gameEngine?.getPlayerRank(playerId) || undefined
      };
      
      console.log("Recording game stats:", JSON.stringify(stats));
      
      // Record the match
      gameStatsClient.recordMatch(stats)
        .then(() => {
          console.log("Stats recorded successfully");
          localStorage.removeItem('gameStartTime');
          setGameStartTime(0);
        })
        .catch(err => {
          console.error("Error recording stats:", err);
        });
    };
    
    // Add event listeners for sound effects and game events
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
          soundManager.playSound('special-food');
          break;
        case 'boostStart':
          // Play boost activation sound
          soundManager.playSound('special-food');
          break;
        case 'boostEnd':
          // Play boost end sound
          soundManager.playSound('special-food');
          break;
      }
      
      if (event === 'playerDeath' && data?.playerId === playerId) {
        handlePlayerDeath();
      }
    };
    
    // Add event listener
    canvas.addEventListener('keydown', handleKeyDown);
    
    // Add game event listener
    gameEngine.addEventListener(handleGameEvent);
    
    // Frame rate limiting variables
    let lastTime = 0;
    let animationFrameId: number;
    let frameCounter = 0;
    const FRAME_SKIP = 1; // Render every other frame (adjust as needed for performance)

    const gameLoop = (timestamp: number) => {
      // Calculate delta time
      const deltaTime = lastTime > 0 ? timestamp - lastTime : 0;
      lastTime = timestamp;

      // Update game state (always update physics)
      gameEngine.update(deltaTime);
      
      // Get the updated state
      const state = gameEngine.getState();
      const playerSnake = state.snakes.find(snake => snake.id === playerId) as Snake;
      
      // Center the view on the player's snake
      if (playerSnake && playerSnake.segments.length > 0) {
        const head = playerSnake.segments[0];
        gameRenderer.setCameraPosition(head.x, head.y);
      }
      
      // Only render every FRAME_SKIP frames for performance
      frameCounter = (frameCounter + 1) % (FRAME_SKIP + 1);
      if (frameCounter === 0) {
        // Pass deltaTime to the renderer
        gameRenderer.render(state, playerSnake, deltaTime);
      }

      // Request next frame
      animationFrameId = requestAnimationFrame(gameLoop);
    };

    // Start game loop
    frameCounter = 0;
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
  }, [isInitialized, gameEngine, gameRenderer, playerId, isOnlineMode, gameStartTime, forceOnlineMode, handlePlayerDeath, unlockPointer]);

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
        
        // Activate boost in online mode
        gameSocketClient.activateBoost();
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
    let frameCounter = 0;
    const FRAME_SKIP = 1; // Render every other frame (adjust as needed for performance)

    const renderLoop = (timestamp: number) => {
      // Calculate delta time
      const deltaTime = lastTime > 0 ? timestamp - lastTime : 0;
      lastTime = timestamp;
      
      // Find player snake
      const playerSnake = gameState.snakes.find(snake => snake.id === playerId);
      
      // Center the view on the player's snake
      if (playerSnake && playerSnake.segments.length > 0) {
        const head = playerSnake.segments[0];
        gameRenderer.setCameraPosition(head.x, head.y);
      }
      
      // Only render every FRAME_SKIP frames for performance
      frameCounter = (frameCounter + 1) % (FRAME_SKIP + 1);
      if (frameCounter === 0) {
        // Pass deltaTime to the renderer for particle animations
        gameRenderer.render(gameState, playerSnake, deltaTime);
      }

      // Request next frame
      animationFrameId = requestAnimationFrame(renderLoop);
    };

    // Start render loop
    frameCounter = 0;
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
  const handleClick = () => {
    if (!isInitialized) return;
    
    // Request pointer lock on click
    requestPointerLock();
    
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
      } else if (gameEngine && playerId) {
        // For local mode, create a new player
        gameEngine.removePlayer(playerId);
        const newId = gameEngine.addPlayer(playerName);
        setPlayerId(newId);
      }
    }
  };

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
      const startTime = Date.now();
      setGameStartTime(startTime);
    }
  }, [playerId, gameEngine]);

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

  return (
    <div className="relative w-full h-full overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 bg-zinc-900 dark:bg-zinc-950 w-full h-full"
        style={{ cursor: isPointerLocked ? 'none' : 'crosshair' }}
        onClick={handleClick}
      />

      {/* Pointer lock indicator */}
      {!isPointerLocked && isInitialized && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/70 text-white px-4 py-2 rounded-lg z-50 pointer-events-none">
          Click to lock mouse and control better
        </div>
      )}

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
      
      {/* Show game controls helper */}
      {showControls && (
        <div className="absolute bottom-4 left-4 px-4 py-3 rounded-lg bg-black/50 backdrop-blur-sm transition-opacity duration-300">
          <div className="text-xs text-white">
            <p className="font-semibold mb-1">Controls:</p>
            <ul className="text-gray-300 space-y-1">
              <li>• Mouse: Move snake</li>
              <li>• Scroll: Zoom in/out</li>
              <li>• Space: Activate boost (when meter is full)</li>
              <li>• Click: Restart (when dead)</li>
            </ul>
          </div>
        </div>
      )}
      
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
      <div className={`absolute top-20 right-4 px-3 py-2 rounded-lg bg-black/50 backdrop-blur-sm text-xs font-medium transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
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
            <span className="text-white">Zoom: {Math.round(zoom * 100)}%</span>
            
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
      
      {/* Sound control */}
      <SoundControl />
    </div>
  );
};

export default GameCanvas; 