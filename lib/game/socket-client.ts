"use client";

import { io, Socket } from "socket.io-client";
import { GameState, PlayerInput } from "./models";

// Define additional event types
export interface PlayerJoinedEvent {
  playerId: string;
}

export interface PlayerDeathEvent {
  cause: string;
  position: number;
  score: number;
  playTime: number;
}

export interface PlayerKillEvent {
  killerId?: string;
  killerName?: string;
  victimId: string;
  victimName: string;
  score: number;
}

export interface ChatMessageEvent {
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}

export interface FinalStatsEvent {
  score: number;
  kills: number;
  rank: number;
  snakeLength: number;
}

class GameSocketClient {
  private socket: Socket | null = null;
  private playerId: string | null = null;
  private connected: boolean = false;
  private gameStateListeners: ((state: GameState) => void)[] = [];
  private playerJoinedListeners: ((data: PlayerJoinedEvent) => void)[] = [];
  private connectionListeners: ((connected: boolean) => void)[] = [];
  private connectionErrorListeners: ((error: Error) => void)[] = [];
  private deathListeners: ((data: PlayerDeathEvent) => void)[] = [];
  private killListeners: ((data: PlayerKillEvent) => void)[] = [];
  private leaderboardListeners: ((data: any[]) => void)[] = [];
  private chatListeners: ((data: ChatMessageEvent) => void)[] = [];
  private finalStatsListeners: ((data: FinalStatsEvent) => void)[] = [];
  
  // Connect to the WebSocket server
  public connect(): void {
    if (this.socket) return;
    
    // Dynamically determine socket URL - default to env var or localhost if not available
    let socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
    
    // If we're in a browser and no env var is set, determine socket URL based on current origin
    if (typeof window !== 'undefined' && !socketUrl) {
      const windowOrigin = window.location.origin;
      const hostname = window.location.hostname;
      const port = '3002'; // Socket server port
      
      // If we're connecting from an IP address, use that same IP
      if (hostname !== 'localhost' && /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
        socketUrl = `http://${hostname}:${port}`;
      } else {
        socketUrl = `http://localhost:${port}`;
      }
      
      console.log(`Dynamically determined socket URL: ${socketUrl} based on origin: ${windowOrigin}`);
    } else {
      socketUrl = socketUrl || "http://localhost:3002";
    }
    
    try {
      console.log(`Attempting to connect to WebSocket server at ${socketUrl}`);
      
      this.socket = io(socketUrl, {
        transports: ["websocket", "polling"], // Add polling as fallback
        autoConnect: true,
        reconnectionAttempts: 3, // Limit reconnection attempts
        timeout: 10000, // Increase timeout to 10 seconds
        reconnectionDelay: 1000, // 1 second delay between reconnection attempts
      });
      
      // Set up event listeners
      this.setupEventListeners();
    } catch (error) {
      console.error("Error creating socket connection:", error);
      this.connected = false;
      this.notifyConnectionListeners();
      this.notifyConnectionErrorListeners(error instanceof Error ? error : new Error(String(error)));
    }
  }
  
  // Set up WebSocket event listeners
  private setupEventListeners(): void {
    if (!this.socket) return;
    
    // Handle connection
    this.socket.on("connect", () => {
      console.log("Connected to game server");
      this.connected = true;
      this.notifyConnectionListeners();
    });
    
    // Handle disconnection
    this.socket.on("disconnect", () => {
      console.log("Disconnected from game server");
      this.connected = false;
      this.notifyConnectionListeners();
    });
    
    // Handle connection error
    this.socket.on("connect_error", (error: Error) => {
      console.error("Connection error:", error);
      this.connected = false;
      this.notifyConnectionListeners();
      this.notifyConnectionErrorListeners(error);
    });
    
    // Handle player joining
    this.socket.on("playerJoined", (data: PlayerJoinedEvent) => {
      console.log("Joined game with ID:", data.playerId);
      this.playerId = data.playerId;
      this.notifyPlayerJoinedListeners(data);
    });
    
    // Handle game state updates
    this.socket.on("gameState", (state: GameState) => {
      this.notifyGameStateListeners(state);
    });
    
    // Handle player death event
    this.socket.on("playerDeath", (data: PlayerDeathEvent) => {
      console.log("Player death event received:", data);
      this.notifyDeathListeners(data);
    });
    
    // Handle player kill event
    this.socket.on("playerKill", (data: PlayerKillEvent) => {
      console.log("Player kill event received:", data);
      this.notifyKillListeners(data);
    });
    
    // Handle leaderboard updates
    this.socket.on("leaderboardUpdate", (leaderboard: any[]) => {
      this.notifyLeaderboardListeners(leaderboard);
    });
    
    // Handle chat messages
    this.socket.on("chatMessage", (data: ChatMessageEvent) => {
      console.log("Chat message received:", data);
      this.notifyChatListeners(data);
    });
    
    // Handle final stats (sent when player dies or disconnects)
    this.socket.on("finalStats", (data: FinalStatsEvent) => {
      console.log("Final stats received:", data);
      this.notifyFinalStatsListeners(data);
    });
  }
  
  // Join the game
  public joinGame(playerName: string): void {
    if (!this.socket || !this.connected) {
      console.error("Not connected to server");
      return;
    }
    
    this.socket.emit("joinGame", playerName);
  }
  
  // Send player input to the server
  public sendInput(direction: { x: number, y: number }): void {
    if (!this.socket || !this.connected || !this.playerId) {
      return;
    }
    
    const input: PlayerInput = {
      id: this.playerId,
      direction,
    };
    
    this.socket.emit("playerInput", input);
  }
  
  // Change player name
  public changeName(name: string): void {
    if (!this.socket || !this.connected || !this.playerId) {
      return;
    }
    
    this.socket.emit("changeName", { id: this.playerId, name });
  }
  
