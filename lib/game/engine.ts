import { v4 as uuidv4 } from 'uuid';
import {
  GameState,
  Snake,
  Food,
  Point,
  PlayerInput,
  distance,
  normalizeVector,
  createSnake,
  createFood,
  createEmptyGameState,
} from './models';

// Constants for game configuration
const FOOD_COUNT = 500; // Increased food for larger map
const SPECIAL_FOOD_CHANCE = 0.05; // 5% chance for special high-value food
const FOOD_SPAWN_INTERVAL = 50; // ms - spawn food more frequently
const TICK_RATE = 1000 / 60; // 60 fps
const COLLISION_DISTANCE = 10;
const FOOD_COLLISION_DISTANCE = 15;
const BORDER_DANGER_ZONE = 30; // Distance from map edge that is dangerous

// Define event types for sound events
export type GameEventType = 'foodCollect' | 'specialFoodCollect' | 'playerDeath' | 'playerDeathBorder' | 'boostStart' | 'boostEnd' | 'playerKill';
export type GameEventListener = (event: GameEventType, data?: any) => void;

// Define AIController interface
interface AIController {
  snake: Snake;
  update(engine: GameEngine): void;
}

// Function to check if a point is within a grid cell
function getGridCell(x: number, y: number, cellSize: number, worldWidth: number, worldHeight: number): { row: number, col: number } {
  // Ensure coordinates are within world bounds
  const safeX = Math.max(0, Math.min(x, worldWidth - 1));
  const safeY = Math.max(0, Math.min(y, worldHeight - 1));
  
  const col = Math.floor(safeX / cellSize);
  const row = Math.floor(safeY / cellSize);
  
  return { row, col };
}

export class GameEngine {
  private state: GameState;
  private lastTick: number = 0;
  private foodSpawnCounter: number = 0;
  private eventListeners: GameEventListener[] = [];
  private snakes: Snake[] = [];
  private food: Food[] = [];
  private specialFood: Food[] = [];
  private worldWidth: number;
  private worldHeight: number;
  private autoIncrementId: number = 0;
  private lastFoodTime: number = 0;
  private aiControllers: AIController[] = [];
  private spatialGrid: Map<string, Array<{ type: 'snake' | 'food' | 'specialFood', index: number }>> = new Map();
  private cellSize: number = 100; // Size of each grid cell
  
  constructor(width: number, height: number) {
    this.state = createEmptyGameState(width, height);
    this.worldWidth = width;
    this.worldHeight = height;
    
    // Initialize food
    this.spawnInitialFood();
  }
  
  // Add an event listener
  public addEventListener(listener: GameEventListener): void {
    this.eventListeners.push(listener);
  }
  
  // Remove an event listener
  public removeEventListener(listener: GameEventListener): void {
    this.eventListeners = this.eventListeners.filter(l => l !== listener);
  }
  
