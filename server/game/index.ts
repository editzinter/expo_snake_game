import { Server as HTTPServer } from 'http';
import { Server as WebSocketServer } from 'socket.io';
import { GameEngine } from '../../lib/game/engine';
import { PlayerInput, GameState } from '../../lib/game/models';

// This will be our server-side game instance
let gameEngine: GameEngine | null = null;

// Track connected players with their socket IDs
const connectedPlayers: Map<string, { socketId: string, playerId: string }> = new Map();

/**
 * Server Optimization Strategy:
 * 
 * 1. Efficient Server Logic:
 *    - Implement spatial partitioning (quadtree/spatial hash) to improve collision detection
 *    - Only process interactions between entities that are close to each other
 *    - Minimize object creation during update cycles to reduce GC pressure
 * 
 * 2. Network Traffic Optimization:
 *    - Send delta updates instead of full game state when possible
 *    - Implement view culling to only send data for entities near each player
 *    - Use binary formats instead of JSON for smaller payloads
 *    - Batch updates to reduce packet overhead
 * 
 * 3. Load Management:
 *    - Adjust tick rate based on server load (dynamic scaling)
 *    - Implement graceful degradation under high load
 *    - Use worker threads for CPU-intensive calculations
 */

// Start the game server
export function initGameServer(httpServer: HTTPServer) {
  const io = new WebSocketServer(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? false 
        : ['http://localhost:3000', 'http://localhost:3001', 'http://192.168.29.247:3001', 'http://192.168.29.247:3002'],  // Include IP address endpoints
      methods: ['GET', 'POST'],
    },
  });

  // Create a new game engine instance
  gameEngine = new GameEngine(4000, 4000); // Larger world for multiplayer

  // Set up game event listeners
  gameEngine.addEventListener((event, data) => {
    // Handle game events
    switch (event) {
      case 'playerDeath':
        if (data && data.playerId) {
          // Find the socket ID for this player
          for (const [socketId, playerData] of Array.from(connectedPlayers.entries())) {
            if (playerData.playerId === data.playerId) {
              // Emit death event to this player
              io.to(socketId).emit('playerDeath', {
                cause: data.cause || 'unknown',
                position: data.position || 0,
                score: data.score || 0,
                playTime: data.playTime || 0
              });
              break;
            }
          }
        }
        break;
      case 'playerKill':
        if (data && data.killerId && data.victimId) {
          // Get the names of the victim and killer
          const state = gameEngine!.getState();
          const killerSnake = state.snakes.find(s => s.id === data.killerId);
          const victimSnake = state.snakes.find(s => s.id === data.victimId);
          
          if (killerSnake && victimSnake) {
            // Broadcast the kill event to all clients for kill feed
            io.emit('playerKill', {
              killerId: data.killerId,
              killerName: killerSnake.name,
              victimId: data.victimId,
              victimName: victimSnake.name || 'Unknown',
              score: data.score || 0
            });
          }
          
          // Also send private event to the killer (original behavior)
          for (const [socketId, playerData] of Array.from(connectedPlayers.entries())) {
            if (playerData.playerId === data.killerId) {
              // Emit kill event to the killer
              io.to(socketId).emit('playerKill', {
                victimId: data.victimId,
                victimName: data.victimName || 'Unknown',
                score: data.score || 0
              });
              break;
            }
          }
        }
        break;
      // Handle other game events as needed
    }
  });

  // Set up tick rate (30 updates per second)
  // OPTIMIZATION: This could be adjusted dynamically based on server load
  const TICK_RATE = 1000 / 30;
  
  // Game update loop
  setInterval(() => {
    if (gameEngine) {
      // OPTIMIZATION: The update call should use efficient algorithms internally
      // such as spatial partitioning for collision detection
      gameEngine.update(TICK_RATE);
      
      // Get the current game state
      const state = gameEngine.getState();
      
      // OPTIMIZATION: Instead of broadcasting the full state to everyone,
      // we should implement view culling and only send relevant parts of the state
      // to each client based on their position
      io.emit('gameState', state);
      
      // Send leaderboard updates less frequently (every 5 ticks)
      // OPTIMIZATION: Reduce frequency of non-critical updates
      if (Math.random() < 0.2) { // ~20% chance each tick, or roughly every 5 ticks on average
        io.emit('leaderboardUpdate', state.leaderboard);
      }
    }
  }, TICK_RATE);

  // Handle socket connections
  io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);
    
    let playerId: string | null = null;
    
    // Handle player joining the game
    socket.on('joinGame', (playerName: string) => {
      if (!gameEngine) return;
      
      // Create a new player
      playerId = gameEngine.addPlayer(playerName || `Player_${socket.id.substring(0, 5)}`);
      
      // Track the player in our map
      connectedPlayers.set(socket.id, { socketId: socket.id, playerId });
      
      // Send the player ID back to the client
      socket.emit('playerJoined', { playerId });
      
      console.log(`Player ${playerId} (${playerName}) joined the game`);
      
      // Broadcast to all clients that a new player joined (for chat or notifications)
      socket.broadcast.emit('playerJoinedGame', {
        id: playerId,
        name: playerName || `Player_${socket.id.substring(0, 5)}`
      });
    });
    
    // Handle player input
    // OPTIMIZATION: Validate and rate-limit input to prevent flooding
    socket.on('playerInput', (input: PlayerInput) => {
      if (!gameEngine || !playerId) return;
      
      // Validate that the input is from the correct player
      if (input.id === playerId) {
        gameEngine.handlePlayerInput(input);
      }
    });
    
    // Handle player name change
    socket.on('changeName', ({ id, name }: { id: string, name: string }) => {
      if (!gameEngine || !playerId || id !== playerId) return;
      
      // Get the current game state
      const state = gameEngine.getState();
      
      // Find the player's snake
      const snake = state.snakes.find(s => s.id === playerId);
      if (snake) {
        // Update the name
        snake.name = name;
        console.log(`Player ${playerId} changed name to ${name}`);
        
        // Broadcast the name change to all clients
        io.emit('playerNameChanged', { id: playerId, name });
      }
    });
    
    // Handle boost activation
    socket.on('activateBoost', () => {
      if (!gameEngine || !playerId) return;
      
      // Try to activate boost for this player
      const boostActivated = gameEngine.activateBoost(playerId);
      
      // Let the client know if boost was activated
      if (boostActivated) {
        socket.emit('boostActivated', { 
          playerId, 
          duration: 5 // 5 seconds boost duration
        });
      }
    });
    
    // Handle player disconnection
    socket.on('disconnect', () => {
      if (gameEngine && playerId) {
        // Get player stats before removing
        const state = gameEngine.getState();
        const snake = state.snakes.find(s => s.id === playerId);
        
        if (snake) {
          // Emit final stats for this player
          socket.emit('finalStats', {
            score: snake.score,
            kills: snake.kills || 0,
            rank: gameEngine.getPlayerRank(playerId),
            snakeLength: snake.segments.length
          });
        }
        
        // Remove player from the game
        gameEngine.removePlayer(playerId);
        
        // Remove from connected players map
        connectedPlayers.delete(socket.id);
        
        console.log(`Player ${playerId} disconnected`);
        
        // Broadcast disconnection to all clients
        io.emit('playerLeft', { id: playerId });
        
        playerId = null;
      }
    });
    
    // Handle chat messages
    // OPTIMIZATION: Rate-limit chat messages to prevent spam
    socket.on('chatMessage', ({ message }: { message: string }) => {
      if (!playerId) return;
      
      // Get player name
      const state = gameEngine?.getState();
      const snake = state?.snakes.find(s => s.id === playerId);
      const playerName = snake?.name || 'Unknown';
      
      // Broadcast chat message to all clients
      io.emit('chatMessage', {
        playerId,
        playerName,
        message,
        timestamp: Date.now()
      });
    });
  });

  console.log('Game server initialized');
  return io;
}