  // Activate boost
  public activateBoost(): void {
    if (!this.socket || !this.connected || !this.playerId) {
      return;
    }
    
    this.socket.emit("activateBoost");
  }
  
  // Send chat message
  public sendChatMessage(message: string): void {
    if (!this.socket || !this.connected || !this.playerId) {
      return;
    }
    
    this.socket.emit("chatMessage", { message });
  }
  
  // Disconnect from the server
  public disconnect(): void {
    if (!this.socket) return;
    
    this.socket.disconnect();
    this.socket = null;
    this.playerId = null;
    this.connected = false;
  }
  
  // Add listener for game state updates
  public addGameStateListener(listener: (state: GameState) => void): void {
    this.gameStateListeners.push(listener);
  }
  
  // Remove listener for game state updates
  public removeGameStateListener(listener: (state: GameState) => void): void {
    this.gameStateListeners = this.gameStateListeners.filter(l => l !== listener);
  }
  
  // Add listener for player joined event
  public addPlayerJoinedListener(listener: (data: PlayerJoinedEvent) => void): void {
    this.playerJoinedListeners.push(listener);
  }
  
  // Remove listener for player joined event
  public removePlayerJoinedListener(listener: (data: PlayerJoinedEvent) => void): void {
    this.playerJoinedListeners = this.playerJoinedListeners.filter(l => l !== listener);
  }
  
  // Add listener for connection status changes
  public addConnectionListener(listener: (connected: boolean) => void): void {
    this.connectionListeners.push(listener);
  }
  
  // Remove listener for connection status changes
  public removeConnectionListener(listener: (connected: boolean) => void): void {
    this.connectionListeners = this.connectionListeners.filter(l => l !== listener);
  }
  
  // Add listener for player death events
  public addDeathListener(listener: (data: PlayerDeathEvent) => void): void {
    this.deathListeners.push(listener);
  }
  
  // Remove listener for player death events
  public removeDeathListener(listener: (data: PlayerDeathEvent) => void): void {
    this.deathListeners = this.deathListeners.filter(l => l !== listener);
  }
  
  // Add listener for player kill events
  public addKillListener(listener: (data: PlayerKillEvent) => void): void {
    this.killListeners.push(listener);
  }
  
  // Remove listener for player kill events
  public removeKillListener(listener: (data: PlayerKillEvent) => void): void {
    this.killListeners = this.killListeners.filter(l => l !== listener);
  }
  
  // Add listener for leaderboard updates
  public addLeaderboardListener(listener: (leaderboard: any[]) => void): void {
    this.leaderboardListeners.push(listener);
  }
  
  // Remove listener for leaderboard updates
  public removeLeaderboardListener(listener: (leaderboard: any[]) => void): void {
    this.leaderboardListeners = this.leaderboardListeners.filter(l => l !== listener);
  }
  
  // Add listener for chat messages
  public addChatListener(listener: (data: ChatMessageEvent) => void): void {
    this.chatListeners.push(listener);
  }
  
  // Remove listener for chat messages
  public removeChatListener(listener: (data: ChatMessageEvent) => void): void {
    this.chatListeners = this.chatListeners.filter(l => l !== listener);
  }
  
  // Add listener for final stats
  public addFinalStatsListener(listener: (data: FinalStatsEvent) => void): void {
    this.finalStatsListeners.push(listener);
  }
  
  // Remove listener for final stats
  public removeFinalStatsListener(listener: (data: FinalStatsEvent) => void): void {
    this.finalStatsListeners = this.finalStatsListeners.filter(l => l !== listener);
  }
  
  // Add listener for connection errors
  public addConnectionErrorListener(listener: (error: Error) => void): void {
    this.connectionErrorListeners.push(listener);
  }
  
  // Remove listener for connection errors
  public removeConnectionErrorListener(listener: (error: Error) => void): void {
    this.connectionErrorListeners = this.connectionErrorListeners.filter(l => l !== listener);
  }
  
  // Notify all game state listeners
  private notifyGameStateListeners(state: GameState): void {
    this.gameStateListeners.forEach(listener => listener(state));
  }
  
  // Notify all player joined listeners
  private notifyPlayerJoinedListeners(data: PlayerJoinedEvent): void {
    this.playerJoinedListeners.forEach(listener => listener(data));
  }
  
  // Notify all connection listeners
  private notifyConnectionListeners(): void {
    this.connectionListeners.forEach(listener => listener(this.connected));
  }
  
  // Notify all death listeners
  private notifyDeathListeners(data: PlayerDeathEvent): void {
    this.deathListeners.forEach(listener => listener(data));
  }
  
  // Notify all kill listeners
  private notifyKillListeners(data: PlayerKillEvent): void {
    this.killListeners.forEach(listener => listener(data));
  }
  
  // Notify all leaderboard listeners
  private notifyLeaderboardListeners(leaderboard: any[]): void {
    this.leaderboardListeners.forEach(listener => listener(leaderboard));
  }
  
  // Notify all chat listeners
  private notifyChatListeners(data: ChatMessageEvent): void {
    this.chatListeners.forEach(listener => listener(data));
  }
  
  // Notify all final stats listeners
  private notifyFinalStatsListeners(data: FinalStatsEvent): void {
    this.finalStatsListeners.forEach(listener => listener(data));
  }
  
  // Notify all connection error listeners
  private notifyConnectionErrorListeners(error: Error): void {
    this.connectionErrorListeners.forEach(listener => listener(error));
  }
  
  // Get the player ID
  public getPlayerId(): string | null {
    return this.playerId;
  }
  
  // Check if connected to the server
  public isConnected(): boolean {
    return this.connected;
  }
}

// Create a singleton instance
export const gameSocketClient = new GameSocketClient(); 