  // Emit an event to all listeners
  private emitEvent(event: GameEventType, data?: any): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error("Error in game event listener:", error);
      }
    });
  }
  
  // Initialize the game with food
  private spawnInitialFood(): void {
    for (let i = 0; i < FOOD_COUNT; i++) {
      this.spawnFood();
    }
  }
  
  // Spawn a new food at a random position
  private spawnFood(): void {
    const position: Point = {
      x: Math.random() * this.state.width,
      y: Math.random() * this.state.height,
    };
    
    // Create special high-value food occasionally
    const isSpecial = Math.random() < SPECIAL_FOOD_CHANCE;
    const food = createFood(uuidv4(), position);
    
    // Make special food larger, more valuable, and more visually distinct
    if (isSpecial) {
      food.value *= 3; // Triple the value
      food.radius *= 1.5; // 50% larger
      food.glowIntensity = 1.0; // Maximum glow
      food.pulseRate = 3.0; // Fast pulse rate
    }
    
    this.state.foods.push(food);
  }

  // Spawn food at a specific position
  private spawnFoodAt(position: Point, value: number = 1): void {
    const food = createFood(uuidv4(), position);
    
    // Adjust value to passed parameter
    food.value = value;
    
    // Adjust radius based on value
    food.radius = 3 + value;
    
    this.state.foods.push(food);
  }
  
  // Add a new player to the game
  public addPlayer(name: string): string {
    const id = uuidv4();
    
    // Spawn player away from edges with a larger safe zone
    const padding = 300; // Increased from 200
    
    // Try multiple spawn locations to find a safe one
    let attempts = 0;
    let position: Point = {
      x: padding + Math.random() * (this.state.width - padding * 2),
      y: padding + Math.random() * (this.state.height - padding * 2),
    };
    let isSafe = false;
    
    // Keep trying until we find a safe position or reach max attempts
    while (!isSafe && attempts < 10) {
      // Generate a new position each attempt
      position = {
        x: padding + Math.random() * (this.state.width - padding * 2),
        y: padding + Math.random() * (this.state.height - padding * 2),
      };
      
      // Check for proximity to other snakes
      isSafe = true;
      for (const otherSnake of this.state.snakes) {
        if (!otherSnake.alive || otherSnake.segments.length === 0) continue;
        
        // Check distance to other snake's head
        const head = otherSnake.segments[0];
        const dist = Math.sqrt(
          Math.pow(position.x - head.x, 2) + 
          Math.pow(position.y - head.y, 2)
        );
        
        // If too close to another snake, try again
        if (dist < 200) {
          isSafe = false;
          break;
        }
      }
      
      attempts++;
    }
    
    // Create the snake
    const snake = createSnake(id, name, position);
    
    // Save creation time on the snake for accurate play time calculation
    (snake as any).createdAt = Date.now();
    
    // Add to snakes list
    this.state.snakes.push(snake);
    
    // Make sure the snake is initialized with a reasonable non-zero speed
    // This ensures proper movement from the start
    if (snake.speed === 0) {
      snake.speed = 2.5; // Default movement speed
      snake.baseSpeed = 2.5;
    }
    
    return id;
  }
  
  // Remove a player from the game
  public removePlayer(id: string): void {
    this.state.snakes = this.state.snakes.filter(snake => snake.id !== id);
    this.updateLeaderboard();
  }
  
  // Update player direction based on input
  public handlePlayerInput(input: PlayerInput): void {
    const snake = this.state.snakes.find(s => s.id === input.id);
    if (snake && snake.alive) {
      // Get the normalized direction
      const normalizedDirection = normalizeVector(input.direction);
      
      // Adjust speed based on input magnitude - allows for speed control
      const inputMagnitude = Math.sqrt(input.direction.x * input.direction.x + input.direction.y * input.direction.y);
      const speedFactor = Math.min(1, inputMagnitude / 100); // Cap at normal speed
      
      // Calculate base speed (without boost)
      snake.baseSpeed = 2 + speedFactor * 2; // Base speed between 2-4 based on input
      
      // Apply boost if active
      if (snake.isBoosting) {
        snake.speed = snake.baseSpeed * 2; // 2x speed boost
      } else {
        snake.speed = snake.baseSpeed;
      }
      
      // Set direction
      snake.direction = normalizedDirection;
    }
  }
  
  // Activate boost for a player
  public activateBoost(playerId: string): boolean {
    const snake = this.state.snakes.find(s => s.id === playerId);
    if (!snake || !snake.alive || snake.boostMeter < 100 || snake.isBoosting) {
      return false; // Can't boost
    }
    
    // Activate boost
    snake.isBoosting = true;
    snake.speed = snake.baseSpeed * 2; // Double the speed
    snake.boostEndTime = Date.now() + 5000; // 5 seconds from now
    
    // Emit boost start event
    this.emitEvent('boostStart', { playerId: snake.id });
    
    return true;
  }
  
  // Check if boost has ended
  private checkBoostStatus(): void {
    const now = Date.now();
    
    for (const snake of this.state.snakes) {
      if (snake.isBoosting && now >= snake.boostEndTime) {
        // Boost has ended
        snake.isBoosting = false;
        snake.speed = snake.baseSpeed;
        snake.boostMeter = 0; // Reset boost meter
        
        // Emit boost end event
        this.emitEvent('boostEnd', { playerId: snake.id });
      }
    }
  }
  
  // Main game loop - updates game state
  public update(deltaTime: number): void {
    // Only update at the tick rate
    this.lastTick += deltaTime;
    if (this.lastTick < TICK_RATE) return;
    this.lastTick = 0;
    
    // Check boost status
    this.checkBoostStatus();
    
    // Update snakes
    this.updateSnakes(deltaTime);
    
    // Check collisions
    this.checkCollisions();
    
    // Spawn new food periodically
    this.foodSpawnCounter += deltaTime;
    if (this.foodSpawnCounter >= FOOD_SPAWN_INTERVAL) {
      this.foodSpawnCounter = 0;
      if (this.state.foods.length < FOOD_COUNT) {
        this.spawnFood();
      }
    }
    
    // Update leaderboard
    this.updateLeaderboard();
  }
  
  // Update the positions of all snakes
  private updateSnakes(deltaTime: number): void {
    for (const snake of this.state.snakes) {
      if (!snake.alive) continue;
      
      // Calculate movement based on direction and speed
      const movement = {
        x: snake.direction.x * snake.speed,
        y: snake.direction.y * snake.speed,
      };
      
      // Move the head
      const newHead: Point = {
        x: snake.segments[0].x + movement.x,
        y: snake.segments[0].y + movement.y,
      };
      
      // Handle border danger zone and collision
      const isTooCloseToEdge = 
        newHead.x < BORDER_DANGER_ZONE || 
        newHead.x > this.state.width - BORDER_DANGER_ZONE ||
        newHead.y < BORDER_DANGER_ZONE || 
        newHead.y > this.state.height - BORDER_DANGER_ZONE;
      
      // Kill snake if it's in the border danger zone
      if (isTooCloseToEdge) {
        // Before killing the snake, drop food at its location
        this.dropFoodFromSnake(snake);
        
        // Kill the snake
        snake.alive = false;
        
        // Emit death by border event
        this.emitEvent('playerDeathBorder', { playerId: snake.id });
        
        // Skip the rest of this iteration
        continue;
      }
      
      // Add new head to the beginning of segments
      snake.segments.unshift(newHead);
      
      // Remove the last segment (tail) if not growing
      snake.segments.pop();
    }
  }
  
  // Drop food items where a snake died
  private dropFoodFromSnake(snake: Snake): void {
    // Calculate the number of food items to drop based on snake length
    const foodCount = Math.ceil(snake.segments.length / 5); // One food per 5 segments
    
    // Select segments to drop food at, distribute evenly
    const segmentIndices = [];
    for (let i = 0; i < foodCount; i++) {
      const index = Math.floor(i * (snake.segments.length / foodCount));
      segmentIndices.push(index);
    }
    
    // Drop food at selected segments
    for (const index of segmentIndices) {
      const segment = snake.segments[index];
      
      // Small random offset to spread the food out a bit
      const offsetX = (Math.random() - 0.5) * 20;
      const offsetY = (Math.random() - 0.5) * 20;
      
      const position = {
        x: segment.x + offsetX,
        y: segment.y + offsetY
      };
      
      // Food value proportional to snake size
      const value = Math.floor(Math.random() * 2) + 1; // 1-2 value
      
      this.spawnFoodAt(position, value);
    }
    
    // Drop a special high-value food at the head
    if (snake.segments.length > 0) {
      const head = snake.segments[0];
      
      this.spawnFoodAt({
        x: head.x,
        y: head.y
      }, 3); // High value food
    }
  }
  
  // Update the collision detection method to use spatial partitioning
  private updateSpatialGrid(): void {
    // Clear the grid
    this.spatialGrid.clear();
    
    // Add snakes to the grid
    this.state.snakes.forEach((snake, snakeIndex) => {
      if (!snake.alive) return;
      
      snake.segments.forEach(segment => {
        const cell = getGridCell(segment.x, segment.y, this.cellSize, this.worldWidth, this.worldHeight);
        const cellKey = `${cell.row},${cell.col}`;
        
        if (!this.spatialGrid.has(cellKey)) {
          this.spatialGrid.set(cellKey, []);
        }
        
        this.spatialGrid.get(cellKey)!.push({ type: 'snake', index: snakeIndex });
      });
    });
    
    // Add food to the grid
    this.state.foods.forEach((food, foodIndex) => {
      const cell = getGridCell(food.position.x, food.position.y, this.cellSize, this.worldWidth, this.worldHeight);
      const cellKey = `${cell.row},${cell.col}`;
      
      if (!this.spatialGrid.has(cellKey)) {
        this.spatialGrid.set(cellKey, []);
      }
      
      this.spatialGrid.get(cellKey)!.push({ type: 'food', index: foodIndex });
    });
    
    // Add special food to the grid
    this.state.foods.forEach((food, foodIndex) => {
      const cell = getGridCell(food.position.x, food.position.y, this.cellSize, this.worldWidth, this.worldHeight);
      const cellKey = `${cell.row},${cell.col}`;
      
      if (!this.spatialGrid.has(cellKey)) {
        this.spatialGrid.set(cellKey, []);
      }
      
      this.spatialGrid.get(cellKey)!.push({ type: 'specialFood', index: foodIndex });
    });
  }
  
  private checkCollisions(): void {
    // First update the spatial grid
    this.updateSpatialGrid();
    
    // Check snake-food collisions more efficiently
    this.state.snakes.forEach((snake, snakeIndex) => {
      if (!snake.alive) return;
      
      const head = snake.segments[0];
      const headCell = getGridCell(head.x, head.y, this.cellSize, this.worldWidth, this.worldHeight);
      const cellKey = `${headCell.row},${headCell.col}`;
      
      // Check for collisions in the current cell and adjacent cells
      for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
        for (let colOffset = -1; colOffset <= 1; colOffset++) {
          const checkKey = `${headCell.row + rowOffset},${headCell.col + colOffset}`;
          const cellContents = this.spatialGrid.get(checkKey);
          
          if (!cellContents) continue;
          
          // Check food collisions
          cellContents.forEach(item => {
            if (item.type === 'food') {
              const food = this.state.foods[item.index];
              if (food && distance(head, food.position) < 20) {
                this.handleFoodCollision(snake, item.index);
              }
            } else if (item.type === 'specialFood') {
              const specialFood = this.state.foods[item.index];
              if (specialFood && distance(head, specialFood.position) < 20) {
                this.handleSpecialFoodCollision(snake, item.index);
              }
            }
          });
        }
      }
      
      // Check snake-snake collisions
      for (let otherSnakeIndex = 0; otherSnakeIndex < this.state.snakes.length; otherSnakeIndex++) {
        if (otherSnakeIndex === snakeIndex) continue;
        
        const otherSnake = this.state.snakes[otherSnakeIndex];
        if (!otherSnake.alive) continue;
        
        // Check for collisions with other snakes' segments
        // Start from index 1 to skip its own head
        for (let j = 0; j < otherSnake.segments.length; j++) {
          const segment = otherSnake.segments[j];
          
          if (distance(head, segment) < 20) {
            // Check size advantage for killing other snakes - only if head-to-head
            if (j === 0 && snake.segments.length > otherSnake.segments.length + 2) {
              // This snake is larger and gets a kill
              this.killSnake(snake.id, otherSnake.id);
              
              // Award points for kill
              snake.score += Math.floor(otherSnake.score * 0.5);
              snake.kills = (snake.kills || 0) + 1;
              
              // Emit event for kill
              this.emitEvent('playerKill', {
                killerId: snake.id,
                killerName: snake.name,
                victimId: otherSnake.id,
                victimName: otherSnake.name,
                score: snake.score
              });
              
              continue;
            }
            
            // Handle head-to-head collision where other snake is larger
            if (j === 0 && otherSnake.segments.length > snake.segments.length + 2) {
              this.killSnake(snake.id, otherSnake.id);
              
              // Award points to the other snake
              otherSnake.score += Math.floor(snake.score * 0.5);
              otherSnake.kills = (otherSnake.kills || 0) + 1;
              
              // Emit event for kill
              this.emitEvent('playerKill', {
                killerId: otherSnake.id,
                killerName: otherSnake.name,
                victimId: snake.id,
                victimName: snake.name,
                score: otherSnake.score
              });
              
              return; // This snake is dead, no need to check further
            }
            
            // Normal collision (not head-to-head or no size advantage)
            if (j > 0 || otherSnake.segments.length <= snake.segments.length + 2) {
              this.killSnake(snake.id, otherSnake.id);
              
              // Award some points to the other snake for the collision
              otherSnake.score += Math.floor(snake.score * 0.2);
              otherSnake.kills = (otherSnake.kills || 0) + 1;
              
              // Emit event for kill
              this.emitEvent('playerKill', {
                killerId: otherSnake.id,
                killerName: otherSnake.name,
                victimId: snake.id,
                victimName: snake.name,
                score: otherSnake.score
              });
              
              return; // This snake is dead, no need to check further
            }
          }
        }
      }
      
      // Check self collision (only if snake has more than 4 segments)
      if (snake.segments.length > 4) {
        for (let j = 3; j < snake.segments.length; j++) {
          const segment = snake.segments[j];
          if (distance(head, segment) < 15) {
            this.killSnake(snake.id);
            return; // No need to check further, this snake is dead
          }
        }
      }
      
      // Check world boundary collision
      if (head.x < 0 || head.x >= this.worldWidth || head.y < 0 || head.y >= this.worldHeight) {
        this.killSnake(snake.id, null, 'border');
        return; // No need to check further
      }
    });
  }
  
  // Update the leaderboard
  private updateLeaderboard(): void {
    const leaderboard = this.state.snakes
      .map(snake => ({
        id: snake.id,
        name: snake.name,
        score: snake.score,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Top 10
    
    this.state.leaderboard = leaderboard;
  }
  
  // Get the current game state
  public getState(): GameState {
    return this.state;
  }

  // Get a player's rank in the game
  public getPlayerRank(playerId: string): number {
    const state = this.getState();
    
    // Sort snakes by score
    const sortedSnakes = [...state.snakes].sort((a, b) => b.score - a.score);
    
    // Find the player's position (0-based)
    const playerIndex = sortedSnakes.findIndex(snake => snake.id === playerId);
    
    // Return 1-based position, or 0 if not found
    return playerIndex >= 0 ? playerIndex + 1 : 0;
  }

  // Add methods for handling food collisions
  private handleFoodCollision(snake: Snake, foodIndex: number): void {
    const food = this.state.foods[foodIndex];
    if (!food) return;
    
    // Snake eats food
    snake.score += food.value;
    
    // Add new segments to the snake (growth)
    const tail = snake.segments[snake.segments.length - 1];
    
    // Growth proportional to food value
    for (let i = 0; i < food.value; i++) {
      snake.segments.push({ ...tail });
    }
    
    // Regular food increases boost meter by a tiny amount (5%)
    snake.boostMeter = Math.min(100, snake.boostMeter + 5);
    this.emitEvent('foodCollect', { 
      playerId: snake.id, 
      foodValue: food.value,
      boostMeter: snake.boostMeter
    });
    
    // Remove the food
    this.state.foods = this.state.foods.filter((_, index) => index !== foodIndex);
  }
  
  private handleSpecialFoodCollision(snake: Snake, foodIndex: number): void {
    const food = this.state.foods[foodIndex];
    if (!food || food.value <= 2) return; // Only special food has value > 2
    
    // Snake eats special food
    snake.score += food.value;
    
    // Add new segments to the snake (growth)
    const tail = snake.segments[snake.segments.length - 1];
    
    // Growth proportional to food value
    for (let i = 0; i < food.value; i++) {
      snake.segments.push({ ...tail });
    }
    
    // Special food increases boost meter by 25%
    snake.boostMeter = Math.min(100, snake.boostMeter + 25);
    this.emitEvent('specialFoodCollect', { 
      playerId: snake.id, 
      foodValue: food.value,
      boostMeter: snake.boostMeter
    });
    
    // Remove the food
    this.state.foods = this.state.foods.filter((_, index) => index !== foodIndex);
  }
  
  // Fix the killSnake method to handle the cause parameter
  private killSnake(snakeId: string, killedById: string | null = null, cause: string = ''): void {
    const snake = this.state.snakes.find(s => s.id === snakeId);
    if (!snake || !snake.alive) return;
    
    // Drop food from the dying snake
    this.dropFoodFromSnake(snake);
    
    // Mark the snake as dead
    snake.alive = false;
    
    // Calculate play time in seconds - use snake.startTime if available
    const startTime = (snake as any).createdAt || (snake as any).startTime || Date.now();
    const playTimeSeconds = Math.floor((Date.now() - startTime) / 1000);
    
    // Emit appropriate death event
    if (cause === 'border') {
      this.emitEvent('playerDeathBorder', { 
        playerId: snakeId,
        position: this.getPlayerRank(snakeId),
        score: snake.score,
        playTime: playTimeSeconds
      });
    } else {
      this.emitEvent('playerDeath', { 
        playerId: snakeId, 
        killedBy: killedById,
        position: this.getPlayerRank(snakeId),
        score: snake.score,
        playTime: playTimeSeconds
      });
    }
  }
} 