// Get the current game state
export function getGameState(): GameState | null {
  if (!gameEngine) return null;
  return gameEngine.getState();
}

// Get the number of connected players
export function getConnectedPlayerCount(): number {
  return connectedPlayers.size;
}

/**
 * Optimization TODO List:
 * 
 * 1. Implement spatial partitioning in the GameEngine class:
 *    - Add quadtree or spatial hash for efficient entity lookup
 *    - Only check collisions between nearby entities
 * 
 * 2. Add view culling to reduce network traffic:
 *    - Create a filtered game state for each player containing only nearby entities
 *    - Send delta updates instead of full state
 * 
 * 3. Implement client-side prediction and reconciliation:
 *    - Allow client to predict movement between server updates
 *    - Server corrects client when predictions are wrong
 * 
 * 4. Rate-limit player actions to prevent server flooding
 * 
 * 5. Implement binary protocol for more efficient network usage
 */

// Add AI players to the game (for testing or to fill the game)
export function addAIPlayer() {
  if (!gameEngine) return null;
  
  const id = gameEngine.addPlayer(`AI_${Math.floor(Math.random() * 1000)}`);
  
  // Set up periodic random movement for the AI player
  const aiInterval = setInterval(() => {
    if (!gameEngine) {
      clearInterval(aiInterval);
      return;
    }
    
    // Get the AI player's snake
    const state = gameEngine.getState();
    const snake = state.snakes.find(s => s.id === id);
    
    if (snake && snake.alive) {
      // Create random direction
      const input: PlayerInput = {
        id,
        direction: {
          x: Math.random() * 2 - 1, // -1 to 1
          y: Math.random() * 2 - 1, // -1 to 1
        }
      };
      
      // Send input to game engine
      gameEngine.handlePlayerInput(input);
    } else {
      // AI player is dead, clean up
      clearInterval(aiInterval);
    }
  }, 500); // AI updates less frequently than real players to reduce server load
  
  return id;
